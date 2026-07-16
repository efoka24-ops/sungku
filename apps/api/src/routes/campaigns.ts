import { Router } from "express";
import QRCode from "qrcode";
import { prisma } from "../prisma";
import { requireAuth, AuthedRequest } from "../auth";

export const campaignsRouter = Router();

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

campaignsRouter.get("/", async (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const q = typeof req.query.q === "string" ? req.query.q : undefined;

  const campaigns = await prisma.campaign.findMany({
    where: {
      visibility: "PUBLIQUE",
      ...(category ? { category: category as any } : {}),
      ...(q ? { title: { contains: q } } : {}),
    },
    include: { contributions: { where: { status: "CONFIRMED" } } },
    orderBy: { createdAt: "desc" },
  });

  res.json(
    campaigns.map((c) => ({
      ...c,
      collectedAmount: c.contributions.reduce((sum, ct) => sum + ct.amount, 0),
      contributorCount: c.contributions.length,
    }))
  );
});

campaignsRouter.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const { title, description, category, targetAmount, deadline, coverImage, beneficiary, visibility, isTontine } =
    req.body;

  if (!title || !description || !category || !targetAmount || !beneficiary) {
    return res.status(400).json({ error: "Champs requis manquants" });
  }

  const slug = slugify(title);
  const shareUrl = `http://localhost:3000/c/${slug}`;
  const qrCodeDataUrl = await QRCode.toDataURL(shareUrl, {
    color: { dark: "#654DDF", light: "#00000000" },
  });

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
      isTontine: Boolean(isTontine),
      qrCodeDataUrl,
      organizerId: req.userId || null,
    },
  });

  res.status(201).json({ ...campaign, shareUrl });
});

campaignsRouter.get("/:id", async (req, res) => {
  const { id } = req.params;
  const campaign = await prisma.campaign.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: { contributions: { orderBy: { createdAt: "desc" } } },
  });

  if (!campaign) return res.status(404).json({ error: "Campagne introuvable" });

  const confirmed = campaign.contributions.filter((c) => c.status === "CONFIRMED");
  res.json({
    ...campaign,
    collectedAmount: confirmed.reduce((sum, c) => sum + c.amount, 0),
    contributorCount: confirmed.length,
  });
});
