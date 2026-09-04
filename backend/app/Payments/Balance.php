<?php

declare(strict_types=1);

namespace Sungku\Payments;

use Sungku\Core\Db;
use Sungku\Core\Settings;

/**
 * Solde reversable d'une collecte.
 *
 * Deux règles gouvernent ce calcul, et elles protègent des deux erreurs les
 * plus coûteuses de la plateforme :
 *
 * 1. Seules les contributions CONFIRMED comptent. Reverser sur des
 *    contributions en attente, c'est envoyer de l'argent qui n'est pas encore
 *    arrivé — et qui peut ne jamais arriver.
 * 2. Les reversements en attente sont déduits comme s'ils avaient abouti. Un
 *    reversement en cours n'est pas encore débité, mais le compter comme
 *    disponible autoriserait un second envoi du même argent.
 */
final class Balance
{
    /**
     * @return array{gross:int, fee_rate:float, fee:int, net:int, paid:int,
     *               pending:int, available:int}
     */
    public static function forCampaign(int $campaignId, ?float $feeRate = null): array
    {
        $campaign = Db::selectOne(
            'SELECT category, fee_rate FROM campaigns WHERE id = :id',
            ['id' => $campaignId],
        );

        $rate = $feeRate ?? (float) ($campaign['fee_rate'] ?? Settings::feeFor((string) ($campaign['category'] ?? 'AUTRE')));

        $gross = (int) (Db::selectOne(
            'SELECT COALESCE(SUM(amount), 0) AS total FROM contributions
              WHERE campaign_id = :id AND status = :confirmed',
            ['id' => $campaignId, 'confirmed' => StatusMapper::CONFIRMED],
        )['total'] ?? 0);

        $fee = Settings::feeAmount($gross, $rate);
        $net = $gross - $fee;

        $reverses = Db::selectOne(
            'SELECT
                COALESCE(SUM(CASE WHEN status = :confirmed THEN gross_amount END), 0) AS paye,
                COALESCE(SUM(CASE WHEN status IN (:pending, :processing, :attention)
                                  THEN gross_amount END), 0) AS engage
               FROM payouts WHERE campaign_id = :id',
            [
                'id' => $campaignId,
                'confirmed' => StatusMapper::CONFIRMED,
                'pending' => StatusMapper::PENDING,
                'processing' => StatusMapper::PROCESSING,
                // NEEDS_ATTENTION compte comme engagé : l'argent est peut-être
                // parti, on ne le remet pas à disposition.
                'attention' => StatusMapper::NEEDS_ATTENTION,
            ],
        );

        $paye = (int) ($reverses['paye'] ?? 0);
        $engage = (int) ($reverses['engage'] ?? 0);

        return [
            'gross' => $gross,
            'fee_rate' => $rate,
            'fee' => $fee,
            'net' => $net,
            'paid' => $paye,
            'pending' => $engage,
            'available' => max(0, $gross - $paye - $engage),
        ];
    }

    /** Totaux plateforme, pour les tuiles du back-office. */
    public static function platform(): array
    {
        $collecte = (int) (Db::selectOne(
            'SELECT COALESCE(SUM(amount), 0) AS t FROM contributions WHERE status = :c',
            ['c' => StatusMapper::CONFIRMED],
        )['t'] ?? 0);

        $row = Db::selectOne(
            'SELECT
                COALESCE(SUM(CASE WHEN status = :confirmed THEN fee_amount END), 0) AS commissions,
                COALESCE(SUM(CASE WHEN status = :confirmed2 THEN amount END), 0) AS reverse,
                COALESCE(SUM(CASE WHEN status IN (:pending, :processing) THEN amount END), 0) AS en_cours
               FROM payouts',
            [
                'confirmed' => StatusMapper::CONFIRMED,
                'confirmed2' => StatusMapper::CONFIRMED,
                'pending' => StatusMapper::PENDING,
                'processing' => StatusMapper::PROCESSING,
            ],
        );

        return [
            'collecte' => $collecte,
            'commissions' => (int) ($row['commissions'] ?? 0),
            'reverse' => (int) ($row['reverse'] ?? 0),
            'en_cours' => (int) ($row['en_cours'] ?? 0),
            // Ce que la plateforme détient encore pour le compte des
            // organisateurs : collecté moins ce qui est déjà sorti.
            'a_reverser' => max(0, $collecte - (int) ($row['reverse'] ?? 0)
                - (int) ($row['commissions'] ?? 0) - (int) ($row['en_cours'] ?? 0)),
        ];
    }
}
