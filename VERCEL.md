# Déploiement sur Vercel

Vercel est idéal pour le **frontend Next.js** (`apps/web`). L'**API Express** (`apps/api`),
elle, est un serveur long-running avec une base de données : Vercel étant serverless, on la
déploie plutôt sur un hébergeur de conteneurs/serveurs (Railway, Render, Fly.io…) avec PostgreSQL.

## Architecture recommandée

```
Navigateur ──► Vercel (Next.js, apps/web)  ──►  API (Railway/Render, apps/api) ──► PostgreSQL
                                                     └─► Camoo, SMTP, SMS (TextBelt)
```

## 1. Déployer le frontend sur Vercel

1. Poussez le dépôt sur GitHub (déjà fait : branche `preprod`).
2. Sur https://vercel.com → **Add New Project** → importez `efoka24-ops/sungku`.
3. **Root Directory** : `apps/web` (important — c'est un monorepo).
4. Framework détecté : **Next.js** (laisser les valeurs par défaut, `vercel.json` est fourni).
5. **Environment Variables** :
   - `NEXT_PUBLIC_API_URL` = URL publique de votre API (ex. `https://sungku-api.up.railway.app`).
     > `NEXT_PUBLIC_*` est injecté au build : après un changement, redéployez.
6. **Deploy**. Vercel fournit une URL `https://sungku-xxx.vercel.app`.
7. (Option) Branche `preprod` → environnement *Preview* ; `main` → *Production*.

## 2. Déployer l'API (hors Vercel)

Exemple avec **Railway** ou **Render** :

1. Nouveau service à partir du dépôt, **Root Directory** `apps/api` (le `Dockerfile` est fourni).
2. Ajoutez une base **PostgreSQL** gérée ; récupérez son `DATABASE_URL`.
3. Passez Prisma sur Postgres : dans `apps/api/prisma/schema.prisma`, mettez
   `provider = "postgresql"`, puis créez les migrations Postgres (voir `DEPLOY.md`).
4. Variables d'environnement (voir `apps/api/.env.example`) :
   `DATABASE_URL`, `NODE_ENV=production`, `APP_PUBLIC_URL` (URL publique de l'API),
   `JWT_SECRET`, `CAMOO_API_KEY`, `CAMOO_API_SECRET`, `SMTP_*`, `SMS_PROVIDER`,
   `SMS_TEXTBELT_KEY`, `ADMIN_EMAILS`.
5. Le conteneur applique les migrations puis démarre (`prisma migrate deploy && node dist/index.js`).

## 3. Relier les deux

- Mettez l'URL publique de l'API dans `NEXT_PUBLIC_API_URL` côté Vercel, puis redéployez le web.
- Mettez `APP_PUBLIC_URL` = URL publique de l'API : Camoo appellera
  `{APP_PUBLIC_URL}/payments/webhooks/camoo` (HTTPS, signé HMAC).
- CORS : l'API autorise déjà toutes les origines (`cors()`) ; restreignez au domaine Vercel en prod
  si souhaité.

## Note : tout sur Vercel ?

On peut aussi héberger l'API en *Serverless Functions* Vercel, mais il faut :
alléger Express en handlers serverless, utiliser un PostgreSQL managé (Vercel Postgres / Neon),
et remplacer les webhooks longue durée. La séparation web (Vercel) + API (conteneur) reste la
voie la plus simple et la plus fiable ici.
