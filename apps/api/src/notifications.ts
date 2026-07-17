import { prisma } from "./prisma";
import { sendMail } from "./mailer";

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

// Free SMS provider: TextBelt (https://textbelt.com). The public key "textbelt"
// allows 1 free SMS/day; set SMS_TEXTBELT_KEY to a paid/quota key for more.
// Falls back to a log-only stub when disabled (SMS_PROVIDER=stub or unset).
const SMS_PROVIDER = process.env.SMS_PROVIDER || "stub"; // "textbelt" | "stub"
const TEXTBELT_KEY = process.env.SMS_TEXTBELT_KEY || "textbelt";
const TEXTBELT_URL = process.env.SMS_TEXTBELT_URL || "https://textbelt.com/text";

async function sendSms(phone: string, message: string) {
  if (SMS_PROVIDER !== "textbelt") {
    console.log(`[SMS:stub] ${phone} :: ${message}`);
    return { sent: false, stub: true };
  }
  try {
    const res = await fetch(TEXTBELT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message, key: TEXTBELT_KEY }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!data.success) {
      console.warn(`[SMS:textbelt] failed for ${phone}: ${data.error || "unknown"} (quota: ${data.quotaRemaining})`);
      return { sent: false, error: data.error };
    }
    console.log(`[SMS:textbelt] sent to ${phone} (textId ${data.textId}, quota ${data.quotaRemaining})`);
    return { sent: true, textId: data.textId };
  } catch (e: any) {
    console.error(`[SMS:textbelt] error for ${phone}: ${e.message}`);
    return { sent: false, error: e.message };
  }
}

/**
 * Notify on a confirmed contribution:
 *  - organizer receives a real e-mail (if their account has one)
 *  - contributor receives an SMS (stubbed for now) if a phone was provided
 * Never throws — notification failures must not affect the payment flow.
 */
export async function notifyContribution(contributionId: string) {
  try {
    const contribution = await prisma.contribution.findUnique({
      where: { id: contributionId },
      include: { campaign: { include: { organizer: true } } },
    });
    if (!contribution) return;

    const c = contribution.campaign;
    const amount = fmt(contribution.amount);
    const who = contribution.isAnonymous ? "Un contributeur anonyme" : contribution.contributorName || "Un contributeur";

    // Organizer email
    const organizerEmail = c.organizer?.email;
    if (organizerEmail) {
      await sendMail(
        organizerEmail,
        `Nouvelle contribution de ${amount} FCFA sur « ${c.title} »`,
        `<div style="font-family:Arial,sans-serif;background:#000;color:#fff;padding:28px;border-radius:16px;max-width:460px;margin:auto;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
            <div style="width:28px;height:28px;border-radius:999px;background:#654DDF;"></div>
            <span style="font-size:17px;font-weight:800;">Sungku</span>
          </div>
          <p style="font-size:15px;">${who} vient de contribuer <strong style="color:#B4A8F5;">${amount} FCFA</strong> à votre campagne <strong>${c.title}</strong>.</p>
          ${contribution.message ? `<p style="color:#A0A0A0;font-size:14px;">« ${contribution.message} »</p>` : ""}
          <p style="color:#A0A0A0;font-size:13px;">Connectez-vous à votre tableau de bord pour suivre votre collecte.</p>
        </div>`
      );
    }

    // Contributor SMS (stub)
    if (contribution.phoneNumber) {
      await sendSms(
        contribution.phoneNumber,
        `Sungku: votre contribution de ${amount} FCFA a bien ete recue pour "${c.title}". Merci !`
      );
    }
  } catch (e: any) {
    console.error(`[notifyContribution] ${e.message}`);
  }
}
