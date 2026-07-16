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
};

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

function ImgSlot({ h, label: text }: { h: number; label: string }) {
  return (
    <div style={{ height: h, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,rgba(101,77,223,0.35),rgba(101,77,223,0.08))", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
      {text}
    </div>
  );
}

type View = "home" | "campaign" | "create" | "dashboard" | "dev";

export default function SungkuApp() {
  const [view, setView] = useState<View>("home");
  const [live, setLive] = useState<Campaign[]>([]);

  async function refresh() {
    try {
      setLive(await api.list());
    } catch {
      /* API offline — demo only */
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  const campaigns = [...live, ...DEMO_CAMPAIGNS];

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
            <button onClick={() => setView("dashboard")} style={navBtn("dashboard")}>Tableau de bord</button>
            <button onClick={() => setView("dev")} style={navBtn("dev")}>Développeurs</button>
          </div>
          <button style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", padding: "10px 20px", borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Se connecter</button>
        </div>
      </div>

      {view === "home" && <Home campaigns={campaigns} onOpen={openCampaign} onCreate={() => setView("create")} />}
      {view === "campaign" && selected && <CampaignView campaign={selected} onBack={() => setView("home")} onContributed={refresh} />}
      {view === "create" && <Create onDone={refresh} goDashboard={() => setView("dashboard")} />}
      {view === "dashboard" && <Dashboard campaign={selected ?? campaigns[0]} />}
      {view === "dev" && <DevPortal />}
    </div>
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
          Créez ou soutenez une campagne — santé, funérailles, projets communautaires, éducation ou tontine — en Mobile Money, tap NFC, QR code ou carte, depuis le Cameroun ou la diaspora.
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 24 }}>
        {filtered.map((c) => (
          <div key={c.id} onClick={() => onOpen(c)} style={{ cursor: "pointer", ...card, overflow: "hidden" }}>
            <ImgSlot h={160} label="Photo de la campagne" />
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
            <ImgSlot h={380} label="Photo principale de la campagne" />
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

function Create({ onDone, goDashboard }: { onDone: () => void; goDashboard: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", category: "Santé", goal: "", deadline: "", beneficiary: "", visibility: "Publique", isTontine: false });
  const [contributorRows, setContributorRows] = useState<string[]>([""]);
  const [created, setCreated] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const goalNum = parseInt(String(form.goal).replace(/\s/g, "")) || 0;

  async function submit() {
    setErr(null);
    if (!form.title || !form.description || !goalNum || !form.beneficiary) {
      setErr("Titre, description, montant cible et bénéficiaire sont requis.");
      return;
    }
    try {
      await api.create({
        title: form.title,
        description: form.description,
        category: CAT_LABEL_TO_ENUM[form.category] ?? "PROJET_COMMUNAUTAIRE",
        targetAmount: goalNum,
        deadline: form.deadline || undefined,
        beneficiary: form.beneficiary,
        visibility: form.visibility === "Privée" ? "PRIVEE" : "PUBLIQUE",
        isTontine: form.isTontine,
      });
      onDone();
      setCreated(true);
    } catch {
      setErr("Impossible de créer la campagne — vérifiez que l'API est démarrée.");
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
              <div style={{ borderRadius: 16, overflow: "hidden" }}><ImgSlot h={180} label="Ajouter une image" /></div>
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

function Dashboard({ campaign }: { campaign: Campaign }) {
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawDest, setWithdrawDest] = useState("mobile_money");
  const [requested, setRequested] = useState(false);
  const [queue, setQueue] = useState([
    { title: "Aide médicale urgente — Bertoua", reason: "Catégorie sensible (santé)", status: "En attente" },
    { title: "Collecte funérailles — Ebolowa", reason: "Signalement utilisateur", status: "En attente" },
  ]);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "56px 32px 80px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 8px" }}>Tableau de bord organisateur</h1>
      <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", margin: "0 0 36px" }}>{campaign.title}</p>

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
          {requested ? (
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)" }}>Demande de retrait de {withdrawAmount} {CURRENCY} envoyée. Traitement sous 24h.</p>
          ) : (
            <>
              {showWithdraw && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                  <input value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Montant (FCFA)" style={{ boxSizing: "border-box", background: "#000", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "12px 14px", borderRadius: 10, fontSize: 14 }} />
                  <select value={withdrawDest} onChange={(e) => setWithdrawDest(e.target.value)} style={{ boxSizing: "border-box", background: "#000", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "12px 14px", borderRadius: 10, fontSize: 14 }}>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="wallet">Portefeuille Sungku</option>
                  </select>
                  <button onClick={() => setRequested(true)} style={{ ...violetBtn, padding: 12, fontSize: 14 }}>Confirmer le retrait</button>
                </div>
              )}
              <button onClick={() => setShowWithdraw((s) => !s)} style={{ width: "100%", boxSizing: "border-box", ...ghostBtn, padding: 12, fontSize: 14 }}>{showWithdraw ? "Annuler" : "Demander un retrait"}</button>
            </>
          )}

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

function DevPortal() {
  const [env, setEnv] = useState("Sandbox");
  const [sel, setSel] = useState(0);
  const endpoint = ENDPOINTS[sel];
  const apiKey = env === "Sandbox" ? "sk_sandbox_8f21a…4c7d" : "sk_live_a93f…21bc";

  const badge = (m: string, lg = false): CSSProperties => {
    const colors: Record<string, string> = { GET: "#2ECC71", POST: VIOLET, WEBHOOK: "#F39C12" };
    return { background: colors[m] ?? VIOLET, color: "#fff", padding: lg ? "4px 12px" : "3px 8px", borderRadius: 6, fontSize: lg ? 13 : 11, fontWeight: 700 };
  };

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "56px 32px 80px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 8px" }}>Portail développeur</h1>
      <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", margin: "0 0 28px" }}>Intégrez la collecte de fonds Sungku dans votre propre plateforme.</p>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {["Sandbox", "Production"].map((e) => (
            <button key={e} onClick={() => setEnv(e)} style={{ ...smBtn(env === e), padding: "10px 16px", borderRadius: 999 }}>{e}</button>
          ))}
        </div>
        <span style={{ background: CARD, border: "1px solid rgba(255,255,255,0.1)", padding: "10px 16px", borderRadius: 10, fontFamily: "monospace", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{apiKey}</span>
        <button style={{ ...ghostBtn, padding: "9px 16px", fontSize: 13 }}>Régénérer</button>
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
