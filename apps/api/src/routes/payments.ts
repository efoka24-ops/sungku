import { Router } from "express";
import { prisma } from "../prisma";
import { verifyWebhookSignature, normalizeStatus, account, camooConfigured } from "../camoo";
import { notifyContribution } from "../notifications";

export const paymentsRouter = Router();

/**
 * Camoo payment notification (signed). Delivered as HTTP GET with params:
 * payment_id, status, status_time, trx (external_reference), sig.
 * Must verify the HMAC-SHA256 signature, be idempotent, and return 200.
 */
paymentsRouter.get("/webhooks/camoo", async (req, res) => {
  const query = req.query as Record<string, string>;

  if (!verifyWebhookSignature(query)) {
    return res.status(401).json({ error: "Signature invalide" });
  }

  const externalReference = query.trx; // = contribution.id
  const paymentId = query.payment_id; // = Camoo cashOut.id
  const status = normalizeStatus(query.status || "");

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

// Merchant account balance passthrough (for the organizer dashboard / withdrawals).
paymentsRouter.get("/account", async (_req, res) => {
  if (!camooConfigured()) {
    return res.status(503).json({ error: "Camoo non configuré (CAMOO_API_KEY/SECRET manquants)" });
  }
  try {
    res.json(await account());
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});
