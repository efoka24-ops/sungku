const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type Category =
  | "SANTE"
  | "FUNERAILLES"
  | "PROJET_COMMUNAUTAIRE"
  | "EDUCATION"
  | "ENTREPRISE"
  | "TONTINE";

export const CATEGORY_LABELS: Record<Category, string> = {
  SANTE: "Santé",
  FUNERAILLES: "Funérailles",
  PROJET_COMMUNAUTAIRE: "Projet communautaire",
  EDUCATION: "Éducation",
  ENTREPRISE: "Entreprise",
  TONTINE: "Tontine",
};

export type Channel = "ORANGE_MONEY" | "MTN_MOMO" | "NFC" | "QR" | "CARTE";

export const CHANNEL_LABELS: Record<Channel, string> = {
  ORANGE_MONEY: "Orange Money",
  MTN_MOMO: "MTN MoMo",
  NFC: "Tap NFC",
  QR: "QR Code",
  CARTE: "Carte bancaire",
};

export interface Campaign {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: Category;
  targetAmount: number;
  deadline: string | null;
  coverImage: string | null;
  beneficiary: string;
  visibility: "PUBLIQUE" | "PRIVEE";
  isTontine: boolean;
  qrCodeDataUrl: string | null;
  collectedAmount: number;
  contributorCount: number;
  createdAt: string;
  shareUrl?: string;
}

export interface Contribution {
  id: string;
  campaignId: string;
  amount: number;
  channel: Channel;
  status: "PENDING" | "CONFIRMED" | "FAILED";
  contributorName: string | null;
  isAnonymous: boolean;
  message: string | null;
  createdAt: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur API (${res.status})`);
  }
  return res.json();
}

export const api = {
  listCampaigns: (params?: { category?: string; q?: string }) => {
    const search = new URLSearchParams();
    if (params?.category) search.set("category", params.category);
    if (params?.q) search.set("q", params.q);
    const qs = search.toString();
    return request<Campaign[]>(`/campaigns${qs ? `?${qs}` : ""}`);
  },
  getCampaign: (idOrSlug: string) => request<Campaign>(`/campaigns/${idOrSlug}`),
  createCampaign: (data: Partial<Campaign>) =>
    request<Campaign>("/campaigns", { method: "POST", body: JSON.stringify(data) }),
  contribute: (campaignId: string, data: Partial<Contribution>) =>
    request<Contribution>(`/campaigns/${campaignId}/contributions`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  listContributions: (campaignId: string) =>
    request<Contribution[]>(`/campaigns/${campaignId}/contributions`),
};
