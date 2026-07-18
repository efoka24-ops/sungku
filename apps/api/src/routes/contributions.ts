import { Router } from "express";
import { prisma } from "../prisma";
import { cashout, camooConfigured, normalizeStatus, verify } from "../camoo";
import { notifyContribution } from "../notifications";

// Actively reconcile PENDING contributions with Camoo (in case the webhook never
// fired). Confirms/fails them based on Camoo's /verify response.
async function reconcilePending(campaignId: string) {
  if (!camooConfigured()) return;
  const pend = await prisma.contribution.findMany({
    where: { campaignId, status: "PENDING", providerTxId: { not: null } },
  });
  for (const c of pend) {
    try {
      const r: any = await verify(c.providerTxId!);
      const st = normalizeStatus(r?.verify?.status || "");
      if (st !== "PENDING") {
        await prisma.contribution.update({ where: { id: c.id }, data: { status: st } });
        if (st === "CONFIRMED") await notifyContribution(c.id);
      }
    } catch {
      /* leave pending; will retry on next poll */
    }
  }
}

export const contributionsRouter = Router();

const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || "http://localhost:4000";
const DEFAULT_CURRENCY = process.env.CAMOO_CURRENCY || "XAF";

const MOBILE_CHANNELS = ["ORANGE_MONEY", "MTN_MOMO"];

// Fallback for local dev when Camoo credentials are absent: auto-confirm after a delay.
function simulateProviderConfirmation(contributionId: string) {
  setTimeout(async () => {
    await prisma.contribution.update({
      where: { id: contributionId },
      data: { status: "CONFIRMED" },
    });
    await notifyContribution(contributionId);
  }, 2500);
}

contributionsRouter.post("/:campaignId/contributions", async (req, res) => {
  const { campaignId } = req.params;
  const { amount, channel, contributorName, isAnonymous, message, phoneNumber } = req.body;

  if (!amount || !channel) {
    return res.status(400).json({ error: "Montant et canal de paiement requis" });
  }

  const campaign = await prisma.campaign.findFirst({
    where: { OR: [{ id: campaignId }, { slug: campaignId }] },
  });
  if (!campaign) return res.status(404).json({ error: "Campagne introuvable" });

  const contribution = await prisma.contribution.create({
    data: {
      campaignId: campaign.id,
      amount: Number(amount),
      channel,
      contributorName: isAnonymous ? null : contributorName || null,
      isAnonymous: Boolean(isAnonymous),
      message: message || null,
      phoneNumber: phoneNumber || null,
      status: "PENDING",
    },
  });

  // Real payment collection via Camoo for mobile-money channels when configured.
  if (camooConfigured() && MOBILE_CHANNELS.includes(channel)) {
    if (!phoneNumber) {
      await prisma.contribution.update({ where: { id: contribution.id }, data: { status: "FAILED" } });
      return res.status(400).json({ error: "Numéro de téléphone requis pour le paiement mobile money" });
    }
    try {
      const result = await cashout({
        amount: Number(amount),
        phone_number: phoneNumber,
        currency: DEFAULT_CURRENCY,
        notification_url: `${APP_PUBLIC_URL}/payments/webhooks/camoo`,
        external_reference: contribution.id,
        shopping_cart_details: {
          campaign_id: campaign.id,
          campaign_title: campaign.title,
          description: `Contribution à ${campaign.title}`,
        },
      });
      const updated = await prisma.contribution.update({
        where: { id: contribution.id },
        data: {
          providerTxId: result.cashOut?.id || null,
          status: normalizeStatus(result.cashOut?.status || "PENDING"),
        },
      });
      if (updated.status === "CONFIRMED") await notifyContribution(updated.id);
      return res.status(201).json(updated);
    } catch (e: any) {
      await prisma.contribution.update({ where: { id: contribution.id }, data: { status: "FAILED" } });
      return res.status(502).json({ error: "Échec du paiement", detail: e.message });
    }
  }

  // No Camoo credentials (or non-mobile channel): simulate confirmation locally.
  simulateProviderConfirmation(contribution.id);
  res.status(201).json(contribution);
});

contributionsRouter.get("/:campaignId/contributions", async (req, res) => {
  const { campaignId } = req.params;
  const campaign = await prisma.campaign.findFirst({
    where: { OR: [{ id: campaignId }, { slug: campaignId }] },
  });
  if (!campaign) return res.status(404).json({ error: "Campagne introuvable" });

  await reconcilePending(campaign.id); // confirm any paid-but-unnotified contributions

  const contributions = await prisma.contribution.findMany({
    where: { campaignId: campaign.id, status: "CONFIRMED" },
    orderBy: { createdAt: "desc" },
  });
  res.json(contributions);
});

contributionsRouter.get("/:campaignId/contributions/:contributionId", async (req, res) => {
  const { contributionId } = req.params;
  const contribution = await prisma.contribution.findUnique({ where: { id: contributionId } });
  if (!contribution) return res.status(404).json({ error: "Contribution introuvable" });
  res.json(contribution);
});
