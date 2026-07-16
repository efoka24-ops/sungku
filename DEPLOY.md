# Déploiement Sungku (preprod / production)

## Aperçu

Deux services applicatifs (`apps/api`, `apps/web`) + une base de données. En local/dev,
l'API utilise SQLite ; en preprod/production, utilisez PostgreSQL.

## 1. Variables d'environnement (secrets)

Créez un fichier `.env` à la racine (à côté de `docker-compose.yml`). **Ne commitez jamais ce fichier.**

```
POSTGRES_PASSWORD=...
APP_PUBLIC_URL=https://api.votre-domaine.cm        # URL PUBLIQUE de l'API (webhooks Camoo)
PUBLIC_API_URL=https://api.votre-domaine.cm        # URL de l'API vue par le navigateur
JWT_SECRET=<chaîne aléatoire longue>
CAMOO_API_KEY=...
CAMOO_API_SECRET=...
SMTP_HOST=mx-dc03.ewodi.net
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=NoReply SungkuFlow <...>
```

## 2. Passage à PostgreSQL (production)

SQLite est utilisé par défaut pour le dev. Pour la production :

1. Dans `apps/api/prisma/schema.prisma`, mettez `provider = "postgresql"` dans le bloc `datasource`.
2. Régénérez les migrations : `npx prisma migrate dev --name init_pg` (en pointant `DATABASE_URL` vers Postgres).
3. Les conteneurs appliquent ensuite les migrations au démarrage via `prisma migrate deploy`.

## 3. Lancement

```
docker compose up --build -d
```

- Web : http://localhost:3000
- API : http://localhost:4000

## 4. Webhooks de paiement (Camoo)

Camoo notifie l'API par `GET {APP_PUBLIC_URL}/payments/webhooks/camoo` (signé HMAC-SHA256).
`APP_PUBLIC_URL` doit donc être **publiquement joignable en HTTPS**.

- **Preprod/prod** : renseignez `APP_PUBLIC_URL` avec le domaine public de l'API.
- **Test en local** : exposez le port 4000 via un tunnel, par ex.
  `ngrok http 4000`, puis mettez l'URL HTTPS fournie dans `APP_PUBLIC_URL` et redémarrez l'API.
  Le `notification_url` envoyé à Camoo à chaque contribution utilisera automatiquement cette base.

## 5. Notifications

- E-mail organisateur (réel) à chaque contribution confirmée, via le SMTP configuré.
- SMS contributeur : `sendSms()` est actuellement un *stub* (log). Branchez un fournisseur SMS
  (API opérateur / passerelle) dans `apps/api/src/notifications.ts` quand les identifiants sont disponibles.

## 6. Tests end-to-end (Playwright)

```
cd apps/web
npm run test:e2e
```
Nécessite l'API et le web démarrés (ou laissez Playwright démarrer le web). Les tests couvrent
4 profils : visiteur, contributeur, organisateur, partenaire développeur.
En environnement non-production, l'OTP est exposé (champ `devCode` / « code test ») pour permettre
aux tests de compléter les flux ; ceci est automatiquement désactivé si `NODE_ENV=production`.
