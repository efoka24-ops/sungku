# Héberger l'API Sungku gratuitement (Render + Neon)

Solution 100 % gratuite pour la preprod :

| Composant | Service gratuit | Notes |
|---|---|---|
| Base de données | **Neon** (PostgreSQL serverless) | Offre gratuite sans expiration (~0,5 Go) |
| API | **Render** (Web Service) | Offre gratuite ; se met en veille après 15 min d'inactivité (1er appel ~50 s) |
| Frontend | **Vercel** | Voir `VERCEL.md` |

> La veille de Render est sans conséquence : Camoo réessaie ses webhooks, et le front réveille l'API au premier chargement.

---

## 1. Base de données gratuite — Neon

1. Créez un compte sur https://neon.tech (gratuit).
2. **New Project** → notez la **Connection string** (format `postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require`).

## 2. Passer Prisma sur PostgreSQL

En local, le projet utilise SQLite. Pour la production Postgres, un seul changement dans
`apps/api/prisma/schema.prisma` :

```prisma
datasource db {
  provider = "postgresql"   // au lieu de "sqlite"
  url      = env("DATABASE_URL")
}
```

Le déploiement Render exécute `prisma db push`, qui crée les tables directement à partir du
schéma (aucune migration spécifique à générer).

> Astuce : pour garder le dev local identique à la prod, mettez aussi votre `DATABASE_URL`
> Neon dans `apps/api/.env` et lancez `npx prisma db push`. Sinon, laissez SQLite en local.

## 3. Déployer l'API sur Render

**Option A — Blueprint (recommandé, `render.yaml` fourni)**
1. https://render.com → **New → Blueprint** → sélectionnez le dépôt `efoka24-ops/sungku` (branche `preprod`).
2. Render lit `render.yaml` et crée le service `sungku-api`.
3. Renseignez les variables marquées `sync: false` dans le dashboard :
   - `DATABASE_URL` = chaîne Neon
   - `APP_PUBLIC_URL` = URL publique de l'API (ex. `https://sungku-api.onrender.com`)
   - `CAMOO_API_KEY`, `CAMOO_API_SECRET`, `SMTP_*`, `ADMIN_EMAILS`
   - `JWT_SECRET` est généré automatiquement.
4. **Deploy**. L'API sera sur `https://sungku-api.onrender.com` (santé : `/health`).

**Option B — service manuel**
- New → **Web Service** → repo → **Root Directory** `apps/api`, Runtime **Node**, Plan **Free**
- Build : `npm install && npx prisma generate && npm run build`
- Start : `npx prisma db push --accept-data-loss && node dist/index.js`
- Ajoutez les variables d'environnement (voir `apps/api/.env.example`).

## 4. Relier le frontend (Vercel)

- Dans Vercel, mettez `NEXT_PUBLIC_API_URL` = URL publique Render, puis redéployez.
- Dans Render, `APP_PUBLIC_URL` = la même URL (utilisée pour le webhook Camoo signé
  `{APP_PUBLIC_URL}/payments/webhooks/camoo`).

## 5. SMS gratuit

`SMS_PROVIDER=textbelt` active l'envoi via TextBelt (offre gratuite : 1 SMS/jour avec la clé
`textbelt`). Laissez `stub` pour désactiver (log seulement).

---

## Déploiement sur Railway (utilisé ici)

L'API cible : `https://sungku-api-production.up.railway.app`

Si le domaine renvoie `404` avec l'en-tête `x-railway-fallback: true`, c'est qu'**aucun service
n'est réellement démarré** (config manquante). Réglage :

1. **Service → Settings → Root Directory = `apps/api`** (indispensable en monorepo).
   Le fichier `apps/api/railway.toml` fournit alors build + start + healthcheck.
2. **Variables** (Service → Variables) — voir `apps/api/.env.example` :
   - `DATABASE_URL` — pour un démarrage rapide (éphémère) : `file:./data.db`.
     Pour de la persistance : ajoutez le plugin **PostgreSQL** de Railway (il injecte `DATABASE_URL`),
     mettez `provider = "postgresql"` dans `schema.prisma`, et remplacez le start par `npx prisma db push`.
   - `APP_PUBLIC_URL = https://sungku-api-production.up.railway.app`
   - `JWT_SECRET`, `CAMOO_API_KEY`, `CAMOO_API_SECRET`, `SMTP_*`, `ADMIN_EMAILS`
   - `NODE_ENV = production`
3. **Redeploy**. Vérifiez `https://sungku-api-production.up.railway.app/health` → `{"status":"ok"}`.
4. (Option) Peupler les campagnes de démonstration : exécutez `npm run seed` depuis un shell Railway,
   ou via un déploiement one-off avec `startCommand = "npm run seed"`.

Le frontend est déjà pointé sur cette URL via `apps/web/.env.production`
(`NEXT_PUBLIC_API_URL`). Sur Vercel, la variable du dashboard prime si elle est définie.

## Autres options gratuites (équivalentes)

- **Koyeb** : un service web gratuit (base Postgres via Neon).
- **Fly.io** : petites VM gratuites (carte requise).
- **Supabase** : Postgres gratuit alternatif à Neon (se met en pause après 1 semaine d'inactivité).

Render + Neon reste le combo le plus simple et sans carte bancaire.
