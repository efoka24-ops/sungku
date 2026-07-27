import "dotenv/config";
import express from "express";
import helmet from "helmet";
import { campaignsRouter } from "./routes/campaigns";
import { contributionsRouter } from "./routes/contributions";
import { paymentsRouter } from "./routes/payments";
import { authRouter } from "./routes/auth";
import { withdrawRouter } from "./routes/withdraw";
import { partnersRouter } from "./routes/partners";
import { adminRouter } from "./routes/admin";
import { corsMiddleware, globalLimiter, authLimiter } from "./security";

const app = express();

// Behind Railway's proxy: trust the first hop so rate-limiting uses the real client IP.
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Security headers (helmet) + strict CORS allowlist + JSON body size cap.
// crossOriginResourcePolicy: cross-origin so the browser can read the API from the web app.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(corsMiddleware());
app.use(express.json({ limit: "5mb" }));

// Health check is exempt from rate limiting (used by the platform).
app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use(globalLimiter);

app.use("/campaigns", campaignsRouter);
app.use("/campaigns", contributionsRouter);
app.use("/payments", paymentsRouter);
app.use("/auth", authLimiter, authRouter);
app.use("/withdraw", authLimiter, withdrawRouter);
app.use("/partners", partnersRouter);
app.use("/admin", adminRouter);

// Global error handler so a rejected async handler returns 500 instead of crashing.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled route error:", err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Erreur interne du serveur" });
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

// Bind to 0.0.0.0 and the platform-provided PORT (required by Railway/containers).
const port = Number(process.env.PORT) || 4000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Sungku API listening on 0.0.0.0:${port}`);
});
