import { Router } from "express";
import QRCode from "qrcode";
import { prisma } from "../prisma";
import { requireAdmin, AuthedRequest } from "../auth";

export const adminRouter = Router();

// All admin endpoints require an authenticated admin account.
adminRouter.use(requireAdmin);

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 7)
  );
}

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const DEFAULT_FEES: Record<string, number> = {
  SANTE: 0,
  FUNERAILLES: 0,
  PROJET_COMMUNAUTAIRE: 2.5,
  EDUCATION: 1.5,
  ENTREPRISE: 4,
  TONTINE: 1,
};

// Overview stats
adminRouter.get("/stats", async (_req, res) => {
  const [campaigns, users, partners, contributions, pendingMod, openReports, pendingWithdrawals, pendingPartners] =
    await Promise.all([
      prisma.campaign.count(),
      prisma.user.count(),
      prisma.partner.count(),
      prisma.contribution.findMany({ where: { status: "CONFIRMED" }, select: { amount: true } }),
      prisma.campaign.count({ where: { moderationStatus: "PENDING" } }),
      prisma.report.count({ where: { status: "OPEN" } }),
      prisma.withdrawal.count({ where: { status: "PENDING" } }),
      prisma.partner.count({ where: { status: "PENDING" } }),
    ]);
  const totalRaised = contributions.reduce((s, c) => s + c.amount, 0);
  res.json({
    campaigns,
    users,
    partners,
    totalRaised,
    contributions: contributions.length,
    pendingModeration: pendingMod,
    openReports,
    pendingWithdrawals,
    pendingPartners,
  });
});

// Notifications: actionable items for the admin.
adminRouter.get("/notifications", async (_req, res) => {
  const [pendingMod, openReports, pendingWithdrawals, pendingPartners] = await Promise.all([
    prisma.campaign.count({ where: { moderationStatus: "PENDING" } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.withdrawal.count({ where: { status: "PENDING" } }),
    prisma.partner.count({ where: { status: "PENDING" } }),
  ]);
  const items: { type: string; label: string; count: number }[] = [];
  if (pendingMod) items.push({ type: "moderation", label: "campagne(s) à modérer", count: pendingMod });
  if (openReports) items.push({ type: "reports", label: "signalement(s) ouvert(s)", count: openReports });
  if (pendingWithdrawals) items.push({ type: "withdrawals", label: "retrait(s) à valider", count: pendingWithdrawals });
  if (pendingPartners) items.push({ type: "partners", label: "partenaire(s) à valider", count: pendingPartners });
  res.json({ total: items.reduce((s, i) => s + i.count, 0), items });
});

// Daily confirmed collection totals (last 30 days) for the evolution chart.
adminRouter.get("/timeseries", async (_req, res) => {
  const since = new Date(Date.now() - 30 * 86400000);
  const rows = await prisma.contribution.findMany({
    where: { status: "CONFIRMED", createdAt: { gte: since } },
    select: { amount: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const d = r.createdAt.toISOString().slice(0, 10);
    byDay.set(d, (byDay.get(d) || 0) + r.amount);
  }
  res.json(Array.from(byDay.entries()).map(([day, amount]) => ({ day, amount })));
});

// ── Withdrawals management ──
adminRouter.get("/withdrawals", async (_req, res) => {
  const rows = await prisma.withdrawal.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true, withdrawPhone: true } } },
  });
  res.json(rows);
});

adminRouter.post("/withdrawals/:id/status", async (req, res) => {
  const { status } = req.body as { status: string };
  if (!["PENDING", "APPROVED", "REJECTED", "PAID"].includes(status)) {
    return res.status(400).json({ error: "Statut invalide" });
  }
  const w = await prisma.withdrawal.update({ where: { id: req.params.id }, data: { status } });
  res.json(w);
});

// All campaigns with moderation + report counts
adminRouter.get("/campaigns", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const campaigns = await prisma.campaign.findMany({
    where: status ? { moderationStatus: status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      organizer: { select: { name: true, email: true, kycStatus: true } },
      contributions: { where: { status: "CONFIRMED" }, select: { amount: true } },
      reports: { where: { status: "OPEN" }, select: { id: true } },
    },
  });
  res.json(
    campaigns.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      category: c.category,
      visibility: c.visibility,
      moderationStatus: c.moderationStatus,
      targetAmount: c.targetAmount,
      raised: c.contributions.reduce((s, x) => s + x.amount, 0),
      organizer: c.organizer,
      openReports: c.reports.length,
      createdAt: c.createdAt,
    }))
  );
});

// Delete a campaign and its dependent rows (contributions, reports).
adminRouter.delete("/campaigns/:id", async (req, res) => {
  const { id } = req.params;
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) return res.status(404).json({ error: "Campagne introuvable" });
  await prisma.report.deleteMany({ where: { campaignId: id } });
  await prisma.contribution.deleteMany({ where: { campaignId: id } });
  await prisma.campaign.delete({ where: { id } });
  res.json({ deleted: true });
});

// Admin creates a campaign directly (auto-approved).
adminRouter.post("/campaigns", async (req: AuthedRequest, res) => {
  const { title, description, category, targetAmount, deadline, beneficiary, visibility, coverImage } = req.body;
  if (!title || !description || !category || !targetAmount || !beneficiary) {
    return res.status(400).json({ error: "Champs requis manquants" });
  }
  const slug = slugify(title);
  const shareUrl = `${process.env.APP_PUBLIC_URL || "http://localhost:4000"}/c/${slug}`;
  const qrCodeDataUrl = await QRCode.toDataURL(shareUrl, { color: { dark: "#654DDF", light: "#00000000" } });
  const campaign = await prisma.campaign.create({
    data: {
      slug,
      title,
      description,
      category,
      targetAmount: Number(targetAmount),
      deadline: deadline ? new Date(deadline) : null,
      coverImage: coverImage || null,
      beneficiary,
      visibility: visibility === "PRIVEE" ? "PRIVEE" : "PUBLIQUE",
      qrCodeDataUrl,
      organizerId: req.userId || null,
      moderationStatus: "APPROVED",
    },
  });
  res.status(201).json(campaign);
});

// Export all contributions as CSV.
adminRouter.get("/export/contributions.csv", async (_req, res) => {
  const rows = await prisma.contribution.findMany({
    include: { campaign: { select: { title: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });
  const header = "date,campagne,slug,contributeur,anonyme,montant,devise,canal,statut,telephone,message";
  const lines = rows.map((r) =>
    [
      r.createdAt.toISOString(),
      csvEscape(r.campaign.title),
      r.campaign.slug,
      csvEscape(r.isAnonymous ? "Anonyme" : r.contributorName || ""),
      r.isAnonymous,
      r.amount,
      "XAF",
      r.channel,
      r.status,
      r.phoneNumber || "",
      csvEscape(r.message || ""),
    ].join(",")
  );
  const csv = [header, ...lines].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=contributions.csv");
  res.send("﻿" + csv); // BOM for Excel UTF-8
});

// ── Users management ──
adminRouter.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { campaigns: true } } },
  });
  res.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      kycStatus: u.kycStatus,
      isAdmin: u.isAdmin,
      campaigns: u._count.campaigns,
      createdAt: u.createdAt,
    }))
  );
});

adminRouter.post("/users/:id/admin", async (req, res) => {
  const { isAdmin } = req.body as { isAdmin: boolean };
  const u = await prisma.user.update({ where: { id: req.params.id }, data: { isAdmin: Boolean(isAdmin) } });
  res.json({ id: u.id, isAdmin: u.isAdmin });
});

adminRouter.delete("/users/:id", async (req: AuthedRequest, res) => {
  if (req.params.id === req.userId) {
    return res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte." });
  }
  await prisma.campaign.updateMany({ where: { organizerId: req.params.id }, data: { organizerId: null } });
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ deleted: true });
});

// Edit / update a campaign's editable fields.
adminRouter.put("/campaigns/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description, category, targetAmount, deadline, beneficiary, visibility, coverImage } = req.body;
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) return res.status(404).json({ error: "Campagne introuvable" });

  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(targetAmount !== undefined ? { targetAmount: Number(targetAmount) } : {}),
      ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
      ...(beneficiary !== undefined ? { beneficiary } : {}),
      ...(visibility !== undefined ? { visibility: visibility === "PRIVEE" ? "PRIVEE" : "PUBLIQUE" } : {}),
      ...(coverImage !== undefined ? { coverImage: coverImage || null } : {}),
    },
  });
  res.json(updated);
});

// Moderate a campaign
adminRouter.post("/campaigns/:id/moderate", async (req, res) => {
  const { status } = req.body as { status: string };
  if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
    return res.status(400).json({ error: "Statut invalide" });
  }
  const c = await prisma.campaign.update({ where: { id: req.params.id }, data: { moderationStatus: status } });
  res.json({ id: c.id, moderationStatus: c.moderationStatus });
});

// Partners
adminRouter.get("/partners", async (_req, res) => {
  const partners = await prisma.partner.findMany({
    orderBy: { createdAt: "desc" },
    include: { apiKeys: { select: { id: true, env: true, revoked: true } } },
  });
  res.json(partners);
});

adminRouter.post("/partners/:id/status", async (req, res) => {
  const { status } = req.body as { status: string };
  if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
    return res.status(400).json({ error: "Statut invalide" });
  }
  const p = await prisma.partner.update({ where: { id: req.params.id }, data: { status } });
  res.json(p);
});

// Reports
adminRouter.get("/reports", async (_req, res) => {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    include: { campaign: { select: { title: true, slug: true } } },
  });
  res.json(reports);
});

adminRouter.post("/reports/:id/status", async (req, res) => {
  const { status } = req.body as { status: string };
  if (!["OPEN", "RESOLVED", "DISMISSED"].includes(status)) {
    return res.status(400).json({ error: "Statut invalide" });
  }
  const r = await prisma.report.update({ where: { id: req.params.id }, data: { status } });
  res.json(r);
});

// Platform fees per category
adminRouter.get("/fees", async (_req, res) => {
  const setting = await prisma.platformSetting.findUnique({ where: { key: "fees" } });
  res.json(setting ? JSON.parse(setting.value) : DEFAULT_FEES);
});

adminRouter.put("/fees", async (req, res) => {
  const fees = req.body as Record<string, number>;
  const value = JSON.stringify(fees);
  await prisma.platformSetting.upsert({
    where: { key: "fees" },
    update: { value },
    create: { key: "fees", value },
  });
  res.json(fees);
});
