import { Router } from "express";
import { prisma } from "../prisma";
import { initiateDeposit, pawapayConfigured, normalizeStatus, checkDepositStatus, resolveProvider, toMSISDN } from "../pawapay";
import { notifyContribution } from "../notifications";

// Actively reconcile PENDING contributions with PawaPay (in case the callback never
// fired). Confirms/fails them based on PawaPay's check deposit status response.
async function reconcilePending(campaignId: string) {
  if (!pawapayConfigured()) return;
  const pend = await prisma.contribution.findMany({
    where: { campaignId, status: "PENDING", providerTxId: { not: null } },
  });
  for (const c of pend) {
    try {
      const r: any = await checkDepositStatus(c.providerTxId!);
      const st = normalizeStatus(r?.status || "");
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

const DEFAULT_CURRENCY = process.env.PAWAPAY_CURRENCY || process.env.CAMOO_CURRENCY || "XAF";

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

  // Real payment collection via PawaPay for mobile-money channels when configured.
  if (pawapayConfigured() && MOBILE_CHANNELS.includes(channel)) {
    if (!phoneNumber) {
      await prisma.contribution.update({ where: { id: contribution.id }, data: { status: "FAILED" } });
      return res.status(400).json({ error: "Numéro de téléphone requis pour le paiement mobile money" });
    }
    try {
      const provider = resolveProvider(channel, phoneNumber);
      const result = await initiateDeposit({
        amount: Number(amount),
        currency: DEFAULT_CURRENCY,
        phoneNumber,
        provider,
        depositId: contribution.id, // use contribution ID as depositId for easy reconciliation
        metadata: {
          campaignId: campaign.id,
          campaignTitle: campaign.title,
        },
      });
      if (result.status === "REJECTED") {
        await prisma.contribution.update({ where: { id: contribution.id }, data: { status: "FAILED" } });
        return res.status(400).json({ error: "Paiement rejeté", detail: result.failureReason?.failureMessage });
      }
      const updated = await prisma.contribution.update({
        where: { id: contribution.id },
        data: {
          providerTxId: result.depositId,
          status: "PENDING", // PawaPay is async; final status arrives via callback
        },
      });
      return res.status(201).json(updated);
    } catch (e: any) {
      await prisma.contribution.update({ where: { id: contribution.id }, data: { status: "FAILED" } });
      return res.status(502).json({ error: "Échec du paiement", detail: e.message });
    }
  }

  // No PawaPay credentials (or non-mobile channel): simulate confirmation locally.
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
