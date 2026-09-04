# Sungku — Plateforme de collecte de fonds

Plateforme de cagnottes pour l'écosystème Sungku : création et partage de
campagnes, contributions par mobile money (MTN MoMo / Orange Money Cameroun).
Paiements traités via l'**API Merchant pawaPay v2**.

## Structure

- `backend/` — API PHP 8.1, sans framework ni Composer, déployée par FTPS sur
  l'hébergement mutualisé. Voir [backend/README.md](backend/README.md).

## Déploiement

| | |
|---|---|
| Domaine | `sungku.trugroup.cm` |
| Racine web | `/home/trugro9159/sungku/public_html` |
| Base | MySQL 8 (`phpMyAdmin` : `pma-12.camoo.net`) |
| Livraison | GitHub Actions → FTPS, sur poussée `main` touchant `backend/` |

Une poussée sur `main` vérifie la syntaxe PHP puis transfère `backend/` par
FTPS. Le `.env` du serveur et les journaux sont exclus du miroir : les secrets
ne transitent jamais par GitHub et survivent aux déploiements.

## Paiements

`POST /campaigns/{slug}/contributions` déclenche un dépôt pawaPay ; le statut
final arrive par callback sur `POST /payments/callbacks/pawapay`, doublé d'un
cron de rapprochement.

Trois règles gouvernent le traitement de l'argent, détaillées dans
[backend/README.md](backend/README.md) : la contribution est persistée avant
tout appel sortant, un échec doit être prouvé, et le contenu d'un callback
n'est jamais cru sur parole.
