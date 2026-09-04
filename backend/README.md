# Sungku — socle backend

API de cagnottes en PHP 8.1, sans framework ni Composer, conçue pour un
hébergement mutualisé cPanel déployé par FTPS.

## Arborescence

```
/home/trugro9159/sungku/  ← racine web du sous-domaine
├── index.php             front controller unique
├── .htaccess             réécriture, HTTPS forcé, refus des dossiers de code
├── .env                  secrets — jamais versionné, refusé par .htaccess
├── autoload.php          autoloader PSR-4 : Sungku\ → app/
├── app/                  + .htaccess « Require all denied »
│   ├── Core/             Env, Db, Router, Request, Response, Logger
│   ├── Http/             Session + contrôleurs
│   ├── Mail/             Mailer SMTP, Notifications
│   ├── Payments/         PawaPayClient, DepositService, StatusMapper
│   └── Support/          Uuid, Msisdn
├── bin/                  migrate.php, reconcile.php        + deny
├── database/migrations/  SQL numérotées, rejouables         + deny
└── storage/logs/         journaux applicatifs               + deny
```

**Le code partage le dossier servi par Apache, et c'est subi.** Le compte FTP
est cloisonné sur `/home/trugro9159/sungku`, qui est aussi la racine web du
sous-domaine : impossible de placer le code au-dessus. La protection repose
donc sur deux couches — une règle de réécriture `[F]` dans le `.htaccess`
racine, et un `Require all denied` dans chaque dossier de code. Le `.env`, qui
porte le token pawaPay et les accès base, est refusé par nom de fichier.

Si l'hébergeur permet un jour de déplacer la racine web vers un sous-dossier,
c'est la meilleure des corrections : la question ne se poserait plus.

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
| `POST` | `/internal/migrate` | applique les migrations (en-tête `X-Migrate-Key`) |
| `GET` | `/internal/status` | diagnostic de configuration (même en-tête) |

Les deux routes `/internal` tiennent lieu d'accès shell, absent de cet
hébergement. Elles répondent `503` tant que `MIGRATE_KEY` n'est pas définie —
un endpoint de migration ouvert laisserait n'importe qui rejouer le schéma — et
comparent la clé avec `hash_equals`, une comparaison ordinaire s'arrêtant au
premier caractère différent.

## HTTPS n'est pas optionnel

Le cookie de session est marqué `Secure` : sur HTTP, le navigateur le reçoit
mais ne le renvoie jamais, et **toute authentification échoue**. C'est
volontaire — une session transportée en clair est rejouable par quiconque
observe le réseau. Tant qu'AutoSSL n'est pas actif sur le domaine, seules les
routes publiques (`/health`, `/campaigns`, `/payments/providers`) fonctionnent.

pawaPay ne livre par ailleurs ses callbacks qu'en HTTPS, et la redirection
`http → https` du `.htaccess` reste commentée jusqu'à la délivrance du
certificat : l'activer avant renverrait chaque requête vers une URL morte.

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

## Messagerie

Client SMTP authentifié écrit sur sockets (`app/Mail/Mailer.php`), sans
dépendance. `mail()` n'est pas utilisé : sur mutualisé il part avec l'identité
de l'utilisateur système, sans authentification, et les messages finissent en
indésirable — inacceptable pour un reçu de paiement. Passer par le compte
`noreply@` authentifié aligne l'expéditeur sur le domaine et respecte SPF.

Deux messages partent à la confirmation d'une contribution : le reçu au
contributeur — si et seulement s'il a laissé une adresse, facultative pour un
paiement mobile money — et l'alerte à l'organisateur avec le total collecté.
Un troisième prévient `ADMIN_ALERT_EMAIL` quand une transaction passe en
`NEEDS_ATTENTION`.

**Un seul envoi par contribution.** Le callback pawaPay et le cron peuvent
constater la confirmation à quelques secondes d'intervalle ; le droit
d'envoyer est réclamé par un `UPDATE … WHERE notified_at IS NULL` atomique,
donc une seule des deux exécutions envoie. Un test suivi d'une écriture
laisserait une fenêtre pour un double reçu.

Un incident de messagerie n'interrompt jamais un paiement : l'envoi est tracé
dans `storage/logs/mail-*.log` et l'erreur avalée.

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
