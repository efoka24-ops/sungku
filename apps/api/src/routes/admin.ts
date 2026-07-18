import { Router } from "express";
import { prisma } from "../prisma";
import { requireAdmin } from "../auth";

export const adminRouter = Router();

// All admin endpoints require an authenticated admin account.
adminRouter.use(requireAdmin);

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
  const [campaigns, users, partners, contributions, pendingMod, openReports] = await Promise.all([
    prisma.campaign.count(),
    prisma.user.count(),
    prisma.partner.count(),
    prisma.contribution.findMany({ where: { status: "CONFIRMED" }, select: { amount: true } }),
    prisma.campaign.count({ where: { moderationStatus: "PENDING" } }),
    prisma.report.count({ where: { status: "OPEN" } }),
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
  });
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
