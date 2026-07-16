import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sungku — Cagnottes",
  description: "Créez, gérez et partagez vos collectes de fonds avec Sungku.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-surface font-sans text-text-primary">{children}</body>
    </html>
  );
}
