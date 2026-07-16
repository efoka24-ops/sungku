import { Router } from "express";
import { prisma } from "../prisma";
import { newApiKeyPair, sanitizeScopes, requireScope, PartnerRequest } from "../auth";

export const partnersRouter = Router();

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "dev-admin-token";

// Register a partner (role 4) — starts PENDING.
partnersRouter.post("/register", async (req, res) => {
  const { orgName, contactName, contactEmail } = req.body;
  if (!orgName || !contactName || !contactEmail) {
    return res.status(400).json({ error: "Organisation, contact et e-mail requis" });
  }
  const email = String(contactEmail).toLowerCase();
  const existing = await prisma.partner.findUnique({ where: { contactEmail: email } });
  if (existing) return res.status(409).json({ error: "Un partenaire existe déjà pour cet e-mail" });

  const partner = await prisma.partner.create({
    data: { orgName, contactName, contactEmail: email, status: "PENDING" },
  });
  res.status(201).json(partner);
});

partnersRouter.get("/:id", async (req, res) => {
  const partner = await prisma.partner.findUnique({
    where: { id: req.params.id },
    include: { apiKeys: { select: { id: true, keyId: true, env: true, scopes: true, revoked: true, createdAt: true } } },
  });
  if (!partner) return res.status(404).json({ error: "Partenaire introuvable" });
  res.json(partner);
});

// Back-office approval (admin only).
partnersRouter.post("/:id/approve", async (req, res) => {
  if (req.header("X-Admin-Token") !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "Accès back-office requis" });
  }
  const partner = await prisma.partner.update({ where: { id: req.params.id }, data: { status: "APPROVED" } });
  res.json(partner);
});

// Generate an API key. Sandbox available once registered; production requires APPROVED.
partnersRouter.post("/:id/api-keys", async (req, res) => {
  const { env, scopes } = req.body as { env: "sandbox" | "production"; scopes: string[] };
  const partner = await prisma.partner.findUnique({ where: { id: req.params.id } });
  if (!partner) return res.status(404).json({ error: "Partenaire introuvable" });

  const environment = env === "production" ? "production" : "sandbox";
  if (environment === "production" && partner.status !== "APPROVED") {
    return res.status(403).json({ error: "Clés de production disponibles uniquement après validation du partenariat" });
  }

  const { keyId, secret, secretHash } = newApiKeyPair(environment);
  const scopeCsv = sanitizeScopes(Array.isArray(scopes) ? scopes : ["read"]);
  const key = await prisma.apiKey.create({
    data: { partnerId: partner.id, env: environment, keyId, secretHash, scopes: scopeCsv || "read" },
  });

  // Secret is returned only once, at creation.
  res.status(201).json({ id: key.id, keyId, secret, env: environment, scopes: key.scopes.split(",") });
});

// Revoke a key.
partnersRouter.post("/:id/api-keys/:keyId/revoke", async (req, res) => {
  await prisma.apiKey.updateMany({ where: { keyId: req.params.keyId, partnerId: req.params.id }, data: { revoked: true } });
  res.json({ revoked: true });
});

// Example scoped partner endpoint: create a campaign via API key with the right scope.
partnersRouter.post("/api/campaigns", requireScope("campaigns:create"), async (req: PartnerRequest, res) => {
  res.json({
    ok: true,
    partnerId: req.apiKey?.partnerId,
    env: req.apiKey?.env,
    message: "Clé et scope valides — la campagne serait créée ici (démo).",
  });
});
