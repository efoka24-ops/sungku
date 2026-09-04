<?php

declare(strict_types=1);

namespace Sungku\Http\Controllers;

use Sungku\Core\Db;
use Sungku\Core\Logger;
use Sungku\Core\Request;
use Sungku\Http\Csrf;
use Sungku\Http\Session;
use Sungku\Http\View;
use Sungku\Payments\DepositService;
use Sungku\Payments\StatusMapper;

/**
 * Back-office.
 *
 * Chaque action commence par requireRole('ADMIN'). Le contrôle est répété
 * méthode par méthode plutôt que posé une fois au routage : une route ajoutée
 * plus tard hériterait silencieusement de l'oubli.
 */
final class AdminController
{
    public function index(Request $request): void
    {
        Session::requireRole('ADMIN');

        $stats = Db::selectOne(
            'SELECT
                COALESCE(SUM(CASE WHEN status = :confirmed THEN amount END), 0) AS collecte,
                COUNT(CASE WHEN status = :confirmed2 THEN 1 END) AS confirmees,
                COUNT(CASE WHEN status IN (:pending, :processing) THEN 1 END) AS en_cours,
                COUNT(CASE WHEN status = :attention THEN 1 END) AS a_verifier
               FROM contributions',
            [
                'confirmed' => StatusMapper::CONFIRMED,
                'confirmed2' => StatusMapper::CONFIRMED,
                'pending' => StatusMapper::PENDING,
                'processing' => StatusMapper::PROCESSING,
                'attention' => StatusMapper::NEEDS_ATTENTION,
            ],
        );

        $compteurs = Db::selectOne(
            'SELECT
                (SELECT COUNT(*) FROM users) AS utilisateurs,
                (SELECT COUNT(*) FROM campaigns) AS collectes,
                (SELECT COUNT(*) FROM campaigns WHERE moderation_status = :attente) AS a_moderer',
            ['attente' => 'PENDING'],
        );

        // Les transactions à l'issue indéterminée passent en tête : ce sont
        // les seules qui demandent une décision humaine, et les seules où
        // l'argent peut avoir bougé sans être crédité.
        $aVerifier = Db::select(
            'SELECT ct.id, ct.amount, ct.status, ct.provider, ct.phone_number,
                    ct.failure_message, ct.created_at, c.title
               FROM contributions ct
               JOIN campaigns c ON c.id = ct.campaign_id
              WHERE ct.status = :attention
              ORDER BY ct.created_at DESC
              LIMIT 50',
            ['attention' => StatusMapper::NEEDS_ATTENTION],
        );

        View::render(
            'admin-ensemble',
            [
                'stats' => $stats,
                'compteurs' => $compteurs,
                'aVerifier' => $aVerifier,
                'onglet' => 'ensemble',
                'espace' => 'admin',
            ],
            'Vue d’ensemble — Admin Sungku',
            'layout-app',
        );
    }

    public function campaigns(Request $request): void
    {
        Session::requireRole('ADMIN');

        $campaigns = Db::select(
            'SELECT c.id, c.slug, c.title, c.category, c.goal_amount, c.status,
                    c.moderation_status, c.created_at, u.email AS organizer_email,
                    COALESCE(SUM(CASE WHEN ct.status = :confirmed THEN ct.amount END), 0) AS collected
               FROM campaigns c
               JOIN users u ON u.id = c.organizer_id
               LEFT JOIN contributions ct ON ct.campaign_id = c.id
              GROUP BY c.id
              ORDER BY (c.moderation_status = :attente) DESC, c.created_at DESC
              LIMIT 200',
            ['confirmed' => StatusMapper::CONFIRMED, 'attente' => 'PENDING'],
        );

        View::render(
            'admin-collectes',
            ['campaigns' => $campaigns, 'onglet' => 'collectes', 'espace' => 'admin'],
            'Collectes — Admin Sungku',
            'layout-app',
        );
    }

    public function contributions(Request $request): void
    {
        Session::requireRole('ADMIN');

        $contributions = Db::select(
            'SELECT ct.id, ct.amount, ct.status, ct.provider, ct.contributor_name,
                    ct.is_anonymous, ct.created_at, ct.failure_message, c.title, c.slug
               FROM contributions ct
               JOIN campaigns c ON c.id = ct.campaign_id
              ORDER BY ct.created_at DESC
              LIMIT 200',
        );

        View::render(
            'tableau-contributions',
            [
                'contributions' => $contributions,
                'onglet' => 'contributions',
                'espace' => 'admin',
                'titre' => 'Toutes les contributions',
            ],
            'Contributions — Admin Sungku',
            'layout-app',
        );
    }

    public function users(Request $request): void
    {
        Session::requireRole('ADMIN');

        $users = Db::select(
            'SELECT u.id, u.email, u.full_name, u.created_at,
                    GROUP_CONCAT(r.role ORDER BY r.role SEPARATOR ", ") AS roles,
                    (SELECT COUNT(*) FROM campaigns c WHERE c.organizer_id = u.id) AS collectes
               FROM users u
               LEFT JOIN user_roles r ON r.user_id = u.id
              GROUP BY u.id
              ORDER BY u.created_at DESC
              LIMIT 200',
        );

        View::render(
            'admin-utilisateurs',
            ['users' => $users, 'onglet' => 'utilisateurs', 'espace' => 'admin'],
            'Utilisateurs — Admin Sungku',
            'layout-app',
        );
    }

    /** Modération d'une collecte : publication ou refus. */
    public function moderate(Request $request): void
    {
        Session::requireRole('ADMIN');

        if (!Csrf::isValid($_POST['_csrf'] ?? null)) {
            self::redirect('/admin/collectes');

            return;
        }

        $id = (int) ($_POST['id'] ?? 0);
        $decision = strtoupper((string) ($_POST['decision'] ?? ''));

        if (!in_array($decision, ['APPROVED', 'REJECTED'], true)) {
            self::redirect('/admin/collectes');

            return;
        }

        Db::execute(
            'UPDATE campaigns SET moderation_status = :d, updated_at = NOW() WHERE id = :id',
            ['d' => $decision, 'id' => $id],
        );

        Logger::write('admin', 'Modération de collecte', [
            'campagne' => $id,
            'decision' => $decision,
            'par' => Session::userId(),
        ]);

        self::redirect('/admin/collectes');
    }

    /**
     * Force la relecture du statut d'une contribution auprès de pawaPay.
     *
     * C'est la sortie prévue pour les transactions à l'issue indéterminée :
     * on ne tranche pas à la main, on redemande à la source. Un statut décidé
     * depuis le back-office serait un mensonge écrit dans la base.
     */
    public function recheck(Request $request): void
    {
        Session::requireRole('ADMIN');

        if (!Csrf::isValid($_POST['_csrf'] ?? null)) {
            self::redirect('/admin');

            return;
        }

        $id = (string) ($_POST['id'] ?? '');

        try {
            (new DepositService())->refresh($id);
        } catch (\Throwable $e) {
            Logger::write('admin', 'Relecture de statut en échec', ['id' => $id, 'erreur' => $e->getMessage()]);
        }

        self::redirect('/admin');
    }

    private static function redirect(string $path): void
    {
        header('Location: ' . $path, true, 302);
    }
}
