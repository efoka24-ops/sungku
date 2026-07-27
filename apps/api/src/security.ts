import cors from "cors";
import rateLimit from "express-rate-limit";

// Allowed browser origins (comma-separated). Server-to-server calls (no Origin,
// e.g. Camoo webhooks, health checks, partner API) are always allowed.
const ALLOWED = (process.env.CORS_ORIGINS || "https://sungku-two.vercel.app,http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function corsMiddleware() {
  return cors({
    origin(origin, cb) {
      if (!origin || ALLOWED.includes(origin)) return cb(null, true);
      cb(new Error("Origin non autorisée par CORS"));
    },
    credentials: false,
  });
}

// Generous global limiter (per IP) to absorb the front-end polling but stop floods.
export const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.RATE_LIMIT_GLOBAL) || 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de requêtes, réessayez dans un instant." },
});

// Strict limiter for auth / OTP endpoints (anti brute-force).
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: Number(process.env.RATE_LIMIT_AUTH) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives. Réessayez plus tard." },
});
