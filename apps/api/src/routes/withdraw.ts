import { Router } from "express";
import { prisma } from "../prisma";
import { issueOtp, consumeOtp, requireAuth, AuthedRequest, devCode } from "../auth";
import { sendOtpEmail } from "../mailer";

export const withdrawRouter = Router();

// Step 1: request a withdrawal — sends a distinct OTP (double validation).
withdrawRouter.post("/request", requireAuth, async (req: AuthedRequest, res) => {
  const { amount, destination } = req.body;
  if (!amount || Number(amount) <= 0) return res.status(400).json({ error: "Montant invalide" });

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

  const code = await issueOtp(user.email, "withdraw", { amount: Number(amount), destination: destination || "wallet" });
  void sendOtpEmail(user.email, code, "withdraw"); // fire-and-forget (non-blocking)
  res.json({ otpSent: true, needsConfirmation: true, devCode: devCode(code) });
});

// Step 2: confirm with the distinct OTP.
withdrawRouter.post("/confirm", requireAuth, async (req: AuthedRequest, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Code requis" });
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

  let meta: any;
  try {
    meta = await consumeOtp(user.email, "withdraw", String(code));
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }

  // Persist the request so an admin can validate it from the back office.
  await prisma.withdrawal.create({
    data: {
      userId: user.id,
      amount: Number(meta?.amount) || 0,
      destination: meta?.destination || "wallet",
      status: "PENDING",
    },
  });

  res.json({
    status: "PENDING",
    amount: meta?.amount,
    destination: meta?.destination,
    message: "Demande de retrait confirmée. En attente de validation (sous 24h).",
  });
});
