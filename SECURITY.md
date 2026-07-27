# Sécurité — Sungku

Sungku manipule de l'argent : la sécurité est traitée à deux niveaux (utilisateurs et plateforme/API).

## Mesures en place (code)

### Transport & en-têtes
- **HTTPS partout** (Vercel + Railway terminent le TLS).
- **Helmet** : en-têtes HTTP sécurisés (HSTS, X-Content-Type-Options, X-Frame-Options, etc.), `X-Powered-By` désactivé.

### API
- **CORS restreint** à une liste blanche d'origines (`CORS_ORIGINS`). Les appels serveur-à-serveur (webhooks Camoo, health) restent autorisés.
- **Rate limiting par IP** (`express-rate-limit`), derrière `trust proxy` pour utiliser la vraie IP client :
  - global : `RATE_LIMIT_GLOBAL` requêtes/minute,
  - auth/OTP : `RATE_LIMIT_AUTH` requêtes / 15 min (anti brute-force).
- **Limite de taille du corps** JSON (5 Mo) pour éviter les abus.
- **Gestionnaire d'erreurs global** : aucune stack trace exposée, pas de crash sur rejet async.

### Authentification & comptes
- **OTP par e-mail** (code à usage unique, TTL court) pour inscription, connexion nouvel appareil, et **double validation avant retrait**.
- **Sessions JWT** signées (secret `JWT_SECRET`), expiration 7 jours.
- **KYC** allégé à la création, renforcé (pièce d'identité) au-delà d'un seuil / catégories sensibles.
- **Rôles** : accès back-office réservé aux comptes `isAdmin` (liste `ADMIN_EMAILS`).

### Paiements
- **Tokenisation** : aucune donnée de paiement brute stockée ; on conserve seulement l'`id` de transaction du prestataire (Camoo).
- **Webhooks signés HMAC-SHA256** vérifiés (comparaison à temps constant) ; requêtes non signées rejetées en 401.
- **Réconciliation active** via Camoo `/verify` : les paiements réussis sont confirmés même si le webhook n'arrive pas.
- **Modération** des campagnes sensibles (santé, funérailles) avant publication.

### Données
- **Prisma** (requêtes paramétrées) → pas d'injection SQL.
- Secrets uniquement en variables d'environnement (jamais commités ; `.env` gitignoré).

## Recommandations / à faire pour la production

1. **Désactiver `OTP_EXPOSE`** en production (le laisser à `true` permet à quiconque de lire un code OTP). N'utiliser que temporairement.
2. **Régénérer les secrets** partagés en clair pendant le développement (mot de passe PostgreSQL, secret Camoo, mot de passe SMTP).
3. **Journalisation d'audit** (audit trail) des appels sensibles (retraits, changements de rôle, modération) pour la conformité BEAC/COBAC.
4. **E-mail transactionnel** avec SPF/DKIM (Resend/Brevo/SendGrid) pour la délivrabilité et éviter l'usurpation.
5. **Verrouillage de compte** après N échecs OTP répétés (au-delà du rate limiting).
6. **WAF / protection DDoS** en façade (Cloudflare) pour la montée en charge.
7. **Scans réguliers** (dépendances `npm audit`, secrets, CodeQL).
