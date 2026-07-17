import "dotenv/config";
import express from "express";
import cors from "cors";
import { campaignsRouter } from "./routes/campaigns";
import { contributionsRouter } from "./routes/contributions";
import { paymentsRouter } from "./routes/payments";
import { authRouter } from "./routes/auth";
import { withdrawRouter } from "./routes/withdraw";
import { partnersRouter } from "./routes/partners";
import { adminRouter } from "./routes/admin";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/campaigns", campaignsRouter);
app.use("/campaigns", contributionsRouter);
app.use("/payments", paymentsRouter);
app.use("/auth", authRouter);
app.use("/withdraw", withdrawRouter);
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

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Sungku API listening on http://localhost:${port}`);
});
