import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST || "";
const port = Number(process.env.SMTP_PORT) || 587;
const user = process.env.SMTP_USER || "";
const pass = process.env.SMTP_PASS || "";
const from = process.env.SMTP_FROM || user;

export const mailerConfigured = () => Boolean(host && user && pass);

let transporter: nodemailer.Transporter | null = null;
function getTransport() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });
  }
  return transporter;
}

// Generic, non-throwing email send (used for notifications).
export async function sendMail(to: string, subject: string, html: string, text?: string) {
  if (!mailerConfigured()) {
    console.log(`[MAIL:skipped] ${to} :: ${subject}`);
    return { sent: false };
  }
  try {
    await getTransport().sendMail({ from, to, subject, html, text: text || html.replace(/<[^>]+>/g, "") });
    return { sent: true };
  } catch (e: any) {
    console.error(`[MAIL failed] ${to}: ${e.message}`);
    return { sent: false, error: e.message };
  }
}

export async function sendOtpEmail(to: string, code: string, purpose: string) {
  const reasons: Record<string, string> = {
    register_verify: "valider la création de votre compte Sungku",
    login: "confirmer votre connexion à Sungku",
    withdraw: "confirmer votre demande de retrait de fonds",
  };
  const reason = reasons[purpose] || "confirmer votre action";

  // In non-production, log the code so flows are testable from server logs.
  if (process.env.NODE_ENV !== "production") {
    console.log(`[OTP:${purpose}] ${to} -> ${code}`);
  }

  if (!mailerConfigured()) {
    return { simulated: true, sent: false };
  }

  // Never let an SMTP failure crash the request: the OTP is already persisted.
  try {
    await getTransport().sendMail({
      from,
      to,
      subject: `Sungku, votre code de vérification : ${code}`,
      text: `Votre code Sungku pour ${reason} est : ${code}\nCe code expire dans quelques minutes. Ne le partagez avec personne.`,
      html: `
        <div style="font-family:Arial,sans-serif;background:#000;color:#fff;padding:32px;border-radius:16px;max-width:420px;margin:auto;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
            <div style="width:30px;height:30px;border-radius:999px;background:#654DDF;"></div>
            <span style="font-size:18px;font-weight:800;">Sungku</span>
          </div>
          <p style="color:#A0A0A0;font-size:14px;">Voici votre code pour ${reason} :</p>
          <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#B4A8F5;margin:16px 0;">${code}</div>
          <p style="color:#A0A0A0;font-size:13px;">Ce code expire dans quelques minutes. Ne le partagez avec personne.</p>
        </div>`,
    });
    return { simulated: false, sent: true };
  } catch (e: any) {
    console.error(`[OTP send failed] ${to}: ${e.message}`);
    return { simulated: false, sent: false, error: e.message };
  }
}
