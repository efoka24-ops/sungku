import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const OTP_TTL_MIN = Number(process.env.OTP_TTL_MINUTES) || 10;

export function generateOtp(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(`${code}:${JWT_SECRET}`).digest("hex");
}

// Create and persist an OTP for an email + purpose; returns the plaintext code.
export async function issueOtp(email: string, purpose: string, meta?: unknown): Promise<string> {
  const code = generateOtp();
  await prisma.otpToken.create({
    data: {
      email: email.toLowerCase(),
      codeHash: hashCode(code),
      purpose,
      meta: meta ? JSON.stringify(meta) : null,
      expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60_000),
    },
  });
  return code;
}

// Consume the most recent valid OTP for email+purpose. Returns its meta (parsed) or throws.
export async function consumeOtp(email: string, purpose: string, code: string): Promise<any> {
  const token = await prisma.otpToken.findFirst({
    where: { email: email.toLowerCase(), purpose, consumed: false },
    orderBy: { createdAt: "desc" },
  });
  if (!token) throw new Error("Aucun code en attente");
  if (token.expiresAt < new Date()) throw new Error("Code expiré");
  if (token.codeHash !== hashCode(code)) throw new Error("Code invalide");
  await prisma.otpToken.update({ where: { id: token.id }, data: { consumed: true } });
  return token.meta ? JSON.parse(token.meta) : null;
}

// Expose the OTP in the API response when:
//  - not in production (dev/tests), OR
//  - OTP_EXPOSE=true (production fallback when e-mail delivery is unreliable).
// SECURITY: with OTP_EXPOSE=true, anyone calling the API can read the code and log
// into any account. Use only as a temporary fallback; turn off once e-mail works.
export function devCode(code: string): string | undefined {
  const expose = process.env.NODE_ENV !== "production" || process.env.OTP_EXPOSE === "true";
  return expose ? code : undefined;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });
}

export interface AuthedRequest extends Request {
  userId?: string;
}

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Authentification requise" });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.isAdmin) return res.status(403).json({ error: "Accès back-office réservé aux administrateurs" });
    req.userId = user.id;
    next();
  } catch {
    return res.status(401).json({ error: "Session invalide ou expirée" });
  }
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Authentification requise" });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Session invalide ou expirée" });
  }
}

// ── Partner API key auth + scope enforcement ──────────────────────────────────

const VALID_SCOPES = ["read", "campaigns:create", "contributions:create", "withdraw"];

export function newApiKeyPair(env: "sandbox" | "production") {
  const keyId = `sk_${env}_${crypto.randomBytes(8).toString("hex")}`;
  const secret = crypto.randomBytes(24).toString("hex");
  return { keyId, secret, secretHash: hashCode(secret) };
}

export function sanitizeScopes(scopes: string[]): string {
  return scopes.filter((s) => VALID_SCOPES.includes(s)).join(",");
}

export interface PartnerRequest extends Request {
  apiKey?: { id: string; partnerId: string; env: string; scopes: string[] };
}

// Middleware factory: enforce X-Api-Key/X-Api-Secret and a required scope.
export function requireScope(scope: string) {
  return async (req: PartnerRequest, res: Response, next: NextFunction) => {
    const keyId = req.header("X-Api-Key") || "";
    const secret = req.header("X-Api-Secret") || "";
    if (!keyId || !secret) return res.status(401).json({ error: "Clés API requises (X-Api-Key/X-Api-Secret)" });

    const key = await prisma.apiKey.findUnique({ where: { keyId } });
    if (!key || key.revoked) return res.status(401).json({ error: "Clé API invalide ou révoquée" });
    if (key.secretHash !== hashCode(secret)) return res.status(401).json({ error: "Secret API invalide" });

    const scopes = key.scopes.split(",").filter(Boolean);
    if (!scopes.includes(scope)) {
      return res.status(403).json({ error: `Scope requis manquant : ${scope}`, granted: scopes });
    }
    req.apiKey = { id: key.id, partnerId: key.partnerId, env: key.env, scopes };
    next();
  };
}
