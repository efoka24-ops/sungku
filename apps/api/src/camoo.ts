import crypto from "crypto";

// Camoo Payment API client — https://api.camoo.cm/v1/payment
const BASE_URL = process.env.CAMOO_BASE_URL || "https://api.camoo.cm/v1/payment";
const API_KEY = process.env.CAMOO_API_KEY || "";
const API_SECRET = process.env.CAMOO_API_SECRET || "";

export const camooConfigured = () => Boolean(API_KEY && API_SECRET);

function authHeaders() {
  return {
    "X-Api-Key": API_KEY,
    "X-Api-Secret": API_SECRET,
    "Content-Type": "application/json",
  };
}

export interface CashoutPayload {
  amount: number;
  phone_number: string;
  notification_url?: string;
  external_reference?: string;
  currency?: string;
  shopping_cart_details?: Record<string, unknown>;
}

export interface CashoutResult {
  message: string;
  cashOut: {
    id: string;
    amount: number;
    currency: string;
    created_at: number;
    network: string;
    status: string;
    code?: number;
  };
}

export async function cashout(payload: CashoutPayload): Promise<CashoutResult> {
  const res = await fetch(`${BASE_URL}/cashout`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Camoo cashout failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return body as CashoutResult;
}

export async function verify(id: string) {
  const res = await fetch(`${BASE_URL}/verify?id=${encodeURIComponent(id)}`, {
    headers: authHeaders(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Camoo verify failed (${res.status})`);
  return body;
}

export async function account() {
  const res = await fetch(`${BASE_URL}/account`, { headers: authHeaders() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Camoo account failed (${res.status})`);
  return body;
}

// RFC3986 percent-encoding (encodeURIComponent leaves !*'() unescaped)
function rfc3986(str: string) {
  return encodeURIComponent(str).replace(
    /[!*'()]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

/**
 * Verify an inbound signed webhook (Camoo sends GET params incl. `sig`).
 * Rebuild the canonical query string from all params except `sig`, sorted
 * alphabetically and RFC3986-encoded, then HMAC-SHA256 with the API secret.
 */
export function verifyWebhookSignature(query: Record<string, unknown>): boolean {
  if (!API_SECRET) return false;
  const provided = String(query.sig ?? "");
  if (!provided) return false;

  const params = { ...query };
  delete params.sig;

  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${rfc3986(k)}=${rfc3986(String(params[k]))}`)
    .join("&");

  const expected = crypto.createHmac("sha256", API_SECRET).update(canonical).digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Normalize Camoo's (case-insensitive) status into our contribution status.
export function normalizeStatus(status: string): "CONFIRMED" | "FAILED" | "PENDING" {
  const s = (status || "").toLowerCase();
  if (["success", "confirmed", "completed"].includes(s)) return "CONFIRMED";
  if (["failed", "canceled", "cancelled", "errored", "underinvestigation"].includes(s)) return "FAILED";
  return "PENDING";
}
