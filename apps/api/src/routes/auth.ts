import { Router } from "express";
import { prisma } from "../prisma";
import { issueOtp, consumeOtp, signToken, requireAuth, AuthedRequest, devCode } from "../auth";
import { sendOtpEmail } from "../mailer";

export const authRouter = Router();

// Organizer registration → creates (or reuses) user, sends email OTP.
authRouter.post("/register", async (req, res) => {
  const { name, email, phone } = req.body;
  if (!name || !email) return res.status(400).json({ error: "Nom et e-mail requis" });

  const normalized = String(email).toLowerCase();
  let user = await prisma.user.findUnique({ where: { email: normalized } });
  if (user && user.emailVerified) {
    return res.status(409).json({ error: "Un compte vérifié existe déjà pour cet e-mail. Connectez-vous." });
  }
  if (!user) {
    user = await prisma.user.create({
      data: { name, email: normalized, phone: phone || null, kycStatus: "LIGHT" },
    });
  }

  const code = await issueOtp(normalized, "register_verify");
  void sendOtpEmail(normalized, code, "register_verify"); // fire-and-forget (non-blocking)
  res.status(201).json({ email: normalized, otpSent: true, devCode: devCode(code) });
});

// Verify registration OTP → mark verified, return session token.
authRouter.post("/verify-otp", async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: "E-mail et code requis" });
  const normalized = String(email).toLowerCase();
  try {
    await consumeOtp(normalized, "register_verify", String(code));
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
  const user = await prisma.user.update({
    where: { email: normalized },
    data: { emailVerified: true },
  });
  res.json({ token: signToken(user.id), user: publicUser(user) });
});

// Login (new device) → send OTP.
authRouter.post("/login", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "E-mail requis" });
  const normalized = String(email).toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) return res.status(404).json({ error: "Aucun compte pour cet e-mail" });
  const code = await issueOtp(normalized, "login");
  void sendOtpEmail(normalized, code, "login"); // fire-and-forget (non-blocking)
  res.json({ email: normalized, otpSent: true, devCode: devCode(code) });
});

// Verify login OTP → session token.
authRouter.post("/login/verify", async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: "E-mail et code requis" });
  const normalized = String(email).toLowerCase();
  try {
    await consumeOtp(normalized, "login", String(code));
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
  const user = await prisma.user.update({
    where: { email: normalized },
    data: { emailVerified: true },
  });
  res.json({ token: signToken(user.id), user: publicUser(user) });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
  res.json(publicUser(user));
});

// KYC submission (light by default; ID number pushes to VERIFIED for demo).
authRouter.post("/kyc", requireAuth, async (req: AuthedRequest, res) => {
  const { idNumber, withdrawMethod, withdrawPhone } = req.body;
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: {
      kycIdNumber: idNumber || null,
      kycStatus: idNumber ? "VERIFIED" : "LIGHT",
      withdrawMethod: withdrawMethod || null,
      withdrawPhone: withdrawPhone || null,
    },
  });
  res.json(publicUser(user));
});

function publicUser(u: any) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    emailVerified: u.emailVerified,
    kycStatus: u.kycStatus,
    withdrawMethod: u.withdrawMethod,
    withdrawPhone: u.withdrawPhone,
  };
}
