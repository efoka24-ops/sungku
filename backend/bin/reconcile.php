<?php

declare(strict_types=1);

/**
 * Rapprochement des contributions restées en attente.
 *
 * À planifier dans le cron cPanel, toutes les 5 minutes (voir README pour la
 * ligne de crontab exacte — elle ne peut pas figurer dans ce commentaire, la
 * séquence d'un intervalle cron le refermerait).
 *
 * Pourquoi c'est indispensable et pas un confort : l'API pawaPay est
 * asynchrone et il n'existe aucun processus permanent sur un hébergement
 * mutualisé. Si un callback se perd — déploiement en cours, coupure réseau,
 * erreur 500 passagère — la contribution reste en attente pour toujours et
 * l'argent encaissé n'est jamais crédité à la cagnotte. Ce script est le
 * filet qui garantit qu'aucune transaction ne reste bloquée, même en perdant
 * la totalité des callbacks.
 */

use Sungku\Core\Env;
use Sungku\Core\Logger;
use Sungku\Payments\DepositService;
use Sungku\Payments\StatusMapper;

require dirname(__DIR__) . '/autoload.php';

Env::load(dirname(__DIR__) . '/.env');

$deposits = new DepositService();

// 15 minutes : au-delà, un callback non reçu est l'explication la plus
// probable. En deçà, le client est simplement en train de saisir son PIN.
$minutes = (int) (Env::get('RECONCILE_AFTER_MINUTES', '15') ?? '15');
$abandonAfter = (int) (Env::get('ABANDON_AFTER_HOURS', '24') ?? '24');

$pending = $deposits->stale($minutes);
$resolved = 0;
$flagged = 0;

foreach ($pending as $row) {
    $depositId = (string) $row['id'];

    try {
        $contribution = $deposits->refresh($depositId);
    } catch (Throwable $e) {
        Logger::payment('Rapprochement en échec', ['depositId' => $depositId, 'erreur' => $e->getMessage()]);
        continue;
    }

    if ($contribution === null) {
        continue;
    }

    if (StatusMapper::isFinal($contribution['status'])) {
        ++$resolved;
        continue;
    }

    // Toujours indéterminée après des heures : on cesse d'interroger pawaPay
    // en boucle et on la remonte à un humain. Surtout pas FAILED — l'argent a
    // peut-être bougé, et la déclarer échouée effacerait le problème sans le
    // résoudre.
    $age = time() - strtotime((string) $contribution['created_at']);
    if ($age > $abandonAfter * 3600) {
        \Sungku\Core\Db::execute(
            'UPDATE contributions SET status = :status, updated_at = NOW() WHERE id = :id',
            ['status' => StatusMapper::NEEDS_ATTENTION, 'id' => $depositId],
        );

        Logger::payment('Passée en vérification humaine', ['depositId' => $depositId, 'ageHeures' => (int) ($age / 3600)]);

        // Une transaction indéterminée qui dort dans une table ne se résout
        // jamais : il faut qu'un humain soit prévenu le jour même.
        \Sungku\Mail\Notifications::make()->needsAttention($contribution);

        ++$flagged;
    }
}

// Les reversements suivent la même règle : un callback perdu laisserait un
// envoi en attente indéfiniment, et son montant resterait bloqué hors du
// solde disponible de l'organisateur.
$payouts = new \Sungku\Payments\PayoutService();
$reversements = 0;

foreach ($payouts->stale($minutes) as $row) {
    try {
        $payouts->refresh((string) $row['id']);
        ++$reversements;
    } catch (Throwable $e) {
        Logger::payment('Rapprochement de reversement en échec', [
            'payoutId' => $row['id'],
            'erreur' => $e->getMessage(),
        ]);
    }
}

printf(
    "[%s] %d contributions examinées, %d tranchées, %d à vérifier ; %d reversements rapprochés.\n",
    gmdate('c'),
    count($pending),
    $resolved,
    $flagged,
    $reversements,
);
