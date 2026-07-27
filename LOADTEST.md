# Test de montée en charge

## Objectif visé : 200 000 connexions simultanées — la réalité

200 000 connexions **simultanées** est une très grande échelle (ordre de grandeur d'une plateforme
nationale à fort trafic). Il faut être clair sur deux points :

1. **L'infrastructure actuelle ne peut pas le supporter.** L'API tourne sur **un seul conteneur
   Railway (offre gratuite)** qui se met en veille et gère au mieux quelques centaines de connexions.
   Lancer 200 000 connexions dessus reviendrait à **se DoS soi-même** : le test échouerait sans rien
   prouver d'utile, et pourrait être vu comme un abus par l'hébergeur.
2. **On ne génère pas 200 000 connexions depuis une seule machine** (limites de descripteurs de
   fichiers / ports). Il faut des **générateurs de charge distribués** (k6 Cloud, ou plusieurs machines).

## Ce qu'il faut pour SUPPORTER 200 000 connexions simultanées

| Domaine | Aujourd'hui | Requis pour 200k |
|---|---|---|
| API | 1 conteneur | **Autoscaling horizontal** (N instances derrière un load balancer) |
| État | JWT (déjà stateless ✅) | OK — l'API doit rester stateless |
| Base de données | 1 PostgreSQL | **Pooling de connexions** (PgBouncer / Prisma Accelerate) + read replicas. Postgres gère ~100–500 connexions : 200k clients doivent les partager |
| Temps réel | polling toutes les 4–5 s | 200k × (1/4s) = **~50 000 req/s** → passer à **WebSocket/SSE** ou **cache edge** (les lectures `/campaigns` mises en cache 2–5 s) |
| Frontend | Vercel (CDN) ✅ | OK (edge global) |
| Protection | rate limiting appli | + **WAF / anti-DDoS** en façade (Cloudflare) |
| Paiements | Camoo synchrone | **File d'attente** (Redis/BullMQ) pour lisser les pics de webhooks |

## Lancer le test (à échelle raisonnable)

1. Installez **k6** : https://k6.io/docs/get-started/installation/
2. Idéalement, déployez un **environnement de staging** (mêmes Dockerfile/config) dimensionné pour le test.
3. Lancez la montée en charge progressive :

```bash
k6 run -e BASE_URL=https://VOTRE-STAGING loadtest/k6-campaigns.js
```

Le script monte les utilisateurs virtuels par paliers (50 → 200 → 500 → 1000) et vérifie :
- taux d'erreur < 5 %,
- p95 de latence < 1,5 s.

Augmentez les paliers (`stages`) au fur et à mesure que vous ajoutez de la capacité (instances,
pooling, cache). Pour dépasser quelques milliers d'utilisateurs virtuels, utilisez **k6 Cloud** ou
plusieurs agents.

## Recommandation

Ne lancez **pas** ce test contre la production gratuite. Créez d'abord un environnement de staging
scalable (ex. Railway/Render plan payant + Neon/PostgreSQL managé + Cloudflare), ajoutez le pooling
et le cache, puis montez la charge par paliers jusqu'à la cible.
