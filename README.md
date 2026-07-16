# Sungku — Plateforme de collecte de fonds

Plateforme web de cagnottes (collecte de fonds) pour l'écosystème Sungku : création et
partage de campagnes, contributions par mobile money (Orange Money / MTN MoMo), carte
bancaire (diaspora), NFC et QR code. Paiements traités via l'**API Camoo Payment**.

## Structure (monorepo)

- `apps/api` — API REST (Node.js + Express + TypeScript + Prisma/SQLite)
- `apps/web` — Frontend (Next.js 14 + TypeScript + TailwindCSS)

## Démarrage

### API (`apps/api`) — http://localhost:4000
```bash
cd apps/api
npm install
npx prisma migrate dev
npm run dev
```
Configurer `apps/api/.env` (voir `.env.example`). Sans identifiants Camoo, les
contributions sont confirmées via une simulation locale (utile en développement).

### Web (`apps/web`) — http://localhost:3000
```bash
cd apps/web
npm install
npm run dev
```
Configurer `NEXT_PUBLIC_API_URL` dans `apps/web/.env.local` (défaut : `http://localhost:4000`).

## Paiements — Camoo Payment API

- `POST /campaigns/:id/contributions` déclenche un `cashout` Camoo pour les canaux mobile money.
- `GET /payments/webhooks/camoo` — webhook signé (HMAC-SHA256) de notification de statut, idempotent.
- `GET /payments/account` — solde du compte marchand.

Base API Camoo : `https://api.camoo.cm/v1/payment` (headers `X-Api-Key`, `X-Api-Secret`).

## Fonctionnalités MVP

- Accueil (recherche, filtres, campagnes urgentes)
- Création de campagne (lien de partage, QR code)
- Page publique de campagne (jauge « pilule », mur des contributeurs)
- Tunnel de contribution (mobile money, carte, NFC, QR)
- Tableau de bord organisateur

## À venir

- OAuth 2.0 / API partenaire, retrait de fonds effectif, modération back-office, KYC.
