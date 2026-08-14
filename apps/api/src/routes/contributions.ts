import { Router } from "express";
import { prisma } from "../prisma";
import { initiateDeposit, pawapayConfigured, normalizeStatus, checkDepositStatus, resolveProvider, toMSISDN } from "../pawapay";
import {
  collect,
  gatewayConfigured,
  getTransaction,
  GatewayRejectedError,
  normalizeStatus as gatewayNormalizeStatus,
} from "../gateway";
import { notifyContribution } from "../notifications";

// Actively reconcile PENDING contributions with PawaPay (in case the callback never
// fired). Confirms/fails them based on PawaPay's check deposit status response.
async function reconcilePending(campaignId: string) {
  if (!gatewayConfigured() && !pawapayConfigured()) return;

  const pend = await prisma.contribution.findMany({
    where: { campaignId, status: "PENDING", providerTxId: { not: null } },
  });

  for (const c of pend) {
    try {
      // La passerelle est interrogee en priorite quand elle est configuree :
      // c'est elle qui a initie ces contributions.
      const st = gatewayConfigured()
        ? gatewayNormalizeStatus((await getTransaction(c.providerTxId!)).status)
        : normalizeStatus(((await checkDepositStatus(c.providerTxId!)) as any)?.status || "");

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

  // Encaissement via la passerelle apisungku, qui detient seule le token
  // operateur. Prioritaire sur l'appel direct a PawaPay, conserve en repli.
  if (gatewayConfigured() && MOBILE_CHANNELS.includes(channel)) {
    if (!phoneNumber) {
      await prisma.contribution.update({ where: { id: contribution.id }, data: { status: "FAILED" } });
      return res.status(400).json({ error: "Numéro de téléphone requis pour le paiement mobile money" });
    }
    try {
      const result = await collect({
        amount: Number(amount),
        currency: DEFAULT_CURRENCY,
        phoneNumber,
        // L'operateur est deduit du numero par la passerelle, sauf canal
        // explicite : la prediction resiste a la portabilite, pas le prefixe.
        provider: channel === "MTN_MOMO" ? "MTN_MOMO_CMR" : channel === "ORANGE_MONEY" ? "ORANGE_CMR" : undefined,
        reference: contribution.id,
        customerMessage: campaign.title.slice(0, 22),
        metadata: { campaignId: campaign.id, campaignTitle: campaign.title },
      });

      const updated = await prisma.contribution.update({
        where: { id: contribution.id },
        data: {
          providerTxId: result.id,
          // Le statut final arrive par webhook : le contributeur n'a pas
          // encore saisi son code PIN.
          status: gatewayNormalizeStatus(result.status),
        },
      });
      return res.status(201).json(updated);
    } catch (e: any) {
      if (e instanceof GatewayRejectedError) {
        // Refus explicite : l'echec est certain, aucun mouvement de fonds.
        await prisma.contribution.update({ where: { id: contribution.id }, data: { status: "FAILED" } });
        return res.status(400).json({ error: "Paiement rejeté", detail: e.message });
      }
      // Issue indeterminee : le paiement a pu partir. La contribution reste
      // PENDING et la reconciliation tranchera — la marquer FAILED ici
      // perdrait une contribution reellement payee.
      return res.status(202).json({
        ...contribution,
        message: "Paiement en cours de vérification.",
      });
    }
  }

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
