import express from "express";
import cors from "cors";
import { campaignsRouter } from "./routes/campaigns";
import { contributionsRouter } from "./routes/contributions";
import { paymentsRouter } from "./routes/payments";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/campaigns", campaignsRouter);
app.use("/campaigns", contributionsRouter);
app.use("/payments", paymentsRouter);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Sungku API listening on http://localhost:${port}`);
});
