import { Router } from "express";
import { prisma } from "../prisma";
import { verifyWebhookSignature, normalizeStatus as camooNormalizeStatus, account, camooConfigured } from "../camoo";
import { pawapayConfigured, normalizeStatus as pawapayNormalizeStatus, getWalletBalances } from "../pawapay";
import {
  gatewayConfigured,
  getBalances,
  normalizeStatus as gatewayNormalizeStatus,
  verifyWebhook as verifyGatewayWebhook,
} from "../gateway";
import { notifyContribution } from "../notifications";

export const paymentsRouter = Router();

/**
 * PawaPay deposit callback (POST). PawaPay sends a JSON body with the final status.
 * Configure this URL in the PawaPay Dashboard: POST /payments/webhooks/pawapay
 */
paymentsRouter.post("/webhooks/pawapay", async (req, res) => {
  const body = req.body;
  const depositId = body?.depositId;
  const status = pawapayNormalizeStatus(body?.status || "");

  if (!depositId) return res.status(200).json({ received: true, matched: false });

  // depositId = contribution.id (we use it as the PawaPay depositId)
  const contribution = await prisma.contribution.findFirst({
    where: {
      OR: [
        { id: depositId },
        { providerTxId: depositId },
      ],
    },
  });

  if (!contribution) return res.status(200).json({ received: true, matched: false });

  if (contribution.status === "PENDING" && status !== "PENDING") {
    await prisma.contribution.update({
      where: { id: contribution.id },
      data: { status, providerTxId: contribution.providerTxId || depositId },
    });
    if (status === "CONFIRMED") await notifyContribution(contribution.id);
  }

  res.status(200).json({ received: true, matched: true });
});

/**
 * Webhook de la passerelle apisungku : statut final d'une contribution.
 *
 * A declarer comme URL de webhook du projet : POST /payments/webhooks/apisungku
 */
paymentsRouter.post("/webhooks/apisungku", async (req, res) => {
  const rawBody = (req as any).rawBody as string | undefined;

  // Non signe ou signature invalide : on refuse. Accepter un webhook non
  // verifie laisserait n'importe qui declarer une contribution payee.
  if (!rawBody || !verifyGatewayWebhook(rawBody, req.headers)) {
    return res.status(401).json({ error: "Signature invalide" });
  }

  const data = req.body?.data;
  // La reference est l'identifiant de contribution que nous avons emis.
  const reference = data?.reference as string | undefined;
  const status = gatewayNormalizeStatus(data?.status || "");

  if (!reference && !data?.id) {
    return res.status(200).json({ received: true, matched: false });
  }

  const contribution = await prisma.contribution.findFirst({
    where: {
      OR: [
        ...(reference ? [{ id: reference }] : []),
        ...(data?.id ? [{ providerTxId: data.id as string }] : []),
      ],
    },
  });

  if (!contribution) return res.status(200).json({ received: true, matched: false });

  // On n'avance que depuis PENDING : un webhook rejoue ou arrive dans le
  // desordre ne peut pas revenir sur un statut deja definitif.
  if (contribution.status === "PENDING" && status !== "PENDING") {
    await prisma.contribution.update({
      where: { id: contribution.id },
      data: { status, providerTxId: contribution.providerTxId || data?.id || null },
    });
    if (status === "CONFIRMED") await notifyContribution(contribution.id);
  }

  res.status(200).json({ received: true, matched: true });
});

/**
 * Camoo payment notification (signed) — kept for backward compatibility.
 */
paymentsRouter.get("/webhooks/camoo", async (req, res) => {
  const query = req.query as Record<string, string>;

  if (!verifyWebhookSignature(query)) {
    return res.status(401).json({ error: "Signature invalide" });
  }

  const externalReference = query.trx; // = contribution.id
  const paymentId = query.payment_id; // = Camoo cashOut.id
  const status = camooNormalizeStatus(query.status || "");

  // Locate the contribution by our external reference, else by provider tx id.
  const contribution = await prisma.contribution.findFirst({
    where: {
      OR: [
        ...(externalReference ? [{ id: externalReference }] : []),
        ...(paymentId ? [{ providerTxId: paymentId }] : []),
      ],
    },
  });

  // Always ack with 200 so Camoo stops retrying, even if unknown/duplicate (idempotent).
  if (!contribution) return res.status(200).json({ received: true, matched: false });

  // Only advance from PENDING; ignore duplicate terminal-state notifications.
  if (contribution.status === "PENDING" && status !== "PENDING") {
    await prisma.contribution.update({
      where: { id: contribution.id },
      data: { status, providerTxId: contribution.providerTxId || paymentId || null },
    });
    if (status === "CONFIRMED") await notifyContribution(contribution.id);
  }

  res.status(200).json({ received: true, matched: true });
});

// Merchant account balance passthrough.
paymentsRouter.get("/account", async (_req, res) => {
  // La passerelle d'abord, puis PawaPay en direct, puis Camoo.
  if (gatewayConfigured()) {
    try {
      return res.json(await getBalances());
    } catch (e: any) {
      return res.status(502).json({ error: e.message });
    }
  }
  if (pawapayConfigured()) {
    try {
      const balances = await getWalletBalances();
      return res.json(balances);
    } catch (e: any) {
      return res.status(502).json({ error: e.message });
    }
  }
  if (!camooConfigured()) {
    return res.status(503).json({ error: "Aucun fournisseur de paiement configuré" });
  }
  try {
    res.json(await account());
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});
