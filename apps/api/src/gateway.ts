import crypto from "crypto";

/**
 * Client de la passerelle apisungku.
 *
 * Sungku ne parle plus directement a pawaPay : un seul service detient le
 * token operateur, gere la reconciliation et redistribue les statuts. Le code
 * pawapay.ts est conserve comme repli tant que la bascule n'est pas terminee.
 */
const BASE_URL = (process.env.APISUNGKU_BASE_URL || "https://apisungku.trugroup.cm/v1").replace(/\/+$/, "");
const API_KEY = process.env.APISUNGKU_API_KEY || "";
const WEBHOOK_SECRET = process.env.APISUNGKU_WEBHOOK_SECRET || "";
const TIMEOUT_MS = Number(process.env.APISUNGKU_TIMEOUT_MS || 25000);

export const gatewayConfigured = () => Boolean(API_KEY);

/** Issue indeterminee : la demande a pu aboutir malgre l'absence de reponse. */
export class GatewayUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GatewayUnavailableError";
  }
}

/** Refus explicite de la passerelle : l'echec est certain. */
export class GatewayRejectedError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "GatewayRejectedError";
  }
}

export interface GatewayTransaction {
  id: string;
  type: "DEPOSIT" | "PAYOUT" | "REFUND";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "NEEDS_ATTENTION";
  amount: string;
  currency: string;
  provider: string | null;
  phoneNumber: string | null;
  reference: string | null;
  failure: { code: string; message: string | null } | null;
  completedAt: string | null;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        "X-Api-Key": API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new GatewayUnavailableError(`Aucune reponse de la passerelle sur ${method} ${path}.`);
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  if (response.status >= 500) {
    // Issue indeterminee au meme titre qu'une coupure reseau.
    throw new GatewayUnavailableError(`La passerelle a repondu ${response.status}.`);
  }
  if (!response.ok) {
    const err = data?.error ?? {};
    throw new GatewayRejectedError(err.code ?? "UNKNOWN", err.message ?? `HTTP ${response.status}`);
  }

  return data as T;
}

/**
 * Encaisse une contribution. L'operateur est deduit du numero par la
 * passerelle : plus fiable que de le deviner sur le prefixe, les plages de
 * numeros changeant avec la portabilite.
 */
export function collect(opts: {
  amount: number;
  currency?: string;
  phoneNumber: string;
  provider?: string;
  reference: string;
  customerMessage?: string;
  metadata?: Record<string, unknown>;
}): Promise<GatewayTransaction> {
  return call("POST", "/deposits", {
    amount: String(Math.round(opts.amount)),
    currency: opts.currency || "XAF",
    phoneNumber: opts.phoneNumber,
    ...(opts.provider ? { provider: opts.provider } : {}),
    reference: opts.reference,
    ...(opts.customerMessage ? { customerMessage: opts.customerMessage } : {}),
    ...(opts.metadata ? { metadata: opts.metadata } : {}),
  });
}

export function getTransaction(id: string): Promise<GatewayTransaction> {
  return call("GET", `/transactions/${encodeURIComponent(id)}`);
}

export function getBalances(): Promise<unknown> {
  return call("GET", "/toolkit/balances");
}

export function getProviders(country = "CMR"): Promise<unknown> {
  return call("GET", `/toolkit/providers?country=${encodeURIComponent(country)}&operationType=DEPOSIT`);
}

/** Traduit le statut de la passerelle vers celui de Contribution. */
export function normalizeStatus(status: string): "PENDING" | "CONFIRMED" | "FAILED" {
  switch (String(status).toUpperCase()) {
    case "COMPLETED":
      return "CONFIRMED";
    case "FAILED":
      return "FAILED";
    default:
      // PROCESSING, PENDING et NEEDS_ATTENTION restent en attente : aucun de
      // ces etats ne prouve un echec, et confirmer serait pire encore.
      return "PENDING";
  }
}

/**
 * Verifie l'authenticite d'un webhook, sur le corps BRUT.
 *
 * Sans cette verification, quiconque connait l'URL peut declarer une
 * contribution confirmee qui n'a jamais ete payee.
 */
export function verifyWebhook(
  rawBody: string,
  headers: Record<string, string | string[] | undefined>
): boolean {
  if (!WEBHOOK_SECRET) return false;

  const signature = headers["x-apisungku-signature"];
  const timestamp = headers["x-apisungku-timestamp"];
  if (typeof signature !== "string" || typeof timestamp !== "string") return false;

  // Fenetre de 5 minutes : sans elle, une signature capturee reste rejouable.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", WEBHOOK_SECRET).update(`${timestamp}.${rawBody}`).digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
