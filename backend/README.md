# Sungku — socle backend

API de cagnottes en PHP 8.1, sans framework ni Composer, conçue pour un
hébergement mutualisé cPanel déployé par FTPS.

## Arborescence

```
sungku/                   ← racine applicative, HORS du dossier web
├── .env                  secrets — jamais versionné, jamais servi
├── autoload.php          autoloader PSR-4 : Sungku\ → app/
├── app/
│   ├── Core/             Env, Db, Router, Request, Response, Logger
│   ├── Http/             Session + contrôleurs
│   ├── Payments/         PawaPayClient, DepositService, StatusMapper
│   └── Support/          Uuid, Msisdn
├── bin/                  migrate.php, reconcile.php
├── database/migrations/  SQL numérotées, rejouables
├── storage/logs/         journaux applicatifs
└── public_html/          ← seul dossier exposé par Apache
    ├── index.php         front controller unique
    └── .htaccess
```

**Le code vit un cran au-dessus de `public_html`.** Une erreur de configuration
Apache sur un `.php` en renvoie le code source ; si ce fichier contient le token
pawaPay, le compte marchand est compromis. Hors du dossier web, le risque
n'existe pas.

**Pas de Composer.** Le déploiement se fait par FTP et l'accès shell n'est pas
garanti : un `vendor/` de plusieurs milliers de fichiers rendrait chaque
livraison interminable, pour un besoin que quinze lignes d'autoloader couvrent.

## Routes

| Méthode | Route | |
|---|---|---|
| `GET` | `/health` | sonde |
| `POST` | `/auth/register` · `/auth/login` · `/auth/logout` | |
| `GET` | `/auth/me` | session courante |
| `GET` | `/campaigns` | campagnes actives + montant collecté |
| `POST` | `/campaigns` | création (rôle `ORGANIZER`) |
| `GET` | `/campaigns/{slug}` | détail + jauge |
| `GET` | `/campaigns/{slug}/contributions` | mur des contributeurs (confirmées) |
| `POST` | `/campaigns/{slug}/contributions` | **encaisser** |
| `GET` | `/contributions/{id}` | statut, avec vérification à la demande |
| `GET` | `/payments/providers` | opérateurs opérationnels |
| `POST` | `/payments/predict-provider` | valider un numéro, deviner l'opérateur |
| `POST` | `/payments/callbacks/pawapay` | callback pawaPay |

## Paiements — ce qui protège l'argent

**L'identifiant existe avant l'appel sortant.** La contribution est écrite en
base *avant* que quoi que ce soit ne parte vers pawaPay, avec un `depositId`
qui sert aussi de clé primaire. Une coupure au pire moment laisse donc toujours
une trace exploitable — c'est ce qui rend le rapprochement possible.

**`FAILED` exige une preuve.** Un timeout, un HTTP 500 ou un `UNKNOWN_ERROR` ne
prouvent rien : l'argent a peut-être bougé. Seuls un rejet explicite ou un
`NOT_FOUND` à la vérification autorisent à conclure à l'échec. Dans le doute, la
contribution reste en attente, puis passe en `NEEDS_ATTENTION`.

**Le callback n'est pas cru sur parole.** Son corps sert de signal, pas de
source : à réception, le service interroge `GET /v2/deposits/{id}` pour
connaître l'état réel. Un callback falsifié, dupliqué ou arrivé dans le
désordre est donc sans effet — et la signature HTTP pawaPay (optionnelle,
ECDSA P-256 / RFC 9421) devient un durcissement souhaitable plutôt qu'un
prérequis.

**Un cron de rapprochement.** L'API pawaPay est asynchrone et il n'existe aucun
processus permanent sur du mutualisé. Sans ce cron, un callback perdu laisse la
contribution en attente pour toujours et l'argent encaissé n'est jamais crédité.

### Statuts

| | |
|---|---|
| `PENDING` | créée, le payeur n'a pas encore validé |
| `PROCESSING` | en cours chez l'opérateur |
| `CONFIRMED` | fonds effectivement collectés |
| `FAILED` | échec **prouvé**, aucun mouvement de fonds |
| `NEEDS_ATTENTION` | issue indéterminée — **ne jamais traiter comme un échec** |

Seules les `CONFIRMED` alimentent la jauge et le mur des contributeurs.

## Installation

```bash
cp .env.example .env      # puis renseigner base et token pawaPay
php bin/migrate.php
```

Sans accès shell, les migrations se jouent aussi en collant le contenu de
`database/migrations/*.sql` dans phpMyAdmin.

### Cron cPanel (toutes les 5 minutes)

```
*/5 * * * * /usr/local/bin/php /home/trugro9159/sungku/bin/reconcile.php >> /home/trugro9159/sungku/storage/logs/cron.log 2>&1
```

### Callback à déclarer dans le dashboard pawaPay

```
https://sungku.trugroup.cm/payments/callbacks/pawapay
```

## Déploiement

Une poussée sur `main` touchant `backend/` déclenche
`.github/workflows/deploy-backend.yml` : vérification de la syntaxe PHP, puis
miroir FTPS vers l'hébergeur. Secrets GitHub attendus : `FTP_HOST`, `FTP_USER`,
`FTP_PASSWORD`.

Le workflow ne supprime rien à distance et exclut `.env` et les journaux : les
secrets du serveur ne transitent jamais par GitHub et survivent aux
déploiements.
