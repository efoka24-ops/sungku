"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search, Plus, Heart, Share2, Clock, Users, ChevronRight,
  ArrowLeft, QrCode, Smartphone, CreditCard, Wifi, Download,
  TrendingUp, Bell, Settings, LogOut, Eye, BarChart3, Wallet,
  CheckCircle, X, Menu, Globe, Lock, Filter, ChevronDown,
  Copy, MessageCircle, Send
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────────────

type Screen = "home" | "campaign" | "create" | "contribute" | "dashboard" | "mockups";

interface Campaign {
  id: string;
  slug?: string;
  title: string;
  category: string;
  organizer: string;
  avatar: string;
  image: string;
  raised: number;
  goal: number;
  contributors: number;
  daysLeft: number | null;
  urgent: boolean;
  description: string;
}

// ─── Data ───────────────────────────────────────────────────────────────────

const CATEGORIES = ["Tous", "Santé", "Funérailles", "Communautaire", "Éducation", "Entreprise", "Tontine"];

const CAMPAIGNS: Campaign[] = [
  {
    id: "1",
    title: "Opération chirurgicale de Mama Ngono",
    category: "Santé",
    organizer: "Jean-Paul Mbarga",
    avatar: "JM",
    image: "https://images.unsplash.com/photo-1584515933487-779824d29309?w=600&h=400&fit=crop&auto=format",
    raised: 1_850_000,
    goal: 3_500_000,
    contributors: 142,
    daysLeft: 8,
    urgent: true,
    description: "Mama Ngono, 58 ans, souffre d'une pathologie cardiaque nécessitant une intervention urgente. Les frais médicaux dépassent les capacités de la famille.",
  },
  {
    id: "2",
    title: "École primaire de Mbalmayo — toiture",
    category: "Éducation",
    organizer: "Association APE Mbalmayo",
    avatar: "AP",
    image: "https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=600&h=400&fit=crop&auto=format",
    raised: 980_000,
    goal: 2_000_000,
    contributors: 87,
    daysLeft: 21,
    urgent: false,
    description: "La salle de classe principale n'a plus de toiture après les pluies de mars. 340 élèves étudient en plein air. Aidez-nous à réparer avant la rentrée.",
  },
  {
    id: "3",
    title: "Funérailles de Papa Célestin Fouda",
    category: "Funérailles",
    organizer: "Famille Fouda",
    avatar: "FF",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop&auto=format",
    raised: 450_000,
    goal: 800_000,
    contributors: 63,
    daysLeft: 3,
    urgent: true,
    description: "Notre père nous a quittés le 14 juillet. Nous sollicitons votre soutien pour lui offrir des obsèques dignes de sa mémoire.",
  },
  {
    id: "4",
    title: "Lancement boulangerie artisanale — Yaoundé",
    category: "Entreprise",
    organizer: "Christelle Ateba",
    avatar: "CA",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&h=400&fit=crop&auto=format",
    raised: 620_000,
    goal: 1_500_000,
    contributors: 44,
    daysLeft: 30,
    urgent: false,
    description: "Après 5 ans de formation en pâtisserie à Douala, je lance ma propre boulangerie artisanale à Yaoundé. Je cherche des co-investisseurs croyant en ce projet.",
  },
  {
    id: "5",
    title: "Tontine Mbetsi 2025 — Cycle II",
    category: "Tontine",
    organizer: "Groupe Mbetsi",
    avatar: "GM",
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop&auto=format",
    raised: 2_400_000,
    goal: 3_000_000,
    contributors: 12,
    daysLeft: null,
    urgent: false,
    description: "Cycle de tontine mensuelle pour les membres du groupe Mbetsi. Accès réservé aux membres identifiés. Contribution mensuelle : 200 000 FCFA.",
  },
  {
    id: "6",
    title: "Forage eau potable — Village Nkolbisson",
    category: "Communautaire",
    organizer: "Chefferie Nkolbisson",
    avatar: "CN",
    image: "https://images.unsplash.com/photo-1541544537156-7627a7a4aa1c?w=600&h=400&fit=crop&auto=format",
    raised: 3_100_000,
    goal: 5_000_000,
    contributors: 231,
    daysLeft: 45,
    urgent: false,
    description: "Le village de Nkolbisson manque d'eau potable depuis 3 ans. Un forage permettrait de desservir 1 200 habitants. Chaque contribution compte.",
  },
];

// ─── API wiring (live backend) ────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Backend category enum <-> French label used by the design
const CAT_ENUM_TO_LABEL: Record<string, string> = {
  SANTE: "Santé",
  FUNERAILLES: "Funérailles",
  PROJET_COMMUNAUTAIRE: "Communautaire",
  EDUCATION: "Éducation",
  ENTREPRISE: "Entreprise",
  TONTINE: "Tontine",
};
const CAT_LABEL_TO_ENUM: Record<string, string> = Object.fromEntries(
  Object.entries(CAT_ENUM_TO_LABEL).map(([k, v]) => [v, k])
);
const CHANNEL_LABEL_TO_ENUM: Record<string, string> = {
  orange: "ORANGE_MONEY",
  mtn: "MTN_MOMO",
  card: "CARTE",
  nfc: "NFC",
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&h=400&fit=crop&auto=format";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Map a backend campaign record into the design's Campaign shape
function mapCampaign(r: any): Campaign {
  const label = CAT_ENUM_TO_LABEL[r.category] ?? r.category;
  const daysLeft = r.deadline
    ? Math.max(0, Math.ceil((new Date(r.deadline).getTime() - Date.now()) / 86400000))
    : null;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    category: label,
    organizer: r.beneficiary,
    avatar: initials(r.beneficiary || r.title),
    image: r.coverImage || FALLBACK_IMAGE,
    raised: r.collectedAmount ?? 0,
    goal: r.targetAmount,
    contributors: r.contributorCount ?? 0,
    daysLeft,
    urgent: r.category === "SANTE" || r.category === "FUNERAILLES",
    description: r.description,
  };
}

const apiClient = {
  async list(): Promise<Campaign[]> {
    const res = await fetch(`${API_BASE}/campaigns`, { cache: "no-store" });
    if (!res.ok) throw new Error("list failed");
    return (await res.json()).map(mapCampaign);
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
  async contribute(campaignId: string, payload: any) {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("contribute failed");
    return res.json();
  },
};

const CHART_DATA = [
  { day: "1 Juil", amount: 120000 },
  { day: "3 Juil", amount: 280000 },
  { day: "5 Juil", amount: 410000 },
  { day: "7 Juil", amount: 390000 },
  { day: "9 Juil", amount: 620000 },
  { day: "11 Juil", amount: 850000 },
  { day: "13 Juil", amount: 980000 },
  { day: "15 Juil", amount: 1200000 },
  { day: "16 Juil", amount: 1850000 },
];

const CONTRIBUTORS = [
  { name: "Alvine K.", amount: 50000, message: "Bon courage à toute la famille !", time: "Il y a 2h" },
  { name: "Anonyme", amount: 25000, message: "", time: "Il y a 4h" },
  { name: "Roger Essomba", amount: 100000, message: "Mama Ngono est une femme exceptionnelle.", time: "Il y a 6h" },
  { name: "Diaspora Paris", amount: 150000, message: "Solidarité depuis la France 🙏", time: "Il y a 8h" },
  { name: "Anonyme", amount: 10000, message: "", time: "Il y a 10h" },
];

// ─── Pill Gauge ──────────────────────────────────────────────────────────────

function PillGauge({ raised, goal, size = "md" }: { raised: number; goal: number; size?: "sm" | "md" | "lg" }) {
  const pct = Math.min((raised / goal) * 100, 100);
  const heights = { sm: "h-2", md: "h-3", lg: "h-4" };
  return (
    <div className={`w-full ${heights[size]} rounded-full bg-white/10 overflow-hidden`}>
      <div
        className="h-full rounded-full bg-white transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Category Badge ───────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  "Santé": "bg-[#E74C3C]/20 text-[#E74C3C]",
  "Funérailles": "bg-white/10 text-white/70",
  "Communautaire": "bg-[#2ECC71]/20 text-[#2ECC71]",
  "Éducation": "bg-[#3498DB]/20 text-[#3498DB]",
  "Entreprise": "bg-[#F39C12]/20 text-[#F39C12]",
  "Tontine": "bg-[#654DDF]/30 text-[#a08fff]",
};

function CategoryBadge({ cat }: { cat: string }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[cat] ?? "bg-white/10 text-white/70"}`}>
      {cat}
    </span>
  );
}

// ─── Format currency ─────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("fr-CM", { maximumFractionDigits: 0 }).format(n) + " FCFA";
}

// ─── Campaign Card ────────────────────────────────────────────────────────────

function CampaignCard({ campaign, onClick }: { campaign: Campaign; onClick: () => void }) {
  const pct = Math.round((campaign.raised / campaign.goal) * 100);
  return (
    <button
      onClick={onClick}
      className="group text-left bg-card rounded-2xl overflow-hidden border border-border hover:border-[#654DDF]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#654DDF]/10 focus:outline-none"
    >
      <div className="relative h-44 overflow-hidden bg-[#654DDF]/20">
        <img
          src={campaign.image}
          alt={campaign.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {campaign.urgent && (
          <div className="absolute top-3 left-3 bg-[#E74C3C] text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
            URGENT
          </div>
        )}
        <div className="absolute top-3 right-3">
          <CategoryBadge cat={campaign.category} />
        </div>
      </div>
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2">{campaign.title}</h3>
        <div className="space-y-2">
          <div className="bg-[#654DDF] rounded-full p-1">
            <PillGauge raised={campaign.raised} goal={campaign.goal} size="sm" />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white font-bold text-sm">{pct}%</span>
            <span className="text-muted-foreground text-xs">{fmt(campaign.goal)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-muted-foreground text-xs">
            <span className="flex items-center gap-1"><Users size={11} />{campaign.contributors}</span>
            {campaign.daysLeft !== null ? (
              <span className={`flex items-center gap-1 ${campaign.daysLeft <= 5 ? "text-[#E74C3C]" : ""}`}>
                <Clock size={11} />{campaign.daysLeft}j restants
              </span>
            ) : (
              <span className="flex items-center gap-1"><Lock size={11} />Privé</span>
            )}
          </div>
          <span className="text-[#654DDF] text-xs font-semibold">{fmt(campaign.raised)}</span>
        </div>
      </div>
    </button>
  );
}

// ─── Navbar ──────────────────────────────────────────────────────────────────

function Navbar({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button onClick={() => setScreen("home")} className="flex items-center gap-2.5 focus:outline-none">
          <div className="w-8 h-8 bg-[#654DDF] flex items-center justify-center">
            <div className="w-5 h-2.5 rounded-full bg-white" />
          </div>
          <span className="font-black text-white text-xl tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
            Sungku
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={() => setScreen("home")}
            className={`text-sm font-medium transition-colors ${screen === "home" ? "text-white" : "text-muted-foreground hover:text-white"}`}
          >
            Explorer
          </button>
          <button
            onClick={() => setScreen("dashboard")}
            className={`text-sm font-medium transition-colors ${screen === "dashboard" ? "text-white" : "text-muted-foreground hover:text-white"}`}
          >
            Mon espace
          </button>
          <button
            onClick={() => setScreen("mockups")}
            className={`text-sm font-medium transition-colors ${screen === "mockups" ? "text-white" : "text-muted-foreground hover:text-white"}`}
          >
            Maquettes UI
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setScreen("create")}
            className="hidden sm:flex items-center gap-2 bg-[#654DDF] hover:bg-[#7c63e8] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <Plus size={15} /> Créer une cagnotte
          </button>
          <button
            onClick={() => setScreen("dashboard")}
            className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-white hover:border-[#654DDF]/50 transition-colors"
          >
            <Bell size={15} />
          </button>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-white">
            <Menu size={22} />
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="md:hidden bg-card border-t border-border px-4 py-4 space-y-3">
          <button onClick={() => { setScreen("home"); setMenuOpen(false); }} className="block w-full text-left text-sm text-white py-2">Explorer</button>
          <button onClick={() => { setScreen("dashboard"); setMenuOpen(false); }} className="block w-full text-left text-sm text-white py-2">Mon espace</button>
          <button onClick={() => { setScreen("mockups"); setMenuOpen(false); }} className="block w-full text-left text-sm text-white py-2">Maquettes UI</button>
          <button onClick={() => { setScreen("create"); setMenuOpen(false); }} className="w-full bg-[#654DDF] text-white text-sm font-semibold py-2.5 rounded-xl">Créer une cagnotte</button>
        </div>
      )}
    </header>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

function HomeScreen({ campaigns, setScreen, setActiveCampaign }: {
  campaigns: Campaign[];
  setScreen: (s: Screen) => void;
  setActiveCampaign: (c: Campaign) => void;
}) {
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [search, setSearch] = useState("");

  const filtered = campaigns.filter(c => {
    const matchCat = activeCategory === "Tous" || c.category === activeCategory;
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.organizer.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
      {/* Hero */}
      <section className="py-16 md:py-24 text-center relative">
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <div className="w-[500px] h-[500px] rounded-full bg-[#654DDF]/10 blur-[120px]" />
        </div>
        <div className="inline-flex items-center gap-2 bg-[#654DDF]/20 border border-[#654DDF]/30 text-[#a08fff] text-xs font-semibold px-4 py-2 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#654DDF] animate-pulse inline-block" />
          Plateforme de collecte #1 en Afrique centrale
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-white mb-5 leading-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
          Collectez ensemble,<br />
          <span className="text-[#654DDF]">sans frontières</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
          Mobile money, carte bancaire, USSD — contribuez en quelques secondes depuis n&apos;importe où dans le monde.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => setScreen("create")}
            className="flex items-center justify-center gap-2 bg-[#654DDF] hover:bg-[#7c63e8] text-white font-bold px-7 py-4 rounded-2xl text-base transition-all duration-200 hover:shadow-lg hover:shadow-[#654DDF]/30"
          >
            <Plus size={18} /> Créer une cagnotte
          </button>
          <button
            onClick={() => { setActiveCampaign(campaigns[0]); setScreen("campaign"); }}
            className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-border text-white font-semibold px-7 py-4 rounded-2xl text-base transition-colors"
          >
            Voir les campagnes <ChevronRight size={16} />
          </button>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto">
          {[
            { label: "Collectés", value: "142M FCFA" },
            { label: "Campagnes", value: "1 840" },
            { label: "Contributeurs", value: "28 000+" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
              <div className="text-2xl font-black text-white" style={{ fontFamily: "Poppins, sans-serif" }}>{s.value}</div>
              <div className="text-muted-foreground text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Search + Filters */}
      <section className="mb-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
          <input
            type="text"
            placeholder="Rechercher une campagne, un organisateur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-card border border-border text-white placeholder:text-muted-foreground rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:border-[#654DDF]/60 transition-colors"
          />
          <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer" size={17} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeCategory === cat
                  ? "bg-[#654DDF] text-white"
                  : "bg-card border border-border text-muted-foreground hover:text-white hover:border-[#654DDF]/40"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Urgent */}
      {activeCategory === "Tous" && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E74C3C] animate-pulse inline-block" />
              Campagnes urgentes
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {campaigns.filter(c => c.urgent).map(c => (
              <CampaignCard key={c.id} campaign={c} onClick={() => { setActiveCampaign(c); setScreen("campaign"); }} />
            ))}
          </div>
        </section>
      )}

      {/* All / Filtered */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">
            {activeCategory === "Tous" ? "Toutes les campagnes" : activeCategory}
            <span className="ml-2 text-muted-foreground text-sm font-normal">({filtered.length})</span>
          </h2>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">Aucune campagne trouvée.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(c => (
              <CampaignCard key={c.id} campaign={c} onClick={() => { setActiveCampaign(c); setScreen("campaign"); }} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

// ─── Campaign Screen ──────────────────────────────────────────────────────────

function CampaignScreen({ campaign, setScreen }: { campaign: Campaign; setScreen: (s: Screen) => void }) {
  const pct = Math.round((campaign.raised / campaign.goal) * 100);
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
      <button
        onClick={() => setScreen("home")}
        className="flex items-center gap-2 text-muted-foreground hover:text-white text-sm mt-6 mb-6 transition-colors"
      >
        <ArrowLeft size={15} /> Retour
      </button>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Left / Main */}
        <div className="lg:col-span-3 space-y-6">
          <div className="relative rounded-2xl overflow-hidden h-64 md:h-80 bg-[#654DDF]/20">
            <img src={campaign.image} alt={campaign.title} className="w-full h-full object-cover" />
            {campaign.urgent && (
              <div className="absolute top-4 left-4 bg-[#E74C3C] text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
                URGENT
              </div>
            )}
            <CategoryBadge cat={campaign.category} />
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white mb-2" style={{ fontFamily: "Poppins, sans-serif" }}>
              {campaign.title}
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <div className="w-6 h-6 rounded-full bg-[#654DDF] flex items-center justify-center text-white text-xs font-bold">
                {campaign.avatar}
              </div>
              Organisé par <span className="text-white font-medium">{campaign.organizer}</span>
            </div>
          </div>

          <p className="text-muted-foreground leading-relaxed">{campaign.description}</p>

          {/* Share options */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <p className="text-white font-semibold text-sm">Partager cette campagne</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: <MessageCircle size={15} />, label: "WhatsApp", color: "bg-[#2ECC71]/20 text-[#2ECC71] border-[#2ECC71]/20" },
                { icon: <Globe size={15} />, label: "Réseaux", color: "bg-[#3498DB]/20 text-[#3498DB] border-[#3498DB]/20" },
                { icon: <QrCode size={15} />, label: "QR Code", color: "bg-[#654DDF]/20 text-[#a08fff] border-[#654DDF]/20" },
              ].map(opt => (
                <button key={opt.label} className={`flex items-center justify-center gap-1.5 border rounded-xl py-2.5 text-xs font-semibold transition-opacity hover:opacity-80 ${opt.color}`}>
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5">
              <span className="text-muted-foreground text-xs flex-1 truncate">sungku.cm/c/mama-ngono-op</span>
              <button onClick={handleCopy} className="text-[#654DDF] text-xs font-semibold flex items-center gap-1">
                {copied ? <><CheckCircle size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
              </button>
            </div>
            <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5">
              <Smartphone size={13} className="text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-xs">USSD : <span className="text-white font-mono">*126*4421#</span></span>
            </div>
          </div>

          {/* Contributors wall */}
          <div>
            <h3 className="text-white font-semibold mb-3">Mur des contributeurs</h3>
            <div className="space-y-3">
              {CONTRIBUTORS.map((c, i) => (
                <div key={i} className="flex items-start gap-3 bg-card border border-border rounded-xl p-3">
                  <div className="w-9 h-9 shrink-0 rounded-full bg-[#654DDF]/30 flex items-center justify-center text-[#a08fff] text-xs font-bold">
                    {c.name === "Anonyme" ? "?" : c.name.split(" ").map(w => w[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-semibold">{c.name}</span>
                      <span className="text-[#2ECC71] text-xs font-bold">+{fmt(c.amount)}</span>
                    </div>
                    {c.message && <p className="text-muted-foreground text-xs mt-0.5">{c.message}</p>}
                    <span className="text-muted-foreground text-xs">{c.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right / Sticky panel */}
        <div className="lg:col-span-2">
          <div className="sticky top-24 space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              {/* Progress */}
              <div className="bg-[#654DDF] rounded-2xl p-4 space-y-3">
                <div className="text-3xl font-black text-white" style={{ fontFamily: "Poppins, sans-serif" }}>
                  {fmt(campaign.raised)}
                </div>
                <PillGauge raised={campaign.raised} goal={campaign.goal} size="lg" />
                <div className="flex justify-between text-sm">
                  <span className="text-white/80">{pct}% atteint</span>
                  <span className="text-white/60">sur {fmt(campaign.goal)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted rounded-xl p-3">
                  <div className="text-white font-bold text-lg">{campaign.contributors}</div>
                  <div className="text-muted-foreground text-xs flex items-center gap-1"><Users size={11} />Contributeurs</div>
                </div>
                <div className="bg-muted rounded-xl p-3">
                  <div className={`font-bold text-lg ${campaign.daysLeft && campaign.daysLeft <= 5 ? "text-[#E74C3C]" : "text-white"}`}>
                    {campaign.daysLeft !== null ? `${campaign.daysLeft}j` : "∞"}
                  </div>
                  <div className="text-muted-foreground text-xs flex items-center gap-1"><Clock size={11} />Temps restant</div>
                </div>
              </div>

              <button
                onClick={() => setScreen("contribute")}
                className="w-full bg-[#654DDF] hover:bg-[#7c63e8] text-white font-bold py-4 rounded-xl text-base transition-all hover:shadow-lg hover:shadow-[#654DDF]/30"
              >
                Contribuer maintenant
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setLiked(!liked)}
                  className={`flex-1 flex items-center justify-center gap-2 border rounded-xl py-2.5 text-sm font-semibold transition-colors ${liked ? "border-[#E74C3C]/50 text-[#E74C3C] bg-[#E74C3C]/10" : "border-border text-muted-foreground hover:text-white"}`}
                >
                  <Heart size={14} fill={liked ? "currentColor" : "none"} /> Soutenir
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 border border-border text-muted-foreground hover:text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                  <Share2 size={14} /> Partager
                </button>
              </div>
            </div>

            {/* Payment methods */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-3">Moyens de paiement</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: <Smartphone size={13} />, label: "Orange Money" },
                  { icon: <Smartphone size={13} />, label: "MTN MoMo" },
                  { icon: <CreditCard size={13} />, label: "Carte bancaire" },
                  { icon: <Wifi size={13} />, label: "NFC / Tap" },
                ].map(m => (
                  <div key={m.label} className="flex items-center gap-2 bg-muted rounded-lg px-2.5 py-2 text-muted-foreground text-xs">
                    {m.icon} {m.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ─── Create Screen ────────────────────────────────────────────────────────────

function CreateScreen({ setScreen, onPublished }: { setScreen: (s: Screen) => void; onPublished?: () => void }) {
  const [step, setStep] = useState(1);
  const [publishing, setPublishing] = useState(false);
  const [pubError, setPubError] = useState<string | null>(null);

  async function handlePublish() {
    setPublishing(true);
    setPubError(null);
    try {
      await apiClient.create({
        title: form.title,
        description: form.description,
        category: CAT_LABEL_TO_ENUM[form.category] ?? "PROJET_COMMUNAUTAIRE",
        targetAmount: Number(String(form.goal).replace(/\s/g, "")) || 0,
        deadline: form.deadline || undefined,
        beneficiary: form.beneficiary === "myself" ? "Moi-même" : "Un tiers",
        visibility: form.visibility === "private" ? "PRIVEE" : "PUBLIQUE",
        isTontine: form.collective,
      });
      onPublished?.();
      setScreen("home");
    } catch {
      setPubError("Impossible de publier — vérifiez que l'API est démarrée.");
      setPublishing(false);
    }
  }
  const [form, setForm] = useState({
    title: "",
    category: "",
    description: "",
    goal: "",
    deadline: "",
    beneficiary: "myself",
    visibility: "public",
    collective: false,
  });

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div className="space-y-1.5">
        <label className="text-white text-sm font-medium">{label}</label>
        {children}
      </div>
    );
  }

  const inputClass = "w-full bg-input-background border border-border text-white placeholder:text-muted-foreground rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#654DDF]/60 transition-colors";

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 pb-16">
      <button onClick={() => setScreen("home")} className="flex items-center gap-2 text-muted-foreground hover:text-white text-sm mt-6 mb-6 transition-colors">
        <ArrowLeft size={15} /> Retour
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-black text-white" style={{ fontFamily: "Poppins, sans-serif" }}>Créer une cagnotte</h1>
        <p className="text-muted-foreground text-sm mt-1">Lancez votre collecte en moins de 2 minutes.</p>
      </div>

      {/* Step indicators */}
      <div className="flex gap-2 mb-8">
        {["Informations", "Options", "Partage"].map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i + 1)}
            className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition-all ${
              step === i + 1 ? "bg-[#654DDF] text-white" : step > i + 1 ? "bg-[#654DDF]/30 text-[#a08fff]" : "bg-card border border-border text-muted-foreground"
            }`}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        {step === 1 && (
          <>
            <Field label="Titre de la campagne">
              <input
                className={inputClass}
                placeholder="Ex : Opération chirurgicale de Mama Ngono"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Catégorie">
              <div className="relative">
                <select
                  className={inputClass + " appearance-none pr-10"}
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  <option value="">Sélectionner une catégorie</option>
                  {CATEGORIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </Field>
            <Field label="Description">
              <textarea
                className={inputClass + " h-28 resize-none"}
                placeholder="Expliquez votre situation, pourquoi vous avez besoin de cette collecte..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <Field label="Montant cible (FCFA)">
              <input
                className={inputClass}
                type="number"
                placeholder="Ex : 3 500 000"
                value={form.goal}
                onChange={e => setForm({ ...form, goal: e.target.value })}
              />
            </Field>
            <Field label="Date limite (optionnelle)">
              <input
                className={inputClass}
                type="date"
                value={form.deadline}
                onChange={e => setForm({ ...form, deadline: e.target.value })}
              />
            </Field>
            <div className="border-t border-border pt-4">
              <label className="text-white text-sm font-medium block mb-3">Photo de couverture</label>
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-[#654DDF]/50 transition-colors cursor-pointer">
                <div className="text-muted-foreground text-sm">Glisser-déposer ou cliquer pour choisir une image</div>
                <div className="text-muted-foreground text-xs mt-1">JPG, PNG — max 5 Mo</div>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Bénéficiaire">
              <div className="grid grid-cols-2 gap-2">
                {[{ value: "myself", label: "Moi-même" }, { value: "other", label: "Un tiers" }].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForm({ ...form, beneficiary: opt.value })}
                    className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                      form.beneficiary === opt.value
                        ? "bg-[#654DDF] border-[#654DDF] text-white"
                        : "bg-muted border-border text-muted-foreground hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Visibilité">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "public", label: "Publique", icon: <Globe size={13} /> },
                  { value: "private", label: "Privée", icon: <Lock size={13} /> }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForm({ ...form, visibility: opt.value })}
                    className={`py-3 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${
                      form.visibility === opt.value
                        ? "bg-[#654DDF] border-[#654DDF] text-white"
                        : "bg-muted border-border text-muted-foreground hover:text-white"
                    }`}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </Field>
            <div className="bg-muted rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-semibold">Campagne collective (Tontine)</p>
                <p className="text-muted-foreground text-xs mt-0.5">Activer si vous gérez un groupe de contributeurs identifiés</p>
              </div>
              <button
                onClick={() => setForm({ ...form, collective: !form.collective })}
                className={`relative w-12 h-6 rounded-full transition-colors ${form.collective ? "bg-[#654DDF]" : "bg-switch-background"}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.collective ? "left-7" : "left-1"}`} />
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-[#654DDF]/20 border border-[#654DDF]/30 rounded-2xl p-5 text-center space-y-3">
              <CheckCircle size={32} className="mx-auto text-[#2ECC71]" />
              <p className="text-white font-bold">Votre cagnotte est prête !</p>
              <p className="text-muted-foreground text-sm">Partagez-la via ces canaux pour commencer à collecter.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 bg-muted rounded-xl px-4 py-3">
                <Globe size={15} className="text-[#3498DB] shrink-0" />
                <span className="text-white text-sm flex-1 truncate">sungku.cm/c/ma-nouvelle-cagnotte</span>
                <button className="text-[#654DDF] text-xs font-semibold"><Copy size={13} /></button>
              </div>
              <div className="flex items-center gap-3 bg-muted rounded-xl px-4 py-3">
                <Smartphone size={15} className="text-[#F39C12] shrink-0" />
                <span className="text-white text-sm font-mono">*126*8847#</span>
                <span className="text-muted-foreground text-xs ml-auto">Code USSD</span>
              </div>
              <div className="bg-muted rounded-xl p-4 flex items-center justify-center">
                <div className="w-24 h-24 bg-white rounded-lg flex items-center justify-center text-black text-xs">
                  <QrCode size={60} className="text-[#654DDF]" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: <MessageCircle size={14} />, label: "WhatsApp", color: "bg-[#2ECC71]/20 text-[#2ECC71] border-[#2ECC71]/20" },
                { icon: <Send size={14} />, label: "Télégramme", color: "bg-[#3498DB]/20 text-[#3498DB] border-[#3498DB]/20" },
              ].map(opt => (
                <button key={opt.label} className={`flex items-center justify-center gap-2 border rounded-xl py-3 text-sm font-semibold ${opt.color}`}>
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 border border-border text-white font-semibold py-3.5 rounded-xl hover:bg-white/5 transition-colors"
            >
              Précédent
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex-1 bg-[#654DDF] hover:bg-[#7c63e8] text-white font-bold py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-[#654DDF]/30"
            >
              Continuer
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex-1 bg-[#2ECC71] hover:bg-[#27ae60] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors"
            >
              {publishing ? "Publication..." : "Publier la cagnotte"}
            </button>
          )}
        </div>
        {pubError && <p className="text-[#E74C3C] text-sm text-center">{pubError}</p>}
      </div>
    </main>
  );
}

// ─── Contribute Screen ────────────────────────────────────────────────────────

function ContributeScreen({ campaign, setScreen, onContributed }: { campaign: Campaign; setScreen: (s: Screen) => void; onContributed?: () => void }) {
  const [amount, setAmount] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [step, setStep] = useState(1);
  const [paying, setPaying] = useState(false);

  const AMOUNTS = [5000, 10000, 25000, 50000, 100000, 200000];
  const effectiveAmount = amount ?? (custom ? parseInt(custom.replace(/\s/g, "")) : 0);

  async function handlePay() {
    setPaying(true);
    // Best-effort: real (live) campaigns persist to the API; demo campaigns just complete the UX.
    try {
      await apiClient.contribute(campaign.slug || campaign.id, {
        amount: effectiveAmount,
        channel: CHANNEL_LABEL_TO_ENUM[payMethod] ?? "ORANGE_MONEY",
      });
      onContributed?.();
    } catch {
      /* demo campaign or API offline — proceed to confirmation anyway */
    }
    setPaying(false);
    setStep(3);
  }

  const PAY_METHODS = [
    { id: "orange", label: "Orange Money", icon: "🟠", desc: "Paiement via Orange Money Cameroun" },
    { id: "mtn", label: "MTN MoMo", icon: "🟡", desc: "Paiement via MTN Mobile Money" },
    { id: "card", label: "Carte bancaire", icon: "💳", desc: "Visa / Mastercard — Diaspora" },
    { id: "nfc", label: "NFC / Tap", icon: "📡", desc: "Payer en approchant votre téléphone" },
  ];

  return (
    <main className="max-w-md mx-auto px-4 sm:px-6 pb-16">
      <button onClick={() => setScreen("campaign")} className="flex items-center gap-2 text-muted-foreground hover:text-white text-sm mt-6 mb-6 transition-colors">
        <ArrowLeft size={15} /> Retour
      </button>

      <div className="bg-card border border-border rounded-2xl p-4 mb-6 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#654DDF]/20 shrink-0">
          <img src={campaign.image} alt={campaign.title} className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm line-clamp-1">{campaign.title}</p>
          <p className="text-muted-foreground text-xs">{fmt(campaign.raised)} collectés</p>
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-5">
          <h2 className="text-white font-bold text-xl" style={{ fontFamily: "Poppins, sans-serif" }}>Choisir un montant</h2>
          <div className="grid grid-cols-3 gap-2">
            {AMOUNTS.map(a => (
              <button
                key={a}
                onClick={() => { setAmount(a); setCustom(""); }}
                className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                  amount === a ? "bg-[#654DDF] border-[#654DDF] text-white" : "bg-card border-border text-muted-foreground hover:text-white hover:border-[#654DDF]/40"
                }`}
              >
                {new Intl.NumberFormat("fr-CM").format(a)}
              </button>
            ))}
          </div>
          <div className="relative">
            <input
              type="number"
              placeholder="Montant libre (FCFA)"
              value={custom}
              onChange={e => { setCustom(e.target.value); setAmount(null); }}
              className="w-full bg-input-background border border-border text-white placeholder:text-muted-foreground rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#654DDF]/60 transition-colors"
            />
          </div>
          {effectiveAmount > 0 && (
            <div className="bg-[#654DDF]/20 border border-[#654DDF]/30 rounded-xl px-4 py-3 text-[#a08fff] text-sm font-semibold text-center">
              Contribution : {fmt(effectiveAmount)}
            </div>
          )}
          <button
            disabled={effectiveAmount <= 0}
            onClick={() => setStep(2)}
            className="w-full bg-[#654DDF] hover:bg-[#7c63e8] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all hover:shadow-lg hover:shadow-[#654DDF]/30"
          >
            Continuer
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <h2 className="text-white font-bold text-xl" style={{ fontFamily: "Poppins, sans-serif" }}>Mode de paiement</h2>
          <div className="space-y-2">
            {PAY_METHODS.map(m => (
              <button
                key={m.id}
                onClick={() => setPayMethod(m.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                  payMethod === m.id ? "border-[#654DDF] bg-[#654DDF]/10" : "border-border bg-card hover:border-[#654DDF]/40"
                }`}
              >
                <span className="text-2xl">{m.icon}</span>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">{m.label}</p>
                  <p className="text-muted-foreground text-xs">{m.desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${payMethod === m.id ? "border-[#654DDF] bg-[#654DDF]" : "border-border"}`}>
                  {payMethod === m.id && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 border border-border text-white font-semibold py-3.5 rounded-xl hover:bg-white/5 transition-colors">Retour</button>
            <button
              disabled={!payMethod || paying}
              onClick={handlePay}
              className="flex-1 bg-[#654DDF] hover:bg-[#7c63e8] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all"
            >
              {paying ? "Traitement..." : `Payer ${fmt(effectiveAmount)}`}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5 text-center">
          <div className="w-20 h-20 rounded-full bg-[#2ECC71]/20 border border-[#2ECC71]/40 flex items-center justify-center mx-auto">
            <CheckCircle size={40} className="text-[#2ECC71]" />
          </div>
          <div>
            <h2 className="text-white font-black text-2xl" style={{ fontFamily: "Poppins, sans-serif" }}>Merci !</h2>
            <p className="text-muted-foreground text-sm mt-2">Votre contribution de <span className="text-white font-bold">{fmt(effectiveAmount)}</span> a bien été reçue.</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 text-left space-y-3">
            <p className="text-white font-semibold text-sm">Reçu numérique</p>
            {[
              { label: "Campagne", value: campaign.title },
              { label: "Montant", value: fmt(effectiveAmount) },
              { label: "Moyen", value: PAY_METHODS.find(m => m.id === payMethod)?.label ?? "" },
              { label: "Date", value: new Date().toLocaleDateString("fr-FR") },
              { label: "Référence", value: "#SNG-" + Math.random().toString(36).slice(2, 8).toUpperCase() },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="text-white font-medium">{r.value}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="flex items-center justify-center gap-2 border border-border text-white font-semibold py-3 rounded-xl hover:bg-white/5 transition-colors text-sm">
              <Download size={14} /> Télécharger
            </button>
            <button onClick={() => setScreen("home")} className="bg-[#654DDF] hover:bg-[#7c63e8] text-white font-bold py-3 rounded-xl transition-colors text-sm">
              Retour à l&apos;accueil
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

function DashboardScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const [activeTab, setActiveTab] = useState<"overview" | "campaigns" | "withdraw">("overview");
  const campaign = CAMPAIGNS[0];
  const pct = Math.round((campaign.raised / campaign.goal) * 100);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs text-white">
          {fmt(payload[0].value)}
        </div>
      );
    }
    return null;
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
      <div className="py-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white" style={{ fontFamily: "Poppins, sans-serif" }}>Mon tableau de bord</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Bienvenue, Jean-Paul Mbarga</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setScreen("create")} className="flex items-center gap-2 bg-[#654DDF] hover:bg-[#7c63e8] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
            <Plus size={14} /> Nouvelle cagnotte
          </button>
          <button className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
            <Settings size={15} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-card border border-border rounded-xl p-1 mb-6 w-fit">
        {[
          { id: "overview", label: "Vue d'ensemble" },
          { id: "campaigns", label: "Mes campagnes" },
          { id: "withdraw", label: "Retrait" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as typeof activeTab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === t.id ? "bg-[#654DDF] text-white" : "text-muted-foreground hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total collecté", value: "1 850 000", unit: "FCFA", change: "+12%", color: "text-[#2ECC71]", icon: <TrendingUp size={16} /> },
              { label: "Contributeurs", value: "142", unit: "personnes", change: "+8 ce mois", color: "text-[#3498DB]", icon: <Users size={16} /> },
              { label: "Solde disponible", value: "1 250 000", unit: "FCFA", change: "Après frais 3%", color: "text-white", icon: <Wallet size={16} /> },
              { label: "Campagnes actives", value: "1", unit: "campagne", change: "1 en modération", color: "text-[#F39C12]", icon: <BarChart3 size={16} /> },
            ].map(k => (
              <div key={k.label} className="bg-card border border-border rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">{k.label}</span>
                  <span className="text-muted-foreground">{k.icon}</span>
                </div>
                <div className="text-white font-black text-2xl" style={{ fontFamily: "Poppins, sans-serif" }}>
                  {k.value} <span className="text-sm font-normal text-muted-foreground">{k.unit}</span>
                </div>
                <span className={`text-xs font-medium ${k.color}`}>{k.change}</span>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Évolution de la collecte</h3>
              <span className="text-muted-foreground text-xs">Juillet 2025</span>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={CHART_DATA} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#654DDF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#654DDF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fill: "#a0a0a0", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: "#a0a0a0", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `${(v / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="amount" stroke="#654DDF" strokeWidth={2.5} fill="url(#colorAmt)" dot={false} activeDot={{ r: 5, fill: "#654DDF" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Campaign progress */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4">Campagne active</h3>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#654DDF]/20 shrink-0">
                <img src={campaign.image} alt={campaign.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-white font-semibold text-sm">{campaign.title}</p>
                  {campaign.daysLeft !== null && (
                    <p className={`text-xs mt-0.5 ${campaign.daysLeft <= 5 ? "text-[#E74C3C]" : "text-muted-foreground"}`}>
                      {campaign.daysLeft} jours restants
                    </p>
                  )}
                </div>
                <div className="bg-[#654DDF] rounded-xl p-3 space-y-2">
                  <PillGauge raised={campaign.raised} goal={campaign.goal} size="md" />
                  <div className="flex justify-between text-xs">
                    <span className="text-white font-bold">{fmt(campaign.raised)}</span>
                    <span className="text-white/60">{pct}% de {fmt(campaign.goal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent contributors */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Contributions récentes</h3>
              <button className="text-[#654DDF] text-xs font-semibold hover:underline">Tout voir</button>
            </div>
            <div className="space-y-2">
              {CONTRIBUTORS.map((c, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#654DDF]/20 flex items-center justify-center text-[#a08fff] text-xs font-bold">
                      {c.name === "Anonyme" ? "?" : c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{c.name}</p>
                      <p className="text-muted-foreground text-xs">{c.time}</p>
                    </div>
                  </div>
                  <span className="text-[#2ECC71] font-bold text-sm">+{fmt(c.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "campaigns" && (
        <div className="space-y-4">
          {CAMPAIGNS.slice(0, 3).map(c => {
            const p = Math.round((c.raised / c.goal) * 100);
            return (
              <div key={c.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#654DDF]/20 shrink-0">
                  <img src={c.image} alt={c.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{c.title}</p>
                  <div className="bg-[#654DDF] rounded-lg p-1.5">
                    <PillGauge raised={c.raised} goal={c.goal} size="sm" />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{fmt(c.raised)}</span>
                    <span>·</span>
                    <span>{p}%</span>
                    <span>·</span>
                    <span>{c.contributors} contributeurs</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <CategoryBadge cat={c.category} />
                  <button className="text-muted-foreground hover:text-white transition-colors">
                    <Eye size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "withdraw" && (
        <div className="max-w-md space-y-5">
          <div className="bg-[#654DDF]/20 border border-[#654DDF]/30 rounded-2xl p-5">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Solde disponible</p>
            <p className="text-white font-black text-3xl" style={{ fontFamily: "Poppins, sans-serif" }}>1 250 000 FCFA</p>
            <p className="text-muted-foreground text-xs mt-1">Après frais de plateforme (3%)</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="text-white font-semibold">Demander un retrait</h3>
            <div className="space-y-2">
              <label className="text-white text-sm font-medium">Montant à retirer</label>
              <input className="w-full bg-input-background border border-border text-white placeholder:text-muted-foreground rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#654DDF]/60 transition-colors" placeholder="Ex : 500 000" type="number" />
            </div>
            <div className="space-y-2">
              <label className="text-white text-sm font-medium">Destination</label>
              <div className="space-y-2">
                {["Orange Money — +237 6XX XXX XXX", "MTN MoMo — +237 6XX XXX XXX", "Portefeuille Sungku"].map(opt => (
                  <button key={opt} className="w-full flex items-center gap-3 bg-muted border border-border rounded-xl px-4 py-3 text-left hover:border-[#654DDF]/40 transition-colors">
                    <div className="w-4 h-4 rounded-full border-2 border-border" />
                    <span className="text-white text-sm">{opt}</span>
                  </button>
                ))}
              </div>
            </div>
            <button className="w-full bg-[#654DDF] hover:bg-[#7c63e8] text-white font-bold py-4 rounded-xl transition-all">
              Soumettre la demande
            </button>
            <p className="text-muted-foreground text-xs text-center">Les retraits sont traités sous 24h. Pièce d&apos;identité requise pour les montants {">"} 500 000 FCFA (conformité COBAC).</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Download size={15} /> Exports et rapports
            </h3>
            <div className="space-y-2">
              {["Relevé de contributions (PDF)", "Rapport comptable (Excel)", "Reçus fiscaux (ZIP)"].map(r => (
                <button key={r} className="w-full flex items-center justify-between bg-muted rounded-xl px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors">
                  {r} <Download size={13} className="text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ─── Logo Square ─────────────────────────────────────────────────────────────

function SungkuLogo({ size = 120 }: { size?: number }) {
  const pill = Math.round(size * 0.4);
  const pillH = Math.round(size * 0.22);
  return (
    <div
      style={{ width: size, height: size, backgroundColor: "#654DDF" }}
      className="flex items-center justify-center"
    >
      <div
        style={{ width: pill, height: pillH, borderRadius: pillH }}
        className="bg-white"
      />
    </div>
  );
}

// ─── Mockups Screen ───────────────────────────────────────────────────────────

const MOCKUP_FRAMES = [
  {
    id: "home",
    label: "Accueil",
    color: "#654DDF",
    preview: (
      <div className="bg-black w-full h-full p-3 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 bg-[#654DDF] flex items-center justify-center">
              <div className="w-3 h-1.5 rounded-full bg-white" />
            </div>
            <span className="text-white text-xs font-black" style={{ fontFamily: "Poppins, sans-serif" }}>Sungku</span>
          </div>
          <div className="w-5 h-5 rounded-full bg-[#654DDF] flex items-center justify-center">
            <Plus size={8} className="text-white" />
          </div>
        </div>
        <div className="text-center mb-3">
          <div className="text-white font-black text-sm leading-tight" style={{ fontFamily: "Poppins, sans-serif" }}>Collectez<br /><span className="text-[#654DDF]">ensemble</span></div>
          <div className="flex gap-1 mt-2 justify-center">
            <div className="bg-[#654DDF] text-white text-[7px] px-2 py-1 rounded font-bold">Créer</div>
            <div className="border border-white/20 text-white text-[7px] px-2 py-1 rounded">Explorer</div>
          </div>
        </div>
        <div className="flex gap-1 mb-2">
          {["Tous","Santé","Funérailles"].map(c => (
            <div key={c} className={`text-[6px] px-1.5 py-0.5 rounded-full font-semibold ${c === "Tous" ? "bg-[#654DDF] text-white" : "bg-[#1a1a1a] text-[#a0a0a0]"}`}>{c}</div>
          ))}
        </div>
        {[0,1,2].map(i => (
          <div key={i} className="bg-[#121212] rounded mb-1.5 overflow-hidden">
            <div className="h-8 bg-[#654DDF]/30" />
            <div className="p-1.5">
              <div className="h-1.5 bg-white/20 rounded mb-1 w-3/4" />
              <div className="bg-[#654DDF] rounded-full h-1 mb-0.5">
                <div className="bg-white h-full rounded-full" style={{ width: `${[53, 49, 56][i]}%` }} />
              </div>
              <div className="flex justify-between">
                <div className="h-1 bg-white/10 rounded w-1/3" />
                <div className="h-1 bg-[#654DDF]/40 rounded w-1/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "campaign",
    label: "Page Campagne",
    color: "#7c63e8",
    preview: (
      <div className="bg-black w-full h-full p-3 overflow-hidden">
        <div className="h-14 bg-[#654DDF]/30 rounded mb-2 relative overflow-hidden">
          <div className="absolute bottom-1.5 left-1.5">
            <div className="bg-[#E74C3C] text-white text-[6px] px-1 py-0.5 rounded-full font-bold flex items-center gap-0.5">
              <div className="w-1 h-1 rounded-full bg-white" />URGENT
            </div>
          </div>
        </div>
        <div className="h-1.5 bg-white/20 rounded mb-1 w-4/5" />
        <div className="h-1 bg-white/10 rounded mb-3 w-1/2" />
        <div className="bg-[#654DDF] rounded-lg p-2 mb-2">
          <div className="text-white font-black text-sm mb-1" style={{ fontFamily: "Poppins, sans-serif" }}>1 850 000</div>
          <div className="h-2 bg-white/20 rounded-full mb-1">
            <div className="h-full bg-white rounded-full" style={{ width: "53%" }} />
          </div>
          <div className="flex justify-between">
            <div className="text-white/80 text-[7px]">53%</div>
            <div className="text-white/60 text-[7px]">sur 3 500 000 FCFA</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1 mb-2">
          <div className="bg-[#1a1a1a] rounded p-1.5"><div className="text-white text-[8px] font-bold">142</div><div className="text-[#a0a0a0] text-[6px]">Contributeurs</div></div>
          <div className="bg-[#1a1a1a] rounded p-1.5"><div className="text-[#E74C3C] text-[8px] font-bold">8j</div><div className="text-[#a0a0a0] text-[6px]">Restants</div></div>
        </div>
        <div className="bg-[#654DDF] rounded py-1.5 text-center text-white text-[7px] font-bold mb-1">Contribuer maintenant</div>
        <div className="grid grid-cols-2 gap-1">
          <div className="border border-white/10 rounded py-1 text-center text-[#a0a0a0] text-[6px]">❤ Soutenir</div>
          <div className="border border-white/10 rounded py-1 text-center text-[#a0a0a0] text-[6px]">↗ Partager</div>
        </div>
      </div>
    ),
  },
  {
    id: "create",
    label: "Créer Cagnotte",
    color: "#5a44c9",
    preview: (
      <div className="bg-black w-full h-full p-3 overflow-hidden">
        <div className="text-white font-black text-sm mb-0.5" style={{ fontFamily: "Poppins, sans-serif" }}>Créer</div>
        <div className="text-[#a0a0a0] text-[7px] mb-3">Lancez votre collecte</div>
        <div className="grid grid-cols-3 gap-1 mb-3">
          {["1. Infos","2. Options","3. Partage"].map((s,i) => (
            <div key={s} className={`rounded py-1 text-center text-[6px] font-bold ${i === 0 ? "bg-[#654DDF] text-white" : "bg-[#121212] text-[#a0a0a0]"}`}>{s}</div>
          ))}
        </div>
        <div className="space-y-2">
          {["Titre de la campagne","Catégorie","Description","Montant cible (FCFA)"].map(f => (
            <div key={f}>
              <div className="text-[6px] text-white mb-0.5">{f}</div>
              <div className="bg-[#1e1e2e] rounded h-4 border border-white/10" />
            </div>
          ))}
        </div>
        <div className="mt-3 border-2 border-dashed border-white/10 rounded h-8 flex items-center justify-center">
          <div className="text-[#a0a0a0] text-[6px]">Photo de couverture</div>
        </div>
        <div className="mt-3 bg-[#654DDF] rounded py-2 text-center text-white text-[7px] font-bold">Continuer →</div>
      </div>
    ),
  },
  {
    id: "contribute",
    label: "Tunnel de Paiement",
    color: "#4a35b8",
    preview: (
      <div className="bg-black w-full h-full p-3 overflow-hidden">
        <div className="flex items-center gap-2 bg-[#121212] rounded p-1.5 mb-3">
          <div className="w-6 h-6 bg-[#654DDF]/30 rounded" />
          <div>
            <div className="h-1.5 bg-white/20 rounded w-20 mb-0.5" />
            <div className="h-1 bg-white/10 rounded w-14" />
          </div>
        </div>
        <div className="text-white font-bold text-xs mb-2" style={{ fontFamily: "Poppins, sans-serif" }}>Choisir un montant</div>
        <div className="grid grid-cols-3 gap-1 mb-2">
          {["5 000","10 000","25 000","50 000","100 000","200 000"].map((a,i) => (
            <div key={a} className={`rounded py-1 text-center text-[6px] font-bold border ${i === 3 ? "bg-[#654DDF] border-[#654DDF] text-white" : "bg-[#121212] border-white/10 text-[#a0a0a0]"}`}>{a}</div>
          ))}
        </div>
        <div className="bg-[#1e1e2e] rounded h-5 border border-white/10 mb-2" />
        <div className="bg-[#654DDF]/20 border border-[#654DDF]/30 rounded p-2 text-center text-[#a08fff] text-[7px] font-bold mb-3">Contribution : 50 000 FCFA</div>
        <div className="text-white font-bold text-xs mb-2">Mode de paiement</div>
        {[["🟠","Orange Money"],["🟡","MTN MoMo"],["💳","Carte bancaire"]].map(([ic, lb],i) => (
          <div key={lb} className={`flex items-center gap-2 rounded border p-1.5 mb-1 ${i === 0 ? "border-[#654DDF] bg-[#654DDF]/10" : "border-white/10 bg-[#121212]"}`}>
            <span className="text-[10px]">{ic}</span>
            <div className="text-[7px] text-white">{lb}</div>
            <div className={`ml-auto w-2.5 h-2.5 rounded-full border ${i === 0 ? "border-[#654DDF] bg-[#654DDF]" : "border-white/20"}`} />
          </div>
        ))}
        <div className="mt-2 bg-[#654DDF] rounded py-1.5 text-center text-white text-[7px] font-bold">Payer 50 000 FCFA</div>
      </div>
    ),
  },
  {
    id: "dashboard",
    label: "Tableau de Bord",
    color: "#3d2fa8",
    preview: (
      <div className="bg-black w-full h-full p-3 overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-white font-black text-xs" style={{ fontFamily: "Poppins, sans-serif" }}>Dashboard</div>
            <div className="text-[#a0a0a0] text-[6px]">Jean-Paul Mbarga</div>
          </div>
          <div className="bg-[#654DDF] rounded px-1.5 py-1 text-white text-[6px] font-bold flex items-center gap-1"><Plus size={6} />Nouvelle</div>
        </div>
        <div className="grid grid-cols-2 gap-1 mb-2">
          {[["1 850 000","FCFA","Collecté","text-[#2ECC71]"],["142","personnes","Contributeurs","text-[#3498DB]"],["1 250 000","FCFA","Disponible","text-white"],["1","campagne","Active","text-[#F39C12]"]].map(([v,u,l,c]) => (
            <div key={l} className="bg-[#121212] rounded p-1.5">
              <div className={`font-black text-[9px] ${c}`} style={{ fontFamily: "Poppins, sans-serif" }}>{v}</div>
              <div className="text-[#a0a0a0] text-[5px]">{l}</div>
            </div>
          ))}
        </div>
        <div className="bg-[#121212] rounded p-2 mb-2">
          <div className="text-white text-[7px] font-semibold mb-1.5">Évolution collecte</div>
          <div className="flex items-end gap-0.5 h-8">
            {[20,35,55,45,70,85,95,100].map((h,i) => (
              <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: `rgba(101,77,223,${0.3 + h/200})` }} />
            ))}
          </div>
        </div>
        <div className="bg-[#654DDF] rounded-lg p-2">
          <div className="h-1.5 bg-white/20 rounded-full mb-1">
            <div className="h-full bg-white rounded-full" style={{ width: "53%" }} />
          </div>
          <div className="flex justify-between">
            <div className="text-white text-[6px] font-bold">1 850 000 FCFA</div>
            <div className="text-white/60 text-[6px]">53%</div>
          </div>
        </div>
        <div className="mt-2">
          {[["Diaspora Paris","150 000"],["Roger E.","100 000"],["Alvine K.","50 000"]].map(([n,a]) => (
            <div key={n} className="flex justify-between items-center py-0.5 border-b border-white/5">
              <div className="text-[6px] text-white">{n}</div>
              <div className="text-[6px] text-[#2ECC71] font-bold">+{a}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "logo",
    label: "Logo & Identité",
    color: "#000000",
    preview: (
      <div className="bg-black w-full h-full flex flex-col items-center justify-center gap-4 p-4">
        {/* Square logo large */}
        <div className="w-16 h-16 bg-[#654DDF] flex items-center justify-center">
          <div className="w-10 h-4 rounded-full bg-white" />
        </div>
        <div>
          <div className="text-white font-black text-xl text-center tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>Sungku</div>
          <div className="text-[#a0a0a0] text-[8px] text-center mt-0.5">Collectons ensemble</div>
        </div>
        <div className="flex gap-2 mt-2">
          <div className="w-6 h-6 bg-[#654DDF]" />
          <div className="w-6 h-6 bg-[#2ECC71]" />
          <div className="w-6 h-6 bg-[#E74C3C]" />
          <div className="w-6 h-6 bg-white" />
          <div className="w-6 h-6 bg-[#121212] border border-white/10" />
        </div>
        <div className="text-[#a0a0a0] text-[6px] text-center space-y-0.5">
          <div>#654DDF · #2ECC71 · #E74C3C</div>
          <div>Inter · Poppins</div>
        </div>
      </div>
    ),
  },
];

function MockupsScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const frameRefs = useRef<(HTMLDivElement | null)[]>([]);

  async function downloadFrame(index: number, label: string) {
    const el = frameRefs.current[index];
    if (!el) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(el, {
        backgroundColor: "#000000",
        scale: 3,
        useCORS: true,
        allowTaint: true,
      });
      const link = document.createElement("a");
      link.download = `sungku-${label.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      alert("Installez html2canvas pour l'export PNG : npm install html2canvas");
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
      <div className="py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
          <div>
            <button onClick={() => setScreen("home")} className="flex items-center gap-2 text-muted-foreground hover:text-white text-sm mb-4 transition-colors">
              <ArrowLeft size={15} /> Retour
            </button>
            <h1 className="text-3xl font-black text-white" style={{ fontFamily: "Poppins, sans-serif" }}>
              Maquettes UI — Sungku
            </h1>
            <p className="text-muted-foreground text-sm mt-1">6 écrans clés · Identité visuelle complète · Cliquez sur ↓ pour exporter en PNG</p>
          </div>
          <div className="flex items-center gap-2 bg-[#654DDF]/20 border border-[#654DDF]/30 rounded-xl px-4 py-2.5">
            <div className="w-8 h-8 bg-[#654DDF] flex items-center justify-center">
              <div className="w-5 h-2 rounded-full bg-white" />
            </div>
            <div>
              <p className="text-white text-xs font-bold">Sungku Platform</p>
              <p className="text-[#a0a0a0] text-[10px]">Design System v1.0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Logo showcase strip */}
      <div className="bg-card border border-border rounded-2xl p-8 mb-8">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-6">Logo — Forme carrée</p>
        <div className="flex flex-wrap items-center gap-8">
          {/* On violet */}
          <div className="flex flex-col items-center gap-2">
            <div className="bg-[#654DDF] p-6">
              <SungkuLogo size={80} />
            </div>
            <span className="text-[#a0a0a0] text-[10px]">Sur fond violet</span>
          </div>
          {/* On black */}
          <div className="flex flex-col items-center gap-2">
            <div className="bg-black p-6 border border-border">
              <SungkuLogo size={80} />
            </div>
            <span className="text-[#a0a0a0] text-[10px]">Sur fond noir</span>
          </div>
          {/* On white */}
          <div className="flex flex-col items-center gap-2">
            <div className="bg-white p-6">
              <SungkuLogo size={80} />
            </div>
            <span className="text-[#a0a0a0] text-[10px]">Sur fond blanc</span>
          </div>
          {/* Wordmark */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 bg-black p-6 border border-border">
              <SungkuLogo size={48} />
              <span className="text-white font-black text-3xl tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>Sungku</span>
            </div>
            <span className="text-[#a0a0a0] text-[10px]">Logo + Wordmark</span>
          </div>
          {/* Sizes */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-end gap-3 bg-black p-6 border border-border">
              {[16, 24, 32, 48, 64].map(s => <SungkuLogo key={s} size={s} />)}
            </div>
            <span className="text-[#a0a0a0] text-[10px]">Tailles : 16 → 64 px</span>
          </div>
        </div>
      </div>

      {/* Color + type tokens */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-card border border-border rounded-2xl p-6">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-4">Palette de couleurs</p>
          <div className="space-y-2">
            {[
              { name: "Primaire", hex: "#654DDF", role: "CTA, liens, icônes actifs" },
              { name: "Accent", hex: "#7c63e8", role: "Hover, survol" },
              { name: "Fond principal", hex: "#000000", role: "Background global" },
              { name: "Fond carte", hex: "#121212", role: "Cards, panels" },
              { name: "Fond input", hex: "#1e1e2e", role: "Champs de saisie" },
              { name: "Texte principal", hex: "#FFFFFF", role: "Titres, labels" },
              { name: "Texte secondaire", hex: "#A0A0A0", role: "Sous-titres, meta" },
              { name: "Succès", hex: "#2ECC71", role: "Validation, montants" },
              { name: "Alerte", hex: "#E74C3C", role: "Urgence, erreurs" },
              { name: "Avertissement", hex: "#F39C12", role: "Statuts intermédiaires" },
            ].map(c => (
              <div key={c.hex} className="flex items-center gap-3">
                <div className="w-8 h-8 shrink-0 border border-white/10" style={{ backgroundColor: c.hex }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-semibold">{c.name}</span>
                    <span className="text-[#a0a0a0] font-mono text-[10px]">{c.hex}</span>
                  </div>
                  <span className="text-[#a0a0a0] text-[10px]">{c.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-4">Typographie</p>
            <div className="space-y-4">
              <div>
                <p className="text-[#a0a0a0] text-[10px] mb-1">Display / Titres — Poppins Black</p>
                <p className="text-white font-black text-3xl leading-tight" style={{ fontFamily: "Poppins, sans-serif" }}>Collectons<br />ensemble</p>
              </div>
              <div>
                <p className="text-[#a0a0a0] text-[10px] mb-1">Sous-titres — Poppins Bold</p>
                <p className="text-white font-bold text-xl" style={{ fontFamily: "Poppins, sans-serif" }}>Campagnes urgentes</p>
              </div>
              <div>
                <p className="text-[#a0a0a0] text-[10px] mb-1">Corps — Inter Regular 400</p>
                <p className="text-white text-sm leading-relaxed">Mama Ngono souffre d&apos;une pathologie cardiaque nécessitant une intervention urgente.</p>
              </div>
              <div>
                <p className="text-[#a0a0a0] text-[10px] mb-1">Caption / Labels — Inter Medium 500</p>
                <p className="text-[#a0a0a0] text-xs font-medium">142 contributeurs · 8 jours restants</p>
              </div>
              <div>
                <p className="text-[#a0a0a0] text-[10px] mb-1">USSD Code — Monospace</p>
                <p className="text-white font-mono font-bold text-lg tracking-widest">*126*4421#</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-3">Jauge Pilule — Composant signature</p>
            <div className="space-y-3">
              {[
                { label: "Opération Mama Ngono", pct: 53 },
                { label: "École Mbalmayo", pct: 49 },
                { label: "Forage Nkolbisson", pct: 62 },
              ].map(g => (
                <div key={g.label}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-[#a0a0a0]">{g.label}</span>
                    <span className="text-white font-bold">{g.pct}%</span>
                  </div>
                  <div className="bg-[#654DDF] rounded-xl p-1">
                    <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full transition-all" style={{ width: `${g.pct}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Screen mockups grid */}
      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-4">Écrans — Format mobile</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
        {MOCKUP_FRAMES.map((frame, i) => (
          <div key={frame.id} className="group">
            <div className="relative">
              {/* Phone frame */}
              <div className="bg-[#1a1a1a] rounded-3xl p-2 border border-white/10 shadow-2xl shadow-black/50">
                <div className="bg-[#0d0d0d] rounded-2xl overflow-hidden">
                  {/* Status bar */}
                  <div className="bg-black flex items-center justify-between px-4 py-1.5">
                    <span className="text-white text-[8px] font-medium">9:41</span>
                    <div className="flex items-center gap-1">
                      <div className="flex gap-0.5">
                        {[3,4,4,3].map((h,j) => <div key={j} className="w-0.5 bg-white rounded-full" style={{ height: h }} />)}
                      </div>
                      <div className="w-4 h-2 rounded-sm border border-white/60 relative">
                        <div className="absolute inset-0.5 bg-white rounded-sm" style={{ width: "75%" }} />
                      </div>
                    </div>
                  </div>
                  {/* Screen content */}
                  <div
                    ref={el => { frameRefs.current[i] = el; }}
                    className="aspect-[9/16] overflow-hidden relative"
                    style={{ background: frame.id === "logo" ? "#000" : undefined }}
                  >
                    {frame.preview}
                  </div>
                  {/* Home indicator */}
                  <div className="bg-black flex justify-center py-2">
                    <div className="w-20 h-1 bg-white/30 rounded-full" />
                  </div>
                </div>
              </div>
              {/* Download button */}
              <button
                onClick={() => downloadFrame(i, frame.label)}
                className="absolute -top-2 -right-2 w-8 h-8 bg-[#654DDF] hover:bg-[#7c63e8] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg shadow-[#654DDF]/30"
                title={`Exporter ${frame.label} en PNG`}
              >
                <Download size={13} />
              </button>
            </div>
            <div className="mt-3 text-center">
              <p className="text-white text-sm font-semibold">{frame.label}</p>
              <div className="flex justify-center mt-1">
                <div className="w-4 h-1 rounded-full" style={{ backgroundColor: frame.color === "#000000" ? "#654DDF" : frame.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Components showcase */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-8">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-6">Composants réutilisables</p>
        <div className="grid md:grid-cols-2 gap-8">
          {/* Buttons */}
          <div>
            <p className="text-white text-sm font-semibold mb-3">Boutons</p>
            <div className="flex flex-wrap gap-2">
              <button className="bg-[#654DDF] text-white text-sm font-bold px-5 py-2.5 rounded-xl">Primaire</button>
              <button className="border border-border text-white text-sm font-semibold px-5 py-2.5 rounded-xl">Secondaire</button>
              <button className="bg-[#2ECC71] text-white text-sm font-bold px-5 py-2.5 rounded-xl">Succès</button>
              <button className="bg-[#E74C3C] text-white text-sm font-bold px-5 py-2.5 rounded-xl">Alerte</button>
              <button className="bg-[#654DDF]/20 text-[#a08fff] text-sm font-semibold px-5 py-2.5 rounded-xl border border-[#654DDF]/30">Ghost</button>
            </div>
          </div>
          {/* Badges */}
          <div>
            <p className="text-white text-sm font-semibold mb-3">Badges catégories</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(CATEGORY_COLORS).map(([cat, cls]) => (
                <span key={cat} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>{cat}</span>
              ))}
              <span className="bg-[#E74C3C] text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />URGENT
              </span>
            </div>
          </div>
          {/* Input */}
          <div>
            <p className="text-white text-sm font-semibold mb-3">Champs de saisie</p>
            <div className="space-y-2">
              <input className="w-full bg-input-background border border-border text-white placeholder:text-muted-foreground rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#654DDF]/60 transition-colors" placeholder="Champ normal" />
              <input className="w-full bg-input-background border border-[#654DDF]/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none" defaultValue="Champ focus" />
              <input className="w-full bg-input-background border border-[#E74C3C]/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none" placeholder="Champ erreur" />
            </div>
          </div>
          {/* Cards */}
          <div>
            <p className="text-white text-sm font-semibold mb-3">Carte campagne</p>
            <div className="bg-[#121212] rounded-2xl overflow-hidden border border-border">
              <div className="h-24 bg-[#654DDF]/20 relative">
                <div className="absolute top-2 left-2 bg-[#E74C3C] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-white animate-pulse inline-block" />URGENT
                </div>
              </div>
              <div className="p-3 space-y-2">
                <p className="text-white text-xs font-semibold">Opération chirurgicale de Mama Ngono</p>
                <div className="bg-[#654DDF] rounded-full p-1">
                  <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full" style={{ width: "53%" }} />
                  </div>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-white font-bold">53%</span>
                  <span className="text-[#654DDF] font-bold">1 850 000 FCFA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer({ setScreen }: { setScreen: (s: Screen) => void }) {
  return (
    <footer className="border-t border-border bg-[#0a0a0a] mt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-8">
        {/* Top grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <button onClick={() => setScreen("home")} className="flex items-center gap-2.5 focus:outline-none">
              <div className="w-9 h-9 bg-[#654DDF] flex items-center justify-center">
                <div className="w-5 h-2.5 rounded-full bg-white" />
              </div>
              <span className="font-black text-white text-2xl tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
                Sungku
              </span>
            </button>
            <p className="text-muted-foreground text-sm leading-relaxed">
              La plateforme de collecte de fonds solidaire d&apos;Afrique centrale. Mobile money, carte bancaire, USSD — sans frontières.
            </p>
            {/* Social links */}
            <div className="flex items-center gap-3">
              {[
                { label: "Facebook", icon: "f" },
                { label: "Twitter/X", icon: "𝕏" },
                { label: "WhatsApp", icon: "w" },
                { label: "Instagram", icon: "ig" },
              ].map(s => (
                <button
                  key={s.label}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-xl bg-card border border-border text-muted-foreground hover:text-white hover:border-[#654DDF]/50 transition-colors flex items-center justify-center text-xs font-bold"
                >
                  {s.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Plateforme */}
          <div className="space-y-4">
            <p className="text-white text-sm font-semibold uppercase tracking-wider">Plateforme</p>
            <ul className="space-y-2.5">
              {[
                { label: "Explorer les campagnes", screen: "home" as Screen },
                { label: "Créer une cagnotte", screen: "create" as Screen },
                { label: "Comment ça marche", screen: "home" as Screen },
                { label: "Catégories", screen: "home" as Screen },
                { label: "Campagnes urgentes", screen: "home" as Screen },
              ].map(l => (
                <li key={l.label}>
                  <button
                    onClick={() => setScreen(l.screen)}
                    className="text-muted-foreground hover:text-white text-sm transition-colors"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Paiement */}
          <div className="space-y-4">
            <p className="text-white text-sm font-semibold uppercase tracking-wider">Paiement</p>
            <ul className="space-y-2.5">
              {[
                "Orange Money",
                "MTN MoMo",
                "Carte bancaire (Diaspora)",
                "NFC / Tap to Pay",
                "Code USSD",
                "Frais & transparence",
              ].map(l => (
                <li key={l}>
                  <span className="text-muted-foreground text-sm">{l}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <p className="text-white text-sm font-semibold uppercase tracking-wider">Support</p>
            <ul className="space-y-2.5">
              {[
                "Centre d'aide",
                "Signaler une campagne",
                "Conformité COBAC",
                "Presse & médias",
                "Nous contacter",
              ].map(l => (
                <li key={l}>
                  <span className="text-muted-foreground hover:text-white text-sm transition-colors cursor-pointer">{l}</span>
                </li>
              ))}
            </ul>
            {/* Contact */}
            <div className="pt-2 space-y-1.5">
              <p className="text-muted-foreground text-xs flex items-center gap-2">
                <span className="text-[#654DDF]">✉</span> support@sungku.cm
              </p>
              <p className="text-muted-foreground text-xs flex items-center gap-2">
                <span className="text-[#654DDF]">📞</span> +237 6XX XXX XXX
              </p>
            </div>
          </div>
        </div>

        {/* App stores + USSD */}
        <div className="border-t border-border pt-8 pb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <p className="text-white text-sm font-semibold mb-3">Téléchargez l&apos;application</p>
              <div className="flex gap-3">
                {[
                  { label: "App Store", sub: "iOS", icon: "" },
                  { label: "Google Play", sub: "Android", icon: "" },
                ].map(a => (
                  <button
                    key={a.label}
                    className="flex items-center gap-3 bg-card border border-border hover:border-[#654DDF]/50 rounded-xl px-4 py-2.5 transition-colors"
                  >
                    <span className="text-xl">{a.icon}</span>
                    <div className="text-left">
                      <p className="text-muted-foreground text-xs">{a.sub}</p>
                      <p className="text-white text-sm font-semibold">{a.label}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* USSD pill */}
            <div className="bg-[#654DDF]/15 border border-[#654DDF]/30 rounded-2xl px-6 py-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-[#654DDF] flex items-center justify-center shrink-0">
                <div className="w-6 h-3 rounded-full bg-white" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Accès USSD sans internet</p>
                <p className="text-white font-black text-lg font-mono tracking-widest">*126#</p>
              </div>
            </div>

            {/* Payment badges */}
            <div>
              <p className="text-muted-foreground text-xs mb-3">Paiements sécurisés via</p>
              <div className="flex flex-wrap gap-2">
                {["Orange Money", "MTN MoMo", "CinetPay", "Visa", "Mastercard"].map(p => (
                  <span
                    key={p}
                    className="bg-card border border-border text-muted-foreground text-xs px-3 py-1.5 rounded-lg"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2025 Sungku SAS. Tous droits réservés. Plateforme agréée BEAC/COBAC.</p>
          <div className="flex items-center gap-5">
            {["Conditions d'utilisation", "Politique de confidentialité", "Cookies"].map(l => (
              <button key={l} className="hover:text-white transition-colors">{l}</button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [activeCampaign, setActiveCampaign] = useState<Campaign>(CAMPAIGNS[0]);
  const [liveCampaigns, setLiveCampaigns] = useState<Campaign[]>([]);

  async function refreshCampaigns() {
    try {
      setLiveCampaigns(await apiClient.list());
    } catch {
      /* API offline — fall back to demo data only */
    }
  }

  useEffect(() => {
    refreshCampaigns();
  }, []);

  // Live campaigns first, then demo campaigns (for a full-looking gallery)
  const allCampaigns = [...liveCampaigns, ...CAMPAIGNS];

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "Inter, sans-serif" }}>
      <Navbar screen={screen} setScreen={setScreen} />
      {screen === "home" && (
        <HomeScreen
          campaigns={allCampaigns}
          setScreen={setScreen}
          setActiveCampaign={setActiveCampaign}
        />
      )}
      {screen === "campaign" && <CampaignScreen campaign={activeCampaign} setScreen={setScreen} />}
      {screen === "create" && <CreateScreen setScreen={setScreen} onPublished={refreshCampaigns} />}
      {screen === "contribute" && (
        <ContributeScreen campaign={activeCampaign} setScreen={setScreen} onContributed={refreshCampaigns} />
      )}
      {screen === "dashboard" && <DashboardScreen setScreen={setScreen} />}
      {screen === "mockups" && <MockupsScreen setScreen={setScreen} />}
      <Footer setScreen={setScreen} />
    </div>
  );
}
