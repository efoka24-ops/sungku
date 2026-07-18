"use client";

import { useState, useEffect, CSSProperties } from "react";

// ─── API wiring (live backend) ────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const CURRENCY = "FCFA";

const CAT_ENUM_TO_LABEL: Record<string, string> = {
  SANTE: "Santé",
  FUNERAILLES: "Funérailles",
  PROJET_COMMUNAUTAIRE: "Projet communautaire",
  EDUCATION: "Éducation",
  ENTREPRISE: "Entreprise",
  TONTINE: "Tontine",
};
const CAT_LABEL_TO_ENUM: Record<string, string> = {
  Santé: "SANTE",
  Funérailles: "FUNERAILLES",
  "Projet communautaire": "PROJET_COMMUNAUTAIRE",
  Éducation: "EDUCATION",
  Entreprise: "ENTREPRISE",
  Tontine: "TONTINE",
};
const CHANNEL_TO_ENUM: Record<string, string> = {
  "Mobile Money": "ORANGE_MONEY",
  "MTN MoMo": "MTN_MOMO",
  "Carte bancaire": "CARTE",
  "Tap NFC": "NFC",
};

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n || 0));
}
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

interface Campaign {
  id: string;
  slug?: string;
  title: string;
  category: string;
  urgent: boolean;
  organizer: string;
  location: string;
  visibility: string;
  goal: number;
  raised: number;
  contributors: number;
  daysLeft: number;
  desc: string;
  live?: boolean;
  image?: string;
  wall: { name: string; amount: string; method: string; msg: string; time: string }[];
}

function mapCampaign(r: any): Campaign {
  const daysLeft = r.deadline
    ? Math.max(0, Math.ceil((new Date(r.deadline).getTime() - Date.now()) / 86400000))
    : 0;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    category: CAT_ENUM_TO_LABEL[r.category] ?? r.category,
    urgent: r.category === "SANTE" || r.category === "FUNERAILLES",
    organizer: r.beneficiary,
    location: "Cameroun",
    visibility: r.visibility === "PRIVEE" ? "Privée" : "Publique",
    goal: r.targetAmount,
    raised: r.collectedAmount ?? 0,
    contributors: r.contributorCount ?? 0,
    daysLeft,
    desc: r.description,
    live: true,
    image: r.coverImage || undefined,
    wall: [],
  };
}

const api = {
  async list(): Promise<Campaign[]> {
    const res = await fetch(`${API_BASE}/campaigns`, { cache: "no-store" });
    if (!res.ok) throw new Error("list failed");
    return (await res.json()).map(mapCampaign);
  },
  async contributions(idOrSlug: string) {
    const res = await fetch(`${API_BASE}/campaigns/${idOrSlug}/contributions`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  },
  async create(payload: any) {
    const res = await fetch(`${API_BASE}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("create failed");
    return res.json();
  },
  async contribute(idOrSlug: string, payload: any) {
    const res = await fetch(`${API_BASE}/campaigns/${idOrSlug}/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("contribute failed");
    return res.json();
  },
  // ── auth / accounts / admin ──
  post: (path: string, body: any, token?: string) => req("POST", path, body, token),
  put: (path: string, body: any, token?: string) => req("PUT", path, body, token),
  del: (path: string, token?: string) => req("DELETE", path, undefined, token),
  get: (path: string, token?: string) => req("GET", path, undefined, token),
};

async function req(method: string, path: string, body?: any, token?: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur (${res.status})`);
  return data;
}

// ─── Demo data (shown alongside live campaigns) ───────────────────────────────

const CATEGORIES = ["Tous", "Santé", "Funérailles", "Projet communautaire", "Éducation", "Tontine"];

const DEMO_CAMPAIGNS: Campaign[] = [
  { id: "c1", title: "Soins pour Maman Ngo Bell", category: "Santé", urgent: true, organizer: "Famille Ngo Bell", location: "Douala", visibility: "Publique", goal: 2500000, raised: 1680000, contributors: 214, daysLeft: 12, desc: "Maman Ngo Bell a besoin d'une intervention chirurgicale urgente à l'Hôpital Général de Douala. Chaque contribution rapproche la famille de l'objectif et permet une prise en charge rapide.", wall: [{ name: "Paul Eyenga", amount: "10 000", method: "Mobile Money", msg: "Courage à toute la famille.", time: "il y a 2h" }, { name: "Anonyme", amount: "25 000", method: "Carte bancaire", msg: "Que Dieu vous garde.", time: "il y a 5h" }, { name: "Brenda K.", amount: "5 000", method: "Mobile Money", msg: "Prompt rétablissement.", time: "il y a 1j" }] },
  { id: "c2", title: "Obsèques de Papa Etoundi", category: "Funérailles", urgent: false, organizer: "Famille Etoundi", location: "Yaoundé", visibility: "Publique", goal: 1800000, raised: 960000, contributors: 132, daysLeft: 8, desc: "La famille Etoundi organise les obsèques de leur père à Yaoundé et sollicite le soutien de la communauté pour couvrir les frais de cérémonie.", wall: [{ name: "Marc Ndongo", amount: "15 000", method: "Mobile Money", msg: "Sincères condoléances.", time: "il y a 3h" }, { name: "Chantal M.", amount: "10 000", method: "Mobile Money", msg: "Toutes nos pensées vous accompagnent.", time: "il y a 1j" }] },
  { id: "c3", title: "Forage d'eau potable à Bafia", category: "Projet communautaire", urgent: false, organizer: "Comité de développement de Bafia", location: "Bafia", visibility: "Publique", goal: 4200000, raised: 1050000, contributors: 87, daysLeft: 34, desc: "Un forage d'eau potable pour desservir plus de 600 habitants du quartier Bafia-Centre, aujourd'hui contraints de parcourir plusieurs kilomètres pour s'approvisionner en eau.", wall: [{ name: "Diaspora Bafia France", amount: "120 000", method: "Carte bancaire", msg: "Fiers de contribuer depuis Paris.", time: "il y a 6h" }, { name: "Joseph T.", amount: "5 000", method: "Mobile Money", msg: "Pour nos enfants.", time: "il y a 2j" }] },
  { id: "c4", title: "Bourse d'études pour Aïcha Moussa", category: "Éducation", urgent: false, organizer: "Aïcha Moussa", location: "Maroua", visibility: "Publique", goal: 900000, raised: 610000, contributors: 64, daysLeft: 20, desc: "Aïcha, admise en médecine, a besoin d'aide pour financer sa première année universitaire à Maroua.", wall: [{ name: "Fatima B.", amount: "20 000", method: "Mobile Money", msg: "Bon courage pour tes études.", time: "il y a 4h" }, { name: "Anonyme", amount: "50 000", method: "Carte bancaire", msg: "L'éducation avant tout.", time: "il y a 1j" }] },
  { id: "c5", title: "Tontine des Commerçantes du Marché Mokolo", category: "Tontine", urgent: false, organizer: "Groupe des commerçantes de Mokolo", location: "Yaoundé", visibility: "Privée", goal: 3000000, raised: 2100000, contributors: 28, daysLeft: 5, desc: "Cagnotte collective mensuelle du groupe de tontine des commerçantes du marché Mokolo, avec suivi individuel des contributions de chaque membre.", wall: [{ name: "Mama Ruth", amount: "100 000", method: "Mobile Money", msg: "Versement du mois.", time: "il y a 1h" }, { name: "Sylvie A.", amount: "100 000", method: "Mobile Money", msg: "Versement du mois.", time: "il y a 3h" }] },
  { id: "c6", title: "Reconstruction de l'école publique de Meiganga", category: "Éducation", urgent: true, organizer: "APEE Meiganga", location: "Meiganga", visibility: "Publique", goal: 6000000, raised: 1740000, contributors: 156, daysLeft: 45, desc: "Deux salles de classe détruites par les pluies doivent être reconstruites avant la rentrée scolaire pour accueillir plus de 300 élèves.", wall: [{ name: "Association des parents", amount: "200 000", method: "Carte bancaire", msg: "Pour nos enfants.", time: "il y a 5h" }, { name: "Ibrahim S.", amount: "15 000", method: "Mobile Money", msg: "Bon courage à l'équipe.", time: "il y a 2j" }] },
];

const ENDPOINTS = [
  { method: "POST", path: "/campaigns", desc: "Créer une campagne depuis une plateforme tierce.", req: '{\n  "title": "Soins pour Maman Ngo Bell",\n  "category": "sante",\n  "goal": 2500000,\n  "currency": "XAF",\n  "deadline": "2026-08-30",\n  "visibility": "public"\n}', res: '{\n  "id": "cmp_8f21a",\n  "status": "active",\n  "share_url": "https://sungku.cm/c/8f21a",\n  "qr_code_url": "https://sungku.cm/c/8f21a/qr",\n  "ussd_code": "*150*12345#"\n}' },
  { method: "GET", path: "/campaigns/{id}", desc: "État d'une campagne : montant collecté, objectif, statut.", req: null, res: '{\n  "id": "cmp_8f21a",\n  "title": "Soins pour Maman Ngo Bell",\n  "goal": 2500000,\n  "raised": 1680000,\n  "status": "active",\n  "contributors": 214\n}' },
  { method: "POST", path: "/campaigns/{id}/contributions", desc: "Initier une contribution sur une campagne.", req: '{\n  "amount": 5000,\n  "currency": "XAF",\n  "method": "mobile_money",\n  "phone": "+237690000000"\n}', res: '{\n  "id": "ctb_2b9f",\n  "status": "pending",\n  "payment_url": "https://pay.sungku.cm/ctb_2b9f"\n}' },
  { method: "GET", path: "/campaigns/{id}/contributions", desc: "Historique des contributions d'une campagne.", req: null, res: '{\n  "data": [\n    { "name": "Paul Eyenga", "amount": 10000, "method": "mobile_money" }\n  ],\n  "total": 214\n}' },
  { method: "POST", path: "/campaigns/{id}/withdraw", desc: "Demande de retrait des fonds collectés.", req: '{\n  "amount": 500000,\n  "destination": "mobile_money",\n  "phone": "+237690000000"\n}', res: '{\n  "id": "wd_1a3c",\n  "status": "processing",\n  "estimated_completion": "2026-07-17T18:00:00Z"\n}' },
  { method: "WEBHOOK", path: "contribution.received · goal.reached · campaign.closed", desc: "Notifications sortantes des événements de campagne, signées HMAC.", req: null, res: '{\n  "event": "goal.reached",\n  "campaign_id": "cmp_8f21a",\n  "signature": "sha256=...",\n  "timestamp": "2026-07-16T10:22:00Z"\n}' },
];

const METHODS = ["Mobile Money", "MTN MoMo", "Carte bancaire", "Tap NFC"];
const AMOUNT_PRESETS = [1000, 5000, 10000, 25000];

// ─── Shared style tokens ──────────────────────────────────────────────────────

const CARD = "#120F17";
const VIOLET = "#654DDF";
const ACCENT = "#B4A8F5";
const BORDER = "1px solid rgba(255,255,255,0.08)";

const card: CSSProperties = { background: CARD, border: BORDER, borderRadius: 20 };
const chip = (active: boolean): CSSProperties => ({
  background: active ? "#fff" : "transparent",
  color: active ? "#000" : "rgba(255,255,255,0.7)",
  border: active ? "1px solid #fff" : "1px solid rgba(255,255,255,0.15)",
  padding: "10px 18px",
  borderRadius: 999,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
});
const smBtn = (active: boolean): CSSProperties => ({
  background: active ? VIOLET : "#000",
  color: active ? "#fff" : "rgba(255,255,255,0.7)",
  border: active ? `1px solid ${VIOLET}` : "1px solid rgba(255,255,255,0.15)",
  padding: "12px",
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
});
const violetBtn: CSSProperties = { background: VIOLET, color: "#fff", border: "none", borderRadius: 999, fontWeight: 700, cursor: "pointer" };
const ghostBtn: CSSProperties = { background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: 999, cursor: "pointer" };
const catBadge: CSSProperties = { background: "rgba(101,77,223,0.18)", color: ACCENT, border: "1px solid rgba(101,77,223,0.4)", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600 };
const label: CSSProperties = { fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 8 };
const field: CSSProperties = { width: "100%", boxSizing: "border-box", background: CARD, border: "1px solid rgba(255,255,255,0.12)", color: "#fff", padding: "14px 16px", borderRadius: 12, fontSize: 14 };

function Gauge({ raised, goal, height = 10 }: { raised: number; goal: number; height?: number }) {
  const pct = goal ? Math.min((raised / goal) * 100, 100) : 0;
  return (
    <div style={{ height, borderRadius: 999, background: VIOLET, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: "#fff", transition: "width .5s" }} />
    </div>
  );
}

function ImgSlot({ h, label: text, src }: { h: number; label: string; src?: string }) {
  if (src) {
    return <img src={src} alt={text} style={{ height: h, width: "100%", objectFit: "cover", display: "block" }} />;
  }
  return (
    <div style={{ height: h, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,rgba(101,77,223,0.35),rgba(101,77,223,0.08))", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
      {text}
    </div>
  );
}

type View = "home" | "campaign" | "create" | "dashboard" | "dev" | "admin" | "how" | "help" | "report" | "cobac" | "press" | "contact";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  kycStatus: string;
  withdrawMethod?: string;
  withdrawPhone?: string;
  isAdmin?: boolean;
}

export default function SungkuApp() {
  const [view, setView] = useState<View>("home");
  const [live, setLive] = useState<Campaign[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  async function refresh() {
    try {
      setLive(await api.list());
    } catch {
      /* API offline — demo only */
    }
  }
  useEffect(() => {
    refresh();
    const saved = typeof window !== "undefined" ? localStorage.getItem("sungku_token") : null;
    if (saved) {
      setToken(saved);
      api.get("/auth/me", saved).then(setUser).catch(() => {
        localStorage.removeItem("sungku_token");
        setToken(null);
      });
    }
  }, []);

  function onAuthed(tok: string, u: AuthUser) {
    localStorage.setItem("sungku_token", tok);
    setToken(tok);
    setUser(u);
    setAuthOpen(false);
  }
  function logout() {
    localStorage.removeItem("sungku_token");
    setToken(null);
    setUser(null);
    setView("home");
  }

  // The site reflects the database (managed from the back office). No demo fallback.
  const campaigns = live;

  // Re-fetch when returning to the home view so moderation changes are reflected.
  useEffect(() => {
    if (view === "home") refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // shared selection
  const [selected, setSelected] = useState<Campaign | null>(null);

  function openCampaign(c: Campaign) {
    setSelected(c);
    setView("campaign");
  }

  const navBtn = (v: View): CSSProperties => ({
    background: view === v ? "rgba(255,255,255,0.1)" : "transparent",
    border: "none",
    color: view === v ? "#fff" : "rgba(255,255,255,0.65)",
    padding: "10px 16px",
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", fontFamily: "'Manrope',sans-serif" }}>
      {/* Navbar */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div onClick={() => setView("home")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <div style={{ width: 34, height: 34, borderRadius: 999, background: VIOLET, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 16, height: 8, borderRadius: 999, background: "#fff" }} />
            </div>
            <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em" }}>Sungku</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => setView("home")} style={navBtn("home")}>Accueil</button>
            <button onClick={() => setView("create")} style={navBtn("create")}>Créer une campagne</button>
            {user && <button onClick={() => setView("dashboard")} style={navBtn("dashboard")}>Tableau de bord</button>}
            <button onClick={() => setView("dev")} style={navBtn("dev")}>Développeurs</button>
            {user?.isAdmin && <button onClick={() => setView("admin")} style={navBtn("admin")}>Back office</button>}
          </div>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{user.name.split(" ")[0]}</span>
              <button onClick={logout} style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", padding: "10px 18px", borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Déconnexion</button>
            </div>
          ) : (
            <button onClick={() => setAuthOpen(true)} style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", padding: "10px 20px", borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Se connecter</button>
          )}
        </div>
      </div>

      {view === "home" && <Home campaigns={campaigns} onOpen={openCampaign} onCreate={() => setView("create")} />}
      {view === "campaign" && selected && <CampaignView campaign={selected} onBack={() => setView("home")} onContributed={refresh} />}
      {view === "create" && <Create user={user} token={token} onRequireAuth={() => setAuthOpen(true)} onDone={refresh} goDashboard={() => setView("dashboard")} />}
      {(view === "how" || view === "help" || view === "report" || view === "cobac" || view === "press" || view === "contact") && <InfoPage page={view} onNav={setView} />}
      {view === "dashboard" && <Dashboard campaign={selected ?? campaigns[0]} user={user} token={token} onUser={setUser} onRequireAuth={() => setAuthOpen(true)} />}
      {view === "dev" && <DevPortal />}
      {view === "admin" && <AdminBackOffice user={user} token={token} onRequireAuth={() => setAuthOpen(true)} />}

      <Footer onNav={setView} />
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onAuthed={onAuthed} />}
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer({ onNav }: { onNav: (v: View) => void }) {
  const linkStyle: CSSProperties = { background: "none", border: "none", padding: 0, textAlign: "left", color: "rgba(255,255,255,0.55)", fontSize: 14, cursor: "pointer", fontFamily: "inherit" };
  const colTitle: CSSProperties = { fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.4)", margin: "0 0 16px" };

  const platform = [
    { label: "Explorer les campagnes", onClick: () => onNav("home") },
    { label: "Créer une cagnotte", onClick: () => onNav("create") },
    { label: "Comment ça marche", onClick: () => onNav("how") },
    { label: "Catégories", onClick: () => onNav("home") },
    { label: "Campagnes urgentes", onClick: () => onNav("home") },
  ];
  const support: { label: string; onClick: () => void }[] = [
    { label: "Centre d'aide", onClick: () => onNav("help") },
    { label: "Signaler une campagne", onClick: () => onNav("report") },
    { label: "Conformité COBAC", onClick: () => onNav("cobac") },
    { label: "Presse & médias", onClick: () => onNav("press") },
    { label: "Nous contacter", onClick: () => onNav("contact") },
  ];

  return (
    <footer style={{ borderTop: BORDER, marginTop: 40 }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 32px 56px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 40 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 30, height: 30, borderRadius: 999, background: VIOLET, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 14, height: 7, borderRadius: 999, background: "#fff" }} />
            </div>
            <span style={{ fontSize: 17, fontWeight: 800 }}>Sungku</span>
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, margin: 0, maxWidth: 240 }}>
            La plateforme de collecte de fonds camerounaise. Mobile Money, NFC, QR code et carte, depuis le Cameroun ou la diaspora.
          </p>
        </div>

        <div>
          <p style={colTitle}>Plateforme</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {platform.map((l) => (
              <button key={l.label} onClick={l.onClick} style={linkStyle}>{l.label}</button>
            ))}
          </div>
        </div>

        <div>
          <p style={colTitle}>Support</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {support.map((l) => (
              <button key={l.label} onClick={l.onClick} style={linkStyle}>{l.label}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ borderTop: BORDER }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 32px", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
          © {new Date().getFullYear()} Sungku · Plateforme de collecte de fonds · Conformité BEAC/COBAC
        </div>
      </div>
    </footer>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────

function Home({ campaigns, onOpen, onCreate }: { campaigns: Campaign[]; onOpen: (c: Campaign) => void; onCreate: () => void }) {
  const [cat, setCat] = useState("Tous");
  const [q, setQ] = useState("");
  const filtered = campaigns.filter(
    (c) =>
      (cat === "Tous" || c.category === cat) &&
      (c.title.toLowerCase().includes(q.toLowerCase()) || c.organizer.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px 80px" }}>
      <div style={{ padding: "64px 0 40px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(101,77,223,0.15)", border: "1px solid rgba(101,77,223,0.4)", color: ACCENT, padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
          Plateforme de collecte de fonds camerounaise
        </div>
        <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.06, margin: "0 0 20px", maxWidth: 760, letterSpacing: "-0.02em" }}>Financez ce qui compte, ensemble.</h1>
        <p style={{ fontSize: 18, color: "rgba(255,255,255,0.62)", maxWidth: 580, margin: "0 0 32px", lineHeight: 1.55 }}>
          Créez ou soutenez une campagne (santé, funérailles, projets communautaires, éducation ou tontine) et contribuez en Mobile Money, tap NFC, QR code ou carte, depuis le Cameroun ou la diaspora.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une campagne, une ville, une cause…" style={{ flex: 1, minWidth: 260, background: CARD, border: "1px solid rgba(255,255,255,0.12)", color: "#fff", padding: "14px 20px", borderRadius: 999, fontSize: 15 }} />
          <button onClick={onCreate} style={{ ...violetBtn, padding: "14px 26px", fontSize: 15, whiteSpace: "nowrap" }}>Démarrer une campagne</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 40 }}>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCat(c)} style={chip(cat === c)}>{c}</button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Campagnes à la une</h2>
        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 14 }}>{filtered.length} campagnes</span>
      </div>

      {filtered.length === 0 && (
        <div style={{ ...card, padding: 40, textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
          Aucune campagne pour le moment. Soyez le premier à en lancer une.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 24 }}>
        {filtered.map((c) => (
          <div key={c.id} onClick={() => onOpen(c)} style={{ cursor: "pointer", ...card, overflow: "hidden" }}>
            <ImgSlot h={160} label="Photo de la campagne" src={c.image} />
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
                <span style={catBadge}>{c.category}</span>
                {c.urgent && <span style={{ background: "#fff", color: "#000", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>Urgent</span>}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px", lineHeight: 1.3 }}>{c.title}</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "0 0 16px" }}>{c.organizer} · {c.location}</p>
              <div style={{ marginBottom: 10 }}><Gauge raised={c.raised} goal={c.goal} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 12 }}>
                <span style={{ fontWeight: 700 }}>{fmt(c.raised)} {CURRENCY}</span>
                <span style={{ color: "rgba(255,255,255,0.45)" }}>sur {fmt(c.goal)} {CURRENCY}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                <span>{c.contributors} contributeurs</span>
                <span>{c.daysLeft} jours restants</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Campaign detail + contribution ──────────────────────────────────────────

function CampaignView({ campaign, onBack, onContributed }: { campaign: Campaign; onBack: () => void; onContributed: () => void }) {
  const [wall, setWall] = useState(campaign.wall);
  const [raised, setRaised] = useState(campaign.raised);
  const [contributors, setContributors] = useState(campaign.contributors);
  const [method, setMethod] = useState("Mobile Money");
  const [preset, setPreset] = useState<number | null>(5000);
  const [custom, setCustom] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [contributed, setContributed] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copier le lien");
  const [reportLabel, setReportLabel] = useState("Signaler");
  const [submitting, setSubmitting] = useState(false);

  const finalAmount = custom ? parseInt(custom.replace(/\s/g, "")) || 0 : preset ?? 0;
  const pct = campaign.goal ? Math.round((raised / campaign.goal) * 100) : 0;

  useEffect(() => {
    if (campaign.live) {
      api.contributions(campaign.slug || campaign.id).then((list: any[]) => {
        setWall(
          list.map((c) => ({
            name: c.isAnonymous ? "Anonyme" : c.contributorName || "Anonyme",
            amount: fmt(c.amount),
            method: c.channel,
            msg: c.message || "",
            time: "récemment",
          }))
        );
      });
    }
  }, [campaign]);

  async function contribute() {
    if (finalAmount <= 0) return;
    setSubmitting(true);
    try {
      await api.contribute(campaign.slug || campaign.id, {
        amount: finalAmount,
        channel: CHANNEL_TO_ENUM[method] ?? "ORANGE_MONEY",
        message: message || undefined,
        phoneNumber: phone || undefined,
      });
      onContributed();
    } catch {
      /* demo campaign or API offline */
    }
    setRaised((r) => r + finalAmount);
    setContributors((n) => n + 1);
    setContributed(true);
    setSubmitting(false);
  }

  async function reportCampaign() {
    const reason = typeof window !== "undefined" ? window.prompt("Motif du signalement :") : null;
    if (!reason) return;
    try {
      await api.post(`/campaigns/${campaign.slug || campaign.id}/report`, { reason });
      setReportLabel("Signalement envoyé");
    } catch {
      setReportLabel("Signalement enregistré");
    }
    setTimeout(() => setReportLabel("Signaler"), 2500);
  }

  function copyLink() {
    setCopyLabel("Lien copié !");
    setTimeout(() => setCopyLabel("Copier le lien"), 2000);
  }

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 32px 80px" }}>
      <button onClick={onBack} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.55)", fontSize: 14, cursor: "pointer", padding: 0, marginBottom: 24 }}>← Retour aux campagnes</button>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 40, alignItems: "start" }}>
        <div>
          <div style={{ borderRadius: 20, overflow: "hidden", marginBottom: 24 }}>
            <ImgSlot h={380} label="Photo principale de la campagne" src={campaign.image} />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <span style={catBadge}>{campaign.category}</span>
            {campaign.urgent && <span style={{ background: "#fff", color: "#000", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>Urgent</span>}
            <span style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)", padding: "4px 12px", borderRadius: 999, fontSize: 12 }}>{campaign.visibility}</span>
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.01em" }}>{campaign.title}</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: "0 0 28px" }}>Organisée par {campaign.organizer} · {campaign.location}</p>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: "rgba(255,255,255,0.75)", margin: "0 0 36px", maxWidth: 640 }}>{campaign.desc}</p>

          <h3 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 20px" }}>Mur des contributeurs</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
            {wall.length === 0 && <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14 }}>Soyez le premier à contribuer.</p>}
            {wall.map((w, i) => (
              <div key={i} style={{ background: CARD, border: BORDER, borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{w.name}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: ACCENT }}>{w.amount} {CURRENCY}</span>
                </div>
                {w.msg && <p style={{ margin: "0 0 6px", fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{w.msg}</p>}
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{w.time}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={{ ...ghostBtn, padding: "10px 20px", fontSize: 14 }}>Partager sur WhatsApp</button>
            <button style={{ ...ghostBtn, padding: "10px 20px", fontSize: 14 }}>Partager sur Facebook</button>
            <button onClick={copyLink} style={{ ...ghostBtn, padding: "10px 20px", fontSize: 14 }}>{copyLabel}</button>
            <button onClick={reportCampaign} style={{ ...ghostBtn, padding: "10px 20px", fontSize: 14, color: "#E74C3C", borderColor: "rgba(231,76,60,0.4)" }}>{reportLabel}</button>
          </div>
        </div>

        <div style={{ position: "sticky", top: 100, background: CARD, border: BORDER, borderRadius: 24, padding: 28 }}>
          <div style={{ marginBottom: 16 }}><Gauge raised={raised} goal={campaign.goal} height={16} /></div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 28, fontWeight: 800 }}>{fmt(raised)} {CURRENCY}</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>{pct}%</span>
          </div>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "rgba(255,255,255,0.5)" }}>sur {fmt(campaign.goal)} {CURRENCY} objectif</p>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 24, borderTop: BORDER, borderBottom: BORDER, padding: "14px 0" }}>
            <span>{contributors} contributeurs</span>
            <span>{campaign.daysLeft} jours restants</span>
          </div>

          {contributed ? (
            <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, padding: 20, textAlign: "center" }}>
              <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 16 }}>Merci pour votre soutien !</p>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>Votre contribution de {fmt(finalAmount)} {CURRENCY} a été enregistrée. Partagez la campagne pour encourager d'autres personnes.</p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Méthode de contribution</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                {METHODS.map((m) => (
                  <button key={m} onClick={() => setMethod(m)} style={smBtn(method === m)}>{m}</button>
                ))}
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Montant</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: 10 }}>
                {AMOUNT_PRESETS.map((p) => (
                  <button key={p} onClick={() => { setPreset(p); setCustom(""); }} style={smBtn(!custom && preset === p)}>{fmt(p)} {CURRENCY}</button>
                ))}
              </div>
              <input value={custom} onChange={(e) => { setCustom(e.target.value); setPreset(null); }} placeholder="Autre montant (FCFA)" style={{ width: "100%", boxSizing: "border-box", background: "#000", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "12px 16px", borderRadius: 12, fontSize: 14, marginBottom: 16 }} />
              {(method === "Mobile Money" || method === "MTN MoMo") && (
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numéro de téléphone (+237…)" style={{ width: "100%", boxSizing: "border-box", background: "#000", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "12px 16px", borderRadius: 12, fontSize: 14, marginBottom: 16 }} />
              )}
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message de soutien (optionnel)" rows={2} style={{ width: "100%", boxSizing: "border-box", background: "#000", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "12px 16px", borderRadius: 12, fontSize: 14, marginBottom: 16, resize: "none" }} />
              <button onClick={contribute} disabled={submitting} style={{ ...violetBtn, width: "100%", padding: 16, fontSize: 15, opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "Traitement…" : `Contribuer ${fmt(finalAmount)} ${CURRENCY}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Create ───────────────────────────────────────────────────────────────────

function Create({ user, token, onRequireAuth, onDone, goDashboard }: { user: AuthUser | null; token: string | null; onRequireAuth: () => void; onDone: () => void; goDashboard: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", category: "Santé", goal: "", deadline: "", beneficiary: "", visibility: "Publique", isTontine: false });
  const [contributorRows, setContributorRows] = useState<string[]>([""]);
  const [coverImage, setCoverImage] = useState<string>("");
  const [created, setCreated] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const goalNum = parseInt(String(form.goal).replace(/\s/g, "")) || 0;

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setErr("Image trop lourde (max 3 Mo).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCoverImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function submit() {
    setErr(null);
    if (!form.title || !form.description || !goalNum || !form.beneficiary) {
      setErr("Le titre, la description, le montant cible et le bénéficiaire sont requis.");
      return;
    }
    try {
      await api.post(
        "/campaigns",
        {
          title: form.title,
          description: form.description,
          category: CAT_LABEL_TO_ENUM[form.category] ?? "PROJET_COMMUNAUTAIRE",
          targetAmount: goalNum,
          deadline: form.deadline || undefined,
          beneficiary: form.beneficiary,
          visibility: form.visibility === "Privée" ? "PRIVEE" : "PUBLIQUE",
          isTontine: form.isTontine,
          coverImage: coverImage || undefined,
        },
        token || undefined
      );
      onDone();
      setCreated(true);
    } catch (e: any) {
      setErr(e.message || "Impossible de créer la campagne. Vérifiez que le service est démarré.");
    }
  }

  const visOpt = (v: string): CSSProperties => ({
    flex: 1,
    background: form.visibility === v ? VIOLET : "#000",
    color: "#fff",
    border: form.visibility === v ? `1px solid ${VIOLET}` : "1px solid rgba(255,255,255,0.15)",
    padding: "12px",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  });

  // A campaign can only be created from an organizer account.
  if (!user) {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "80px 32px", textAlign: "center" }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 12px" }}>Créer une campagne</h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", margin: "0 0 28px" }}>
          La création d'une campagne nécessite un compte organisateur. Créez votre compte (vérification par code e-mail) pour continuer.
        </p>
        <button onClick={onRequireAuth} style={{ ...violetBtn, padding: "14px 26px", fontSize: 15 }}>Se connecter ou créer un compte</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "56px 32px 80px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 8px" }}>Créer une campagne</h1>
      <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", margin: "0 0 40px" }}>Lancez votre collecte en quelques minutes. Lien, QR code et code USSD sont générés automatiquement.</p>

      {created ? (
        <div style={{ ...card, borderRadius: 24, padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>Campagne créée avec succès</p>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", margin: "0 0 32px" }}>Partagez ces éléments pour commencer à récolter des contributions.</p>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
            <div style={{ width: 140, height: 140, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Code QR</div>
            <div style={{ textAlign: "left", maxWidth: 340 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>Lien de partage</p>
              <p style={{ fontSize: 14, background: "#000", border: "1px solid rgba(255,255,255,0.12)", padding: "12px 16px", borderRadius: 10, margin: "0 0 16px" }}>sungku.cm/c/new-8f21a</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>Code USSD</p>
              <p style={{ fontSize: 14, background: "#000", border: "1px solid rgba(255,255,255,0.12)", padding: "12px 16px", borderRadius: 10, margin: 0 }}>*150*12345#</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32 }}>
            <button onClick={goDashboard} style={{ ...violetBtn, padding: "14px 24px", fontSize: 14 }}>Voir le tableau de bord</button>
            <button onClick={() => { setCreated(false); setForm({ title: "", description: "", category: "Santé", goal: "", deadline: "", beneficiary: "", visibility: "Publique", isTontine: false }); }} style={{ ...ghostBtn, padding: "14px 24px", fontSize: 14 }}>Créer une autre campagne</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 32, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={label}>Titre de la campagne</label>
              <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex : Soins pour Maman Ngo Bell" style={field} />
            </div>
            <div>
              <label style={label}>Description</label>
              <textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Expliquez le contexte et l'objectif de la campagne…" rows={4} style={{ ...field, resize: "none" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={label}>Catégorie</label>
                <select value={form.category} onChange={(e) => set("category", e.target.value)} style={field}>
                  {["Santé", "Funérailles", "Projet communautaire", "Éducation", "Tontine"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Montant cible (FCFA)</label>
                <input value={form.goal} onChange={(e) => set("goal", e.target.value)} placeholder="Ex : 2 000 000" style={field} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={label}>Échéance</label>
                <input type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} style={field} />
              </div>
              <div>
                <label style={label}>Bénéficiaire</label>
                <input value={form.beneficiary} onChange={(e) => set("beneficiary", e.target.value)} placeholder="Nom du bénéficiaire" style={field} />
              </div>
            </div>
            <div>
              <label style={label}>Image de couverture</label>
              <label style={{ display: "block", borderRadius: 16, overflow: "hidden", cursor: "pointer", border: "1px dashed rgba(255,255,255,0.2)" }}>
                <input type="file" accept="image/*" onChange={onPickImage} style={{ display: "none" }} />
                {coverImage ? (
                  <img src={coverImage} alt="Aperçu" style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)", fontSize: 13, background: "linear-gradient(135deg,rgba(101,77,223,0.35),rgba(101,77,223,0.08))" }}>
                    Cliquer pour ajouter une image (max 3 Mo)
                  </div>
                )}
              </label>
            </div>
            <div>
              <label style={label}>Visibilité</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["Publique", "Privée"].map((v) => <button key={v} onClick={() => set("visibility", v)} style={visOpt(v)}>{v}</button>)}
              </div>
            </div>
            <div style={{ ...card, borderRadius: 14, padding: 18 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                <input type="checkbox" checked={form.isTontine} onChange={(e) => set("isTontine", e.target.checked)} style={{ width: 18, height: 18 }} />
                Campagne collective (type tontine)
              </label>
              {form.isTontine && (
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  {contributorRows.map((row, i) => (
                    <div key={i} style={{ display: "flex", gap: 8 }}>
                      <input value={row} onChange={(e) => setContributorRows((rows) => rows.map((r, j) => (j === i ? e.target.value : r)))} placeholder="Nom du contributeur" style={{ flex: 1, boxSizing: "border-box", background: "#000", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "10px 14px", borderRadius: 10, fontSize: 14 }} />
                      <button onClick={() => setContributorRows((rows) => rows.filter((_, j) => j !== i))} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)", padding: "0 14px", borderRadius: 10, cursor: "pointer" }}>✕</button>
                    </div>
                  ))}
                  <button onClick={() => setContributorRows((rows) => [...rows, ""])} style={{ alignSelf: "flex-start", background: "transparent", border: "1px dashed rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.7)", padding: "8px 16px", borderRadius: 10, fontSize: 13, cursor: "pointer" }}>+ Ajouter un contributeur</button>
                </div>
              )}
            </div>
            {err && <p style={{ color: "#E74C3C", fontSize: 14, margin: 0 }}>{err}</p>}
            <button onClick={submit} style={{ ...violetBtn, padding: 16, fontSize: 15 }}>Créer la campagne</button>
          </div>

          <div style={{ position: "sticky", top: 100, ...card, padding: 22 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 16px" }}>Aperçu de la page publique</p>
            <span style={catBadge}>{form.category}</span>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "14px 0 16px" }}>{form.title || "Titre de votre campagne"}</h3>
            <div style={{ marginBottom: 10 }}><Gauge raised={0} goal={goalNum || 1} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ fontWeight: 700 }}>0 {CURRENCY}</span>
              <span style={{ color: "rgba(255,255,255,0.45)" }}>sur {fmt(goalNum)} {CURRENCY}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ campaign, user, token, onUser, onRequireAuth }: { campaign: Campaign; user: AuthUser | null; token: string | null; onUser: (u: AuthUser) => void; onRequireAuth: () => void }) {
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawDest, setWithdrawDest] = useState("mobile_money");
  const [withdrawStep, setWithdrawStep] = useState<"form" | "otp" | "done">("form");
  const [withdrawCode, setWithdrawCode] = useState("");
  const [withdrawMsg, setWithdrawMsg] = useState<string | null>(null);
  const [withdrawErr, setWithdrawErr] = useState<string | null>(null);
  const [withdrawDev, setWithdrawDev] = useState<string | null>(null);
  // KYC
  const [kycId, setKycId] = useState("");
  const [kycMethod, setKycMethod] = useState("mobile_money");
  const [kycPhone, setKycPhone] = useState("");
  const [kycErr, setKycErr] = useState<string | null>(null);
  const [queue, setQueue] = useState([
    { title: "Aide médicale urgente à Bertoua", reason: "Catégorie sensible (santé)", status: "En attente" },
    { title: "Collecte funérailles à Ebolowa", reason: "Signalement utilisateur", status: "En attente" },
  ]);

  const kycVerified = user?.kycStatus === "VERIFIED";

  async function submitKyc() {
    if (!token) return;
    setKycErr(null);
    try {
      const u = await api.post("/auth/kyc", { idNumber: kycId, withdrawMethod: kycMethod, withdrawPhone: kycPhone }, token);
      onUser(u);
    } catch (e: any) {
      setKycErr(e.message);
    }
  }

  async function requestWithdraw() {
    setWithdrawErr(null);
    if (!token) return onRequireAuth();
    try {
      const r = await api.post("/withdraw/request", { amount: Number(withdrawAmount.replace(/\s/g, "")), destination: withdrawDest }, token);
      if (r.devCode) setWithdrawDev(r.devCode);
      setWithdrawStep("otp");
    } catch (e: any) {
      setWithdrawErr(e.message);
    }
  }
  async function confirmWithdraw() {
    setWithdrawErr(null);
    try {
      const r = await api.post("/withdraw/confirm", { code: withdrawCode }, token || undefined);
      setWithdrawMsg(r.message);
      setWithdrawStep("done");
    } catch (e: any) {
      setWithdrawErr(e.message);
    }
  }

  // Gate: organizer dashboard requires an authenticated account (role 3).
  if (!user) {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "80px 32px", textAlign: "center" }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 12px" }}>Espace organisateur</h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", margin: "0 0 28px" }}>
          Connectez-vous ou créez un compte organisateur (vérification par code e-mail) pour accéder au tableau de bord, aux retraits et à la modération.
        </p>
        <button onClick={onRequireAuth} style={{ ...violetBtn, padding: "14px 26px", fontSize: 15 }}>Se connecter / Créer un compte</button>
      </div>
    );
  }

  // No campaign yet (empty DB): show a friendly prompt instead of crashing.
  if (!campaign) {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "80px 32px", textAlign: "center" }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 12px" }}>Tableau de bord organisateur</h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", margin: "0 0 28px" }}>Aucune campagne pour le moment. Créez votre première campagne pour commencer.</p>
        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Utilisez « Créer une campagne » dans le menu.</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "56px 32px 80px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 8px" }}>Tableau de bord organisateur</h1>
      <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", margin: "0 0 24px" }}>{campaign.title} · {user.name}</p>

      {/* KYC status banner */}
      <div style={{ ...card, borderRadius: 16, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.75)" }}>
          Vérification d'identité (KYC) : <strong style={{ color: kycVerified ? "#2ECC71" : "#F39C12" }}>{kycVerified ? "Vérifié" : user.kycStatus === "LIGHT" ? "Allégé" : "À compléter"}</strong>
        </span>
        {!kycVerified && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input value={kycId} onChange={(e) => setKycId(e.target.value)} placeholder="N° pièce d'identité (CNI)" style={{ background: "#000", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "10px 14px", borderRadius: 10, fontSize: 13 }} />
            <select value={kycMethod} onChange={(e) => setKycMethod(e.target.value)} style={{ background: "#000", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "10px 14px", borderRadius: 10, fontSize: 13 }}>
              <option value="mobile_money">Retrait : Mobile Money</option>
              <option value="wallet">Retrait : Portefeuille Sungku</option>
            </select>
            <input value={kycPhone} onChange={(e) => setKycPhone(e.target.value)} placeholder="Téléphone retrait" style={{ background: "#000", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "10px 14px", borderRadius: 10, fontSize: 13 }} />
            <button onClick={submitKyc} style={{ ...violetBtn, padding: "10px 18px", fontSize: 13 }}>Valider le KYC</button>
          </div>
        )}
      </div>
      {kycErr && <p style={{ color: "#E74C3C", fontSize: 13, marginTop: -12, marginBottom: 16 }}>{kycErr}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 36 }}>
        {[
          { label: "Total collecté", value: `${fmt(campaign.raised)} ${CURRENCY}` },
          { label: "Contributeurs", value: `${campaign.contributors}` },
          { label: "Jours restants", value: `${campaign.daysLeft}` },
          { label: "Frais de plateforme", value: "2,5%" },
        ].map((k) => (
          <div key={k.label} style={{ ...card, borderRadius: 16, padding: 22 }}>
            <p style={{ margin: "0 0 6px", fontSize: 13, color: "rgba(255,255,255,0.45)" }}>{k.label}</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24, alignItems: "start" }}>
        <div style={{ ...card, padding: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 18px" }}>Contributions récentes</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", fontSize: 12, color: "rgba(255,255,255,0.4)", padding: "0 8px 10px", borderBottom: BORDER }}>
              <span>Contributeur</span><span>Montant</span><span>Méthode</span><span>Date</span>
            </div>
            {campaign.wall.map((w, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", fontSize: 14, padding: "12px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)", alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>{w.name}</span>
                <span>{w.amount} {CURRENCY}</span>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>{w.method}</span>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>{w.time}</span>
              </div>
            ))}
          </div>
          <button style={{ marginTop: 18, ...ghostBtn, padding: "10px 18px", fontSize: 13 }}>Exporter les reçus (CSV)</button>
        </div>

        <div style={{ ...card, padding: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 18px" }}>Retrait des fonds</h3>
          {!kycVerified ? (
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Complétez la vérification d'identité (KYC) ci-dessus pour activer les retraits.</p>
          ) : withdrawStep === "done" ? (
            <p style={{ fontSize: 14, color: "#2ECC71" }}>{withdrawMsg}</p>
          ) : withdrawStep === "otp" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0 }}>Un code de confirmation distinct a été envoyé à votre e-mail (double validation).{withdrawDev ? ` Votre code : ${withdrawDev}` : ""}</p>
              <input value={withdrawCode} onChange={(e) => setWithdrawCode(e.target.value)} placeholder="Code de retrait" style={{ boxSizing: "border-box", background: "#000", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "12px 14px", borderRadius: 10, fontSize: 14, letterSpacing: 4 }} />
              <button onClick={confirmWithdraw} style={{ ...violetBtn, padding: 12, fontSize: 14 }}>Confirmer le retrait</button>
              <button onClick={() => setWithdrawStep("form")} style={{ ...ghostBtn, padding: 10, fontSize: 13 }}>Annuler</button>
            </div>
          ) : (
            <>
              {showWithdraw && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                  <input value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Montant (FCFA)" style={{ boxSizing: "border-box", background: "#000", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "12px 14px", borderRadius: 10, fontSize: 14 }} />
                  <select value={withdrawDest} onChange={(e) => setWithdrawDest(e.target.value)} style={{ boxSizing: "border-box", background: "#000", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "12px 14px", borderRadius: 10, fontSize: 14 }}>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="wallet">Portefeuille Sungku</option>
                  </select>
                  <button onClick={requestWithdraw} style={{ ...violetBtn, padding: 12, fontSize: 14 }}>Demander le code de confirmation</button>
                </div>
              )}
              <button onClick={() => setShowWithdraw((s) => !s)} style={{ width: "100%", boxSizing: "border-box", ...ghostBtn, padding: 12, fontSize: 14 }}>{showWithdraw ? "Annuler" : "Demander un retrait"}</button>
            </>
          )}
          {withdrawErr && <p style={{ color: "#E74C3C", fontSize: 13, marginTop: 10 }}>{withdrawErr}</p>}

          <h3 style={{ fontSize: 17, fontWeight: 700, margin: "28px 0 14px" }}>Modération (back-office)</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {queue.map((mod, i) => (
              <div key={i} style={{ background: "#000", border: BORDER, borderRadius: 12, padding: 14 }}>
                <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600 }}>{mod.title}</p>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{mod.reason} · {mod.status}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setQueue((q) => q.filter((_, j) => j !== i))} style={{ background: "#fff", color: "#000", border: "none", padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Approuver</button>
                  <button onClick={() => setQueue((q) => q.filter((_, j) => j !== i))} style={{ ...ghostBtn, padding: "6px 14px", fontSize: 12 }}>Rejeter</button>
                </div>
              </div>
            ))}
            {queue.length === 0 && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: 0 }}>File de modération vide.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Developer portal ─────────────────────────────────────────────────────────

const ALL_SCOPES = ["read", "campaigns:create", "contributions:create", "withdraw"];

function DevPortal() {
  const [sel, setSel] = useState(0);
  const endpoint = ENDPOINTS[sel];

  // Partner account state
  const [partner, setPartner] = useState<any>(null);
  const [reg, setReg] = useState({ orgName: "", contactName: "", contactEmail: "" });
  const [regErr, setRegErr] = useState<string | null>(null);
  const [scopes, setScopes] = useState<string[]>(["read"]);
  const [generatedKey, setGeneratedKey] = useState<{ keyId: string; secret: string; env: string } | null>(null);
  const [keyErr, setKeyErr] = useState<string | null>(null);

  async function registerPartner() {
    setRegErr(null);
    try {
      setPartner(await api.post("/partners/register", reg));
    } catch (e: any) {
      setRegErr(e.message);
    }
  }
  async function generateKey(env: "sandbox" | "production") {
    setKeyErr(null);
    try {
      setGeneratedKey(await api.post(`/partners/${partner.id}/api-keys`, { env, scopes }));
      setPartner(await api.get(`/partners/${partner.id}`));
    } catch (e: any) {
      setKeyErr(e.message);
    }
  }
  function toggleScope(s: string) {
    setScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  const badge = (m: string, lg = false): CSSProperties => {
    const colors: Record<string, string> = { GET: "#2ECC71", POST: VIOLET, WEBHOOK: "#F39C12" };
    return { background: colors[m] ?? VIOLET, color: "#fff", padding: lg ? "4px 12px" : "3px 8px", borderRadius: 6, fontSize: lg ? 13 : 11, fontWeight: 700 };
  };

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "56px 32px 80px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 8px" }}>Portail développeur</h1>
      <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", margin: "0 0 28px" }}>Intégrez la collecte de fonds Sungku dans votre propre plateforme.</p>

      {/* Partner account + API keys */}
      <div style={{ ...card, padding: 24, marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 16px" }}>Compte partenaire</h2>
        {!partner ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, alignItems: "end" }}>
            <div><label style={label}>Organisation</label><input value={reg.orgName} onChange={(e) => setReg({ ...reg, orgName: e.target.value })} placeholder="Nom de l'organisation" style={field} /></div>
            <div><label style={label}>Contact technique</label><input value={reg.contactName} onChange={(e) => setReg({ ...reg, contactName: e.target.value })} placeholder="Nom du contact" style={field} /></div>
            <div><label style={label}>E-mail</label><input value={reg.contactEmail} onChange={(e) => setReg({ ...reg, contactEmail: e.target.value })} placeholder="contact@org.cm" style={field} /></div>
            <button onClick={registerPartner} style={{ ...violetBtn, padding: 14, fontSize: 14 }}>Créer le compte partenaire</button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", margin: "0 0 16px" }}>
              {partner.orgName} · Statut : <strong style={{ color: partner.status === "APPROVED" ? "#2ECC71" : "#F39C12" }}>{partner.status === "APPROVED" ? "Validé" : "En attente de validation"}</strong>
              {partner.status !== "APPROVED" && <span style={{ color: "rgba(255,255,255,0.45)" }}> (clés sandbox disponibles ; production après validation back office)</span>}
            </p>
            <p style={{ ...label, marginBottom: 10 }}>Scopes accordés</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {ALL_SCOPES.map((s) => (
                <button key={s} onClick={() => toggleScope(s)} style={{ ...smBtn(scopes.includes(s)), padding: "8px 14px", borderRadius: 999, fontFamily: "monospace" }}>{s}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => generateKey("sandbox")} style={{ ...violetBtn, padding: "12px 18px", fontSize: 13 }}>Générer une clé sandbox</button>
              <button onClick={() => generateKey("production")} style={{ ...ghostBtn, padding: "12px 18px", fontSize: 13 }}>Générer une clé production</button>
            </div>
            {keyErr && <p style={{ color: "#E74C3C", fontSize: 13, marginTop: 10 }}>{keyErr}</p>}
            {generatedKey && (
              <div style={{ background: "#000", border: "1px solid rgba(101,77,223,0.4)", borderRadius: 12, padding: 16, marginTop: 16 }}>
                <p style={{ fontSize: 12, color: "#F39C12", margin: "0 0 8px" }}>Copiez le secret maintenant, il ne sera plus affiché.</p>
                <p style={{ fontFamily: "monospace", fontSize: 13, margin: "0 0 4px" }}>X-Api-Key : {generatedKey.keyId}</p>
                <p style={{ fontFamily: "monospace", fontSize: 13, margin: 0, wordBreak: "break-all" }}>X-Api-Secret : {generatedKey.secret}</p>
              </div>
            )}
            {partner.apiKeys && partner.apiKeys.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p style={{ ...label, marginBottom: 8 }}>Clés existantes</p>
                {partner.apiKeys.map((k: any) => (
                  <p key={k.id} style={{ fontFamily: "monospace", fontSize: 12, color: "rgba(255,255,255,0.6)", margin: "0 0 4px" }}>{k.keyId} · {k.env} · [{k.scopes}]{k.revoked ? " · révoquée" : ""}</p>
                ))}
              </div>
            )}
          </div>
        )}
        {regErr && <p style={{ color: "#E74C3C", fontSize: 13, marginTop: 10 }}>{regErr}</p>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24, alignItems: "start", marginBottom: 56 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {ENDPOINTS.map((ep, i) => (
            <button key={i} onClick={() => setSel(i)} style={{ textAlign: "left", padding: "12px 14px", borderRadius: 12, cursor: "pointer", background: sel === i ? "rgba(101,77,223,0.15)" : "transparent", border: sel === i ? "1px solid rgba(101,77,223,0.4)" : BORDER, color: "#fff" }}>
              <span style={badge(ep.method)}>{ep.method}</span>
              <span style={{ display: "block", fontSize: 12, marginTop: 4, fontFamily: "monospace", color: "rgba(255,255,255,0.75)" }}>{ep.path}</span>
            </button>
          ))}
        </div>
        <div style={{ ...card, padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={badge(endpoint.method, true)}>{endpoint.method}</span>
            <span style={{ fontFamily: "monospace", fontSize: 15 }}>{endpoint.path}</span>
          </div>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", margin: "0 0 20px" }}>{endpoint.desc}</p>
          {endpoint.req && (
            <>
              <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Requête</p>
              <pre style={{ background: "#000", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 16, fontSize: 13, overflow: "auto", margin: "0 0 20px", color: "#D8D2F5" }}>{endpoint.req}</pre>
            </>
          )}
          <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Réponse</p>
          <pre style={{ background: "#000", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 16, fontSize: 13, overflow: "auto", margin: 0, color: "#D8D2F5" }}>{endpoint.res}</pre>
        </div>
      </div>

      <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 20px" }}>Widgets et SDK embarquables</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20, marginBottom: 40 }}>
        <div style={{ ...card, borderRadius: 18, padding: 22 }}>
          <p style={{ fontWeight: 700, fontSize: 15, margin: "0 0 10px" }}>Bouton de contribution</p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: "0 0 16px" }}>Un bouton « Contribuer via Sungku » à intégrer sur n'importe quelle page.</p>
          <button style={{ ...violetBtn, padding: "10px 20px", fontSize: 13 }}>Contribuer via Sungku</button>
        </div>
        <div style={{ ...card, borderRadius: 18, padding: 22 }}>
          <p style={{ fontWeight: 700, fontSize: 15, margin: "0 0 10px" }}>Jauge embarquable</p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: "0 0 16px" }}>Web component ou iframe reprenant la charte Sungku.</p>
          <Gauge raised={67} goal={100} />
        </div>
        <div style={{ ...card, borderRadius: 18, padding: 22 }}>
          <p style={{ fontWeight: 700, fontSize: 15, margin: "0 0 10px" }}>SDK mobile (Android/iOS)</p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: 0 }}>Pour proposer la contribution en tap NFC dans les applications partenaires.</p>
        </div>
      </div>

      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", maxWidth: 760, lineHeight: 1.6 }}>
        Sécurité : OAuth 2.0 ou clé API + secret, scopes par partenaire, signature HMAC sur chaque webhook, limitation de débit, cloisonnement sandbox/production et journalisation complète (conformité BEAC/COBAC).
      </p>
    </div>
  );
}

// ─── Info pages (footer) ──────────────────────────────────────────────────────

const INFO_CONTENT: Record<string, { title: string; intro: string; sections: { h: string; p: string }[]; cta?: { label: string; to: View } }> = {
  how: {
    title: "Comment ça marche",
    intro: "Collecter ou soutenir une cause sur Sungku prend quelques minutes.",
    sections: [
      { h: "1. Créez votre compte", p: "Inscrivez vous avec votre nom et votre e-mail. Un code de vérification vous est envoyé par e-mail pour valider votre compte." },
      { h: "2. Lancez votre campagne", p: "Renseignez le titre, la description, la catégorie, le montant cible, l'échéance et une image de couverture. Un lien de partage, un QR code et un code USSD sont générés automatiquement." },
      { h: "3. Partagez et collectez", p: "Diffusez votre campagne sur WhatsApp et les réseaux sociaux. Vos contributeurs paient en Mobile Money, carte bancaire, tap NFC ou QR code, depuis le Cameroun ou la diaspora." },
      { h: "4. Retirez vos fonds", p: "Suivez vos contributions en temps réel sur le tableau de bord, puis demandez un retrait vers votre portefeuille Sungku ou votre compte Mobile Money, avec une double validation par code." },
    ],
    cta: { label: "Créer une campagne", to: "create" },
  },
  help: {
    title: "Centre d'aide",
    intro: "Les réponses aux questions les plus fréquentes sur Sungku.",
    sections: [
      { h: "Comment contribuer à une campagne ?", p: "Ouvrez la page de la campagne, choisissez un montant et un moyen de paiement (Mobile Money, carte, NFC ou QR code), puis validez. Vous recevez une confirmation immédiate." },
      { h: "Comment sont sécurisés les paiements ?", p: "Les paiements sont traités par un prestataire agréé. Aucune donnée bancaire brute n'est stockée sur la plateforme et chaque transaction est journalisée." },
      { h: "Quand puis je retirer les fonds ?", p: "Une fois votre identité vérifiée (KYC), vous pouvez demander un retrait à tout moment. Une double validation par code protège chaque demande." },
      { h: "Que faire en cas de problème ?", p: "Utilisez la page Nous contacter ou signalez une campagne suspecte depuis sa page publique." },
    ],
  },
  report: {
    title: "Signaler une campagne",
    intro: "Aidez nous à garder Sungku fiable en signalant tout contenu suspect.",
    sections: [
      { h: "Quand signaler ?", p: "Signalez une campagne si vous suspectez une fraude, une usurpation d'identité, un contenu trompeur ou une collecte pour une cause illégale." },
      { h: "Que se passe t il ensuite ?", p: "Notre équipe de modération examine chaque signalement. Les campagnes des catégories sensibles (santé, funérailles) font l'objet d'une validation renforcée." },
      { h: "Comment signaler ?", p: "Écrivez à moderation@sungku.cm en précisant le lien de la campagne et le motif du signalement." },
    ],
  },
  cobac: {
    title: "Conformité COBAC",
    intro: "Sungku opère dans le respect de la réglementation financière de la zone CEMAC.",
    sections: [
      { h: "Cadre réglementaire", p: "La plateforme s'inscrit dans le cadre défini par la BEAC et la COBAC pour les services de paiement et les transferts, y compris transfrontaliers pour la diaspora." },
      { h: "Vérification d'identité (KYC)", p: "Une vérification allégée est requise dès la création d'un compte organisateur, renforcée par pièce d'identité au delà d'un certain montant collecté ou pour les catégories sensibles." },
      { h: "Traçabilité", p: "Chaque contribution et chaque retrait sont journalisés et exportables, pour assurer la transparence exigée des associations, écoles et églises." },
    ],
  },
  press: {
    title: "Presse et médias",
    intro: "Ressources pour les journalistes et partenaires médias.",
    sections: [
      { h: "À propos de Sungku", p: "Sungku est une plateforme camerounaise de collecte de fonds qui permet à tous de créer et soutenir des campagnes en Mobile Money, carte, NFC et QR code." },
      { h: "Kit média", p: "Logos, visuels et éléments de charte sont disponibles sur demande à presse@sungku.cm." },
      { h: "Contact presse", p: "Pour toute demande d'interview ou d'information, écrivez à presse@sungku.cm." },
    ],
  },
  contact: {
    title: "Nous contacter",
    intro: "Notre équipe est à votre écoute.",
    sections: [
      { h: "Support général", p: "support@sungku.cm" },
      { h: "Modération et signalements", p: "moderation@sungku.cm" },
      { h: "Partenariats et API", p: "partenaires@sungku.cm" },
      { h: "Presse", p: "presse@sungku.cm" },
    ],
  },
};

// ─── Auth modal (register / login with email OTP) ─────────────────────────────

function AuthModal({ onClose, onAuthed }: { onClose: () => void; onAuthed: (token: string, user: AuthUser) => void }) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendForm() {
    setErr(null);
    setBusy(true);
    try {
      const r =
        mode === "register"
          ? await api.post("/auth/register", { name, email, phone })
          : await api.post("/auth/login", { email });
      const base = mode === "register" ? "Un code de vérification a été envoyé à votre e-mail." : "Un code de connexion a été envoyé à votre e-mail.";
      // devCode is present in dev, or in prod when OTP_EXPOSE=true (e-mail fallback).
      setInfo(r.devCode ? `${base} Votre code : ${r.devCode}` : base);
      setStep("otp");
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  }

  async function verify() {
    setErr(null);
    setBusy(true);
    try {
      const path = mode === "register" ? "/auth/verify-otp" : "/auth/login/verify";
      const r = await api.post(path, { email, code });
      onAuthed(r.token, r.user);
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  }

  const input: CSSProperties = { width: "100%", boxSizing: "border-box", background: "#000", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "13px 16px", borderRadius: 12, fontSize: 14, marginBottom: 12 };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, borderRadius: 24, padding: 32, width: 420, maxWidth: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{mode === "register" ? "Créer un compte" : "Se connecter"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", margin: "0 0 22px" }}>
          {step === "form" ? "Vérification par code envoyé sur votre e-mail." : `Saisissez le code envoyé à ${email}.`}
        </p>

        {step === "form" ? (
          <>
            {mode === "register" && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom complet" style={input} />}
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Adresse e-mail" type="email" style={input} />
            {mode === "register" && <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Téléphone (optionnel)" style={input} />}
            <button onClick={sendForm} disabled={busy} style={{ ...violetBtn, width: "100%", padding: 15, fontSize: 15, marginTop: 4, opacity: busy ? 0.6 : 1 }}>{busy ? "Envoi…" : "Recevoir le code"}</button>
          </>
        ) : (
          <>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code à 6 chiffres" style={{ ...input, letterSpacing: 8, textAlign: "center", fontSize: 20 }} />
            <button onClick={verify} disabled={busy} style={{ ...violetBtn, width: "100%", padding: 15, fontSize: 15, opacity: busy ? 0.6 : 1 }}>{busy ? "Vérification…" : "Valider"}</button>
            <button onClick={() => { setStep("form"); setCode(""); setInfo(null); }} style={{ ...ghostBtn, width: "100%", boxSizing: "border-box", padding: 12, fontSize: 13, marginTop: 8 }}>Modifier l'e-mail</button>
          </>
        )}

        {info && <p style={{ color: "#B4A8F5", fontSize: 13, marginTop: 14 }}>{info}</p>}
        {err && <p style={{ color: "#E74C3C", fontSize: 13, marginTop: 14 }}>{err}</p>}

        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center", marginTop: 20 }}>
          {mode === "register" ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
          <button onClick={() => { setMode(mode === "register" ? "login" : "register"); setStep("form"); setErr(null); setInfo(null); }} style={{ background: "none", border: "none", color: "#B4A8F5", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
            {mode === "register" ? "Se connecter" : "Créer un compte"}
          </button>
        </p>
      </div>
    </div>
  );
}

function InfoPage({ page, onNav }: { page: View; onNav: (v: View) => void }) {
  const c = INFO_CONTENT[page];
  if (!c) return null;
  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "56px 32px 80px" }}>
      <button onClick={() => onNav("home")} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.55)", fontSize: 14, cursor: "pointer", padding: 0, marginBottom: 24 }}>← Retour à l'accueil</button>
      <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 10px" }}>{c.title}</h1>
      <p style={{ fontSize: 17, color: "rgba(255,255,255,0.6)", margin: "0 0 36px" }}>{c.intro}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {c.sections.map((s) => (
          <div key={s.h} style={{ ...card, padding: 22 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 8px" }}>{s.h}</h3>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", margin: 0, lineHeight: 1.6 }}>{s.p}</p>
          </div>
        ))}
      </div>
      {c.cta && (
        <button onClick={() => onNav(c.cta!.to)} style={{ ...violetBtn, padding: "14px 26px", fontSize: 15, marginTop: 28 }}>{c.cta.label}</button>
      )}
    </div>
  );
}

// ─── Admin back office ────────────────────────────────────────────────────────

const CAT_LABEL: Record<string, string> = {
  SANTE: "Santé", FUNERAILLES: "Funérailles", PROJET_COMMUNAUTAIRE: "Projet communautaire",
  EDUCATION: "Éducation", ENTREPRISE: "Entreprise", TONTINE: "Tontine",
};

function AdminBackOffice({ user, token, onRequireAuth }: { user: AuthUser | null; token: string | null; onRequireAuth: () => void }) {
  const [tab, setTab] = useState<"overview" | "campaigns" | "partners" | "reports" | "fees">("overview");
  const [stats, setStats] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [fees, setFees] = useState<Record<string, number>>({});

  async function loadAll() {
    if (!token) return;
    const [s, c, p, r, f] = await Promise.all([
      api.get("/admin/stats", token),
      api.get("/admin/campaigns", token),
      api.get("/admin/partners", token),
      api.get("/admin/reports", token),
      api.get("/admin/fees", token),
    ]);
    setStats(s); setCampaigns(c); setPartners(p); setReports(r); setFees(f);
  }
  useEffect(() => { if (user?.isAdmin) loadAll(); }, [user, token]);

  async function moderate(id: string, status: string) {
    await api.post(`/admin/campaigns/${id}/moderate`, { status }, token || undefined);
    loadAll();
  }
  async function removeCampaign(id: string, title: string) {
    if (typeof window !== "undefined" && !window.confirm(`Supprimer définitivement « ${title} » ?`)) return;
    await api.del(`/admin/campaigns/${id}`, token || undefined);
    loadAll();
  }
  async function setPartnerStatus(id: string, status: string) {
    await api.post(`/admin/partners/${id}/status`, { status }, token || undefined);
    loadAll();
  }
  async function setReportStatus(id: string, status: string) {
    await api.post(`/admin/reports/${id}/status`, { status }, token || undefined);
    loadAll();
  }
  async function saveFees() {
    await api.put("/admin/fees", fees, token || undefined);
    loadAll();
  }

  if (!user?.isAdmin) {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "80px 32px", textAlign: "center" }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 12px" }}>Back office</h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", margin: "0 0 28px" }}>
          Espace réservé aux administrateurs de la plateforme.
        </p>
        {!user && <button onClick={onRequireAuth} style={{ ...violetBtn, padding: "14px 26px", fontSize: 15 }}>Se connecter</button>}
      </div>
    );
  }

  const tabBtn = (t: string): CSSProperties => ({
    background: tab === t ? "#fff" : "transparent", color: tab === t ? "#000" : "rgba(255,255,255,0.7)",
    border: tab === t ? "1px solid #fff" : "1px solid rgba(255,255,255,0.15)", padding: "9px 16px",
    borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer",
  });
  const modColor = (s: string) => (s === "APPROVED" ? "#2ECC71" : s === "REJECTED" ? "#E74C3C" : "#F39C12");
  const modLabel = (s: string) => (s === "APPROVED" ? "Approuvée" : s === "REJECTED" ? "Rejetée" : "En attente");

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "56px 32px 80px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 8px" }}>Back office</h1>
      <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", margin: "0 0 28px" }}>Gestion globale de la plateforme Sungku.</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
        {[["overview", "Vue d'ensemble"], ["campaigns", "Modération"], ["partners", "Partenaires"], ["reports", "Signalements"], ["fees", "Frais"]].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t as any)} style={tabBtn(t)}>{l}</button>
        ))}
      </div>

      {tab === "overview" && stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16 }}>
          {[
            ["Campagnes", stats.campaigns], ["Comptes", stats.users], ["Partenaires", stats.partners],
            ["Total collecté", `${fmt(stats.totalRaised)} ${CURRENCY}`], ["Contributions", stats.contributions],
            ["En modération", stats.pendingModeration], ["Signalements ouverts", stats.openReports],
          ].map(([l, v]) => (
            <div key={l as string} style={{ ...card, borderRadius: 16, padding: 22 }}>
              <p style={{ margin: "0 0 6px", fontSize: 13, color: "rgba(255,255,255,0.45)" }}>{l}</p>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{v}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "campaigns" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {campaigns.length === 0 && <p style={{ color: "rgba(255,255,255,0.5)" }}>Aucune campagne.</p>}
          {campaigns.map((c) => (
            <div key={c.id} style={{ ...card, padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ minWidth: 240, flex: 1 }}>
                <p style={{ margin: "0 0 4px", fontWeight: 700 }}>{c.title}</p>
                <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                  {CAT_LABEL[c.category] || c.category} · {c.organizer?.email || "sans organisateur"} · {fmt(c.raised)}/{fmt(c.targetAmount)} {CURRENCY}
                  {c.openReports > 0 && <span style={{ color: "#E74C3C" }}> · {c.openReports} signalement(s)</span>}
                </p>
              </div>
              <span style={{ color: modColor(c.moderationStatus), fontWeight: 700, fontSize: 13 }}>{modLabel(c.moderationStatus)}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => moderate(c.id, "APPROVED")} style={{ background: "#fff", color: "#000", border: "none", padding: "8px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Approuver</button>
                <button onClick={() => moderate(c.id, "REJECTED")} style={{ ...ghostBtn, padding: "8px 14px", fontSize: 12 }}>Rejeter</button>
                <button onClick={() => removeCampaign(c.id, c.title)} style={{ background: "rgba(231,76,60,0.15)", border: "1px solid rgba(231,76,60,0.5)", color: "#E74C3C", padding: "8px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "partners" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {partners.length === 0 && <p style={{ color: "rgba(255,255,255,0.5)" }}>Aucun partenaire.</p>}
          {partners.map((p) => (
            <div key={p.id} style={{ ...card, padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ minWidth: 240, flex: 1 }}>
                <p style={{ margin: "0 0 4px", fontWeight: 700 }}>{p.orgName}</p>
                <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{p.contactName} · {p.contactEmail} · {p.apiKeys?.length || 0} clé(s)</p>
              </div>
              <span style={{ color: p.status === "APPROVED" ? "#2ECC71" : p.status === "REJECTED" ? "#E74C3C" : "#F39C12", fontWeight: 700, fontSize: 13 }}>
                {p.status === "APPROVED" ? "Validé" : p.status === "REJECTED" ? "Rejeté" : "En attente"}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setPartnerStatus(p.id, "APPROVED")} style={{ background: "#fff", color: "#000", border: "none", padding: "8px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Valider</button>
                <button onClick={() => setPartnerStatus(p.id, "REJECTED")} style={{ ...ghostBtn, padding: "8px 14px", fontSize: 12 }}>Rejeter</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "reports" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {reports.length === 0 && <p style={{ color: "rgba(255,255,255,0.5)" }}>Aucun signalement.</p>}
          {reports.map((r) => (
            <div key={r.id} style={{ ...card, padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ minWidth: 240, flex: 1 }}>
                <p style={{ margin: "0 0 4px", fontWeight: 700 }}>{r.campaign?.title || "Campagne supprimée"}</p>
                <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{r.reason}{r.reporterEmail ? ` · ${r.reporterEmail}` : ""}</p>
              </div>
              <span style={{ color: r.status === "OPEN" ? "#F39C12" : "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: 13 }}>{r.status}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setReportStatus(r.id, "RESOLVED")} style={{ background: "#fff", color: "#000", border: "none", padding: "8px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Résolu</button>
                <button onClick={() => setReportStatus(r.id, "DISMISSED")} style={{ ...ghostBtn, padding: "8px 14px", fontSize: 12 }}>Rejeter</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "fees" && (
        <div style={{ ...card, padding: 24, maxWidth: 520 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 6px" }}>Frais de plateforme par catégorie (%)</h3>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "0 0 18px" }}>Appliqués sur les montants collectés lors des retraits.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.keys(fees).map((k) => (
              <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontSize: 14 }}>{CAT_LABEL[k] || k}</span>
                <input type="number" step="0.1" value={fees[k]} onChange={(e) => setFees({ ...fees, [k]: parseFloat(e.target.value) || 0 })}
                  style={{ width: 100, boxSizing: "border-box", background: "#000", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "10px 14px", borderRadius: 10, fontSize: 14 }} />
              </div>
            ))}
          </div>
          <button onClick={saveFees} style={{ ...violetBtn, padding: "12px 20px", fontSize: 14, marginTop: 18 }}>Enregistrer les frais</button>
        </div>
      )}
    </div>
  );
}
