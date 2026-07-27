import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

// PawaPay Merchant API client — https://docs.pawapay.io
const BASE_URL = process.env.PAWAPAY_BASE_URL || "https://api.sandbox.pawapay.io";
const API_TOKEN = process.env.PAWAPAY_API_TOKEN || "";

export const pawapayConfigured = () => Boolean(API_TOKEN);

function authHeaders() {
  return {
    Authorization: `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

/** Map phone prefix / channel name to PawaPay provider code for Cameroon. */
export function resolveProvider(channel: string, phoneNumber?: string): string {
  const ch = (channel || "").toUpperCase();
  if (ch === "MTN_MOMO" || ch === "MTN") return "MTN_MOMO_CMR";
  if (ch === "ORANGE_MONEY" || ch === "ORANGE") return "ORANGE_CMR";
  // Fallback: try to guess from phone prefix (Cameroon +237)
  if (phoneNumber) {
    const digits = phoneNumber.replace(/\D/g, "");
    const local = digits.startsWith("237") ? digits.slice(3) : digits;
    if (/^6[5-9]/.test(local)) return "MTN_MOMO_CMR";
    if (/^6[0-4]/.test(local)) return "ORANGE_CMR";
  }
  return "MTN_MOMO_CMR"; // default
}

/** Ensure phone number is in MSISDN format (237...) */
export function toMSISDN(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("237")) return digits;
  // If starts with 6 (Cameroon local), prepend 237
  if (digits.startsWith("6")) return `237${digits}`;
  return digits;
}

export interface DepositResult {
  depositId: string;
  status: "ACCEPTED" | "REJECTED" | "DUPLICATE_IGNORED";
  created?: string;
  failureReason?: { failureCode: string; failureMessage: string };
}

/**
 * Initiate a deposit (collect money from customer).
 * Returns the initiation result; final status arrives via callback or polling.
 */
export async function initiateDeposit(opts: {
  amount: number;
  currency?: string;
  phoneNumber: string;
  provider: string;
  depositId?: string;
  metadata?: Record<string, string>;
}): Promise<DepositResult> {
  const depositId = opts.depositId || uuidv4();
  const body = {
    depositId,
    amount: String(opts.amount),
    currency: opts.currency || "XAF",
    payer: {
      type: "MMO",
      accountDetails: {
        phoneNumber: toMSISDN(opts.phoneNumber),
        provider: opts.provider,
      },
    },
    ...(opts.metadata
      ? { metadata: Object.entries(opts.metadata).map(([k, v]) => ({ [k]: v })) }
      : {}),
  };

  const res = await fetch(`${BASE_URL}/v2/deposits`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data.status) {
    throw new Error(`PawaPay deposit failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return { depositId, ...data } as DepositResult;
}

/** Check the status of a deposit by its ID. */
export async function checkDepositStatus(depositId: string) {
  const res = await fetch(`${BASE_URL}/v2/deposits/${encodeURIComponent(depositId)}`, {
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  return data;
}

/** Initiate a payout (send money to a customer/organizer). */
export async function initiatePayout(opts: {
  amount: number;
  currency?: string;
  phoneNumber: string;
  provider: string;
  payoutId?: string;
}) {
  const payoutId = opts.payoutId || uuidv4();
  const body = {
    payoutId,
    amount: String(opts.amount),
    currency: opts.currency || "XAF",
    recipient: {
      type: "MMO",
      accountDetails: {
        phoneNumber: toMSISDN(opts.phoneNumber),
        provider: opts.provider,
      },
    },
  };
  const res = await fetch(`${BASE_URL}/v2/payouts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data.status) {
    throw new Error(`PawaPay payout failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return { payoutId, ...data };
}

/** Get wallet balances. */
export async function getWalletBalances() {
  const res = await fetch(`${BASE_URL}/v2/wallet-balances`, {
    headers: authHeaders(),
  });
  return res.json().catch(() => ({}));
}

/** Get active configuration (providers, limits, etc.). */
export async function getActiveConfig(country?: string) {
  const qs = country ? `?country=${country}` : "";
  const res = await fetch(`${BASE_URL}/v2/active-conf${qs}`, {
    headers: authHeaders(),
  });
  return res.json().catch(() => ({}));
}

/** Normalize PawaPay deposit/payout status to our internal contribution status. */
export function normalizeStatus(status: string): "CONFIRMED" | "FAILED" | "PENDING" {
  const s = (status || "").toUpperCase();
  if (s === "COMPLETED") return "CONFIRMED";
  if (["FAILED", "REJECTED", "CANCELLED"].includes(s)) return "FAILED";
  return "PENDING"; // ACCEPTED, SUBMITTED, PROCESSING, IN_RECONCILIATION
}
