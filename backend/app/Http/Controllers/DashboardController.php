<?php

declare(strict_types=1);

namespace Sungku\Http\Controllers;

use Sungku\Core\Db;
use Sungku\Core\Request;
use Sungku\Http\Session;
use Sungku\Http\View;
use Sungku\Payments\Balance;
use Sungku\Payments\StatusMapper;

/**
 * Espace organisateur : ses collectes, ses contributions.
 *
 * Toutes les requêtes filtrent sur l'organisateur connecté. Un tableau de bord
 * qui lit d'abord puis vérifie les droits ensuite finit toujours par laisser
 * fuir la ligne d'un autre — ici l'appartenance est dans le WHERE.
 */
final class DashboardController
{
    public function index(Request $request): void
    {
        $userId = Session::requireUser();

        $campaigns = Db::select(
            'SELECT c.id, c.slug, c.title, c.category, c.goal_amount, c.status,
                    c.moderation_status, c.created_at,
                    COALESCE(SUM(CASE WHEN ct.status = :confirmed THEN ct.amount END), 0) AS collected,
                    COUNT(CASE WHEN ct.status = :confirmed2 THEN 1 END) AS contributors
               FROM campaigns c
               LEFT JOIN contributions ct ON ct.campaign_id = c.id
              WHERE c.organizer_id = :uid
              GROUP BY c.id
              ORDER BY c.created_at DESC',
            [
                'confirmed' => StatusMapper::CONFIRMED,
                'confirmed2' => StatusMapper::CONFIRMED,
                'uid' => $userId,
            ],
        );

        $totaux = Db::selectOne(
            'SELECT
                COALESCE(SUM(CASE WHEN ct.status = :confirmed THEN ct.amount END), 0) AS collecte,
                COALESCE(SUM(CASE WHEN ct.status IN (:pending, :processing) THEN ct.amount END), 0) AS attente,
                COUNT(CASE WHEN ct.status = :confirmed2 THEN 1 END) AS confirmees
               FROM contributions ct
               JOIN campaigns c ON c.id = ct.campaign_id
              WHERE c.organizer_id = :uid',
            [
                'confirmed' => StatusMapper::CONFIRMED,
                'confirmed2' => StatusMapper::CONFIRMED,
                'pending' => StatusMapper::PENDING,
                'processing' => StatusMapper::PROCESSING,
                'uid' => $userId,
            ],
        );

        // Solde, commission et reversements sont agrégés à partir du solde de
        // chaque collecte : la règle de calcul ne vit qu'à un seul endroit.
        $solde = ['disponible' => 0, 'commission' => 0, 'reverse' => 0, 'en_cours' => 0];

        foreach ($campaigns as $i => $c) {
            $b = Balance::forCampaign((int) $c['id']);
            $campaigns[$i]['balance'] = $b;

            $solde['disponible'] += $b['available'];
            $solde['commission'] += $b['fee'];
            $solde['reverse'] += $b['paid'];
            $solde['en_cours'] += $b['pending'];
        }

        View::render(
            'tableau-organisateur',
            [
                'campaigns' => $campaigns,
                'totaux' => $totaux,
                'solde' => $solde,
                'onglet' => 'collectes',
                'espace' => 'organisateur',
            ],
            'Mes collectes — Sungku',
            'layout-app',
        );
    }

    public function contributions(Request $request): void
    {
        $userId = Session::requireUser();

        $contributions = Db::select(
            'SELECT ct.id, ct.amount, ct.status, ct.provider, ct.contributor_name,
                    ct.is_anonymous, ct.created_at, ct.failure_message, c.title, c.slug
               FROM contributions ct
               JOIN campaigns c ON c.id = ct.campaign_id
              WHERE c.organizer_id = :uid
              ORDER BY ct.created_at DESC
              LIMIT 200',
            ['uid' => $userId],
        );

        View::render(
            'tableau-contributions',
            [
                'contributions' => $contributions,
                'onglet' => 'contributions',
                'espace' => 'organisateur',
                'titre' => 'Contributions reçues',
            ],
            'Contributions — Sungku',
            'layout-app',
        );
    }
}
