<?php

declare(strict_types=1);

namespace Sungku\Http\Controllers;

use Sungku\Core\Db;
use Sungku\Core\Logger;
use Sungku\Core\Request;
use Sungku\Core\Settings;
use Sungku\Http\Csrf;
use Sungku\Http\Session;
use Sungku\Http\View;
use Sungku\Payments\Balance;
use Sungku\Payments\DepositService;
use Sungku\Payments\PawaPayException;
use Sungku\Payments\PayoutService;
use Sungku\Payments\StatusMapper;
use Sungku\Support\Msisdn;
use Sungku\Support\Upload;

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

    /** Reversements : soldes par collecte, envoi, historique. */
    public function payouts(Request $request): void
    {
        Session::requireRole('ADMIN');

        $campaigns = Db::select(
            'SELECT c.id, c.slug, c.title, c.fee_rate, c.payout_phone,
                    u.full_name AS organisateur, u.email AS organizer_email
               FROM campaigns c
               JOIN users u ON u.id = c.organizer_id
              ORDER BY c.created_at DESC
              LIMIT 200',
        );

        // Le solde est calculé collecte par collecte : il dépend des
        // contributions confirmées ET des reversements déjà engagés.
        foreach ($campaigns as $i => $c) {
            $campaigns[$i]['balance'] = Balance::forCampaign((int) $c['id']);
        }

        $historique = Db::select(
            'SELECT p.*, c.title, c.slug
               FROM payouts p
               JOIN campaigns c ON c.id = p.campaign_id
              ORDER BY p.created_at DESC
              LIMIT 100',
        );

        View::render(
            'admin-reversements',
            [
                'campaigns' => $campaigns,
                'historique' => $historique,
                'plateforme' => Balance::platform(),
                'message' => $_GET['message'] ?? null,
                'erreur' => $_GET['erreur'] ?? null,
                'onglet' => 'reversements',
                'espace' => 'admin',
            ],
            'Reversements — Admin Sungku',
            'layout-app',
        );
    }

    /** Envoi effectif du reversement à l'organisateur. */
    public function sendPayout(Request $request): void
    {
        $adminId = Session::requireRole('ADMIN');

        if (!Csrf::isValid($_POST['_csrf'] ?? null)) {
            self::redirect('/admin/reversements');

            return;
        }

        $campaignId = (int) ($_POST['campaign_id'] ?? 0);
        $montant = (int) ($_POST['amount'] ?? 0);
        $phone = trim((string) ($_POST['phone'] ?? ''));

        try {
            $resultat = (new PayoutService())->send($campaignId, $montant, $phone, $adminId);

            Logger::write('admin', 'Reversement déclenché', [
                'collecte' => $campaignId,
                'brut' => $montant,
                'net' => $resultat['payout']['amount'] ?? null,
                'par' => $adminId,
            ]);

            self::redirect('/admin/reversements?message=' . rawurlencode(
                'Reversement envoyé. L’organisateur recevra les fonds une fois confirmé par l’opérateur.',
            ));
        } catch (PawaPayException $e) {
            // Une issue indéterminée n'est pas un échec : le reversement reste
            // en attente et le message doit dissuader de recommencer.
            self::redirect('/admin/reversements?erreur=' . rawurlencode(
                $e->isIndeterminate()
                    ? 'Réponse non reçue de l’opérateur. Le reversement reste en attente — ne le relancez pas, vérifiez son statut dans quelques minutes.'
                    : $e->getMessage(),
            ));
        } catch (\Throwable $e) {
            self::redirect('/admin/reversements?erreur=' . rawurlencode($e->getMessage()));
        }
    }

    /** Relit l'état d'un reversement auprès de l'opérateur. */
    public function recheckPayout(Request $request): void
    {
        Session::requireRole('ADMIN');

        if (Csrf::isValid($_POST['_csrf'] ?? null)) {
            try {
                (new PayoutService())->refresh((string) ($_POST['id'] ?? ''));
            } catch (\Throwable $e) {
                Logger::write('admin', 'Relecture de reversement en échec', ['erreur' => $e->getMessage()]);
            }
        }

        self::redirect('/admin/reversements');
    }

    /** Grille des commissions. */
    public function settings(Request $request): void
    {
        Session::requireRole('ADMIN');

        View::render(
            'admin-parametres',
            [
                'fees' => Settings::fees(),
                'categories' => PageController::CATEGORIES,
                'message' => $_GET['message'] ?? null,
                'onglet' => 'parametres',
                'espace' => 'admin',
            ],
            'Commissions — Admin Sungku',
            'layout-app',
        );
    }

    public function saveSettings(Request $request): void
    {
        Session::requireRole('ADMIN');

        if (!Csrf::isValid($_POST['_csrf'] ?? null)) {
            self::redirect('/admin/parametres');

            return;
        }

        // On part de la grille en vigueur et on ne remplace que les champs
        // réellement soumis. Lire un champ absent comme « 0 » rendrait la
        // catégorie gratuite au premier envoi partiel du formulaire — perte
        // silencieuse de recette, sans que personne ait décidé quoi que ce soit.
        $fees = Settings::fees();

        foreach (PageController::CATEGORIES as $code => $libelle) {
            $soumis = $_POST['fee_' . $code] ?? null;

            if ($soumis === null || trim((string) $soumis) === '') {
                continue;
            }

            $fees[$code] = (float) str_replace(',', '.', (string) $soumis);
        }

        Settings::saveFees($fees);

        Logger::write('admin', 'Grille de commissions modifiée', ['par' => Session::userId(), 'fees' => $fees]);

        self::redirect('/admin/parametres?message=' . rawurlencode(
            'Grille enregistrée. Elle s’applique aux collectes créées à partir de maintenant ; celles déjà ouvertes gardent le taux qu’elles ont accepté.',
        ));
    }

    /** Édition d'une collecte par un administrateur. */
    public function editCampaign(Request $request, array $params): void
    {
        Session::requireRole('ADMIN');

        $campaign = CampaignController::findBySlugOrId($params['id']);
        if ($campaign === null) {
            http_response_code(404);
            View::render('introuvable', [], 'Collecte introuvable', 'layout-app');

            return;
        }

        View::render(
            'admin-collecte',
            [
                'campaign' => $campaign,
                'categories' => PageController::CATEGORIES,
                'balance' => Balance::forCampaign((int) $campaign['id']),
                'onglet' => 'collectes',
                'espace' => 'admin',
            ],
            'Modifier — Admin Sungku',
            'layout-app',
        );
    }

    public function updateCampaign(Request $request): void
    {
        Session::requireRole('ADMIN');

        if (!Csrf::isValid($_POST['_csrf'] ?? null)) {
            self::redirect('/admin/collectes');

            return;
        }

        $id = (int) ($_POST['id'] ?? 0);
        $category = strtoupper(trim((string) ($_POST['category'] ?? 'AUTRE')));

        if (!array_key_exists($category, PageController::CATEGORIES)) {
            $category = 'AUTRE';
        }

        // Le taux n'est PAS remis à celui de la grille en changeant de
        // catégorie : il reste celui accepté par l'organisateur. Le modifier
        // demande une action explicite, tracée ci-dessous.
        Db::execute(
            'UPDATE campaigns
                SET title = :title, description = :description, category = :category,
                    goal_amount = :goal, status = :status, payout_phone = :phone,
                    updated_at = NOW()
              WHERE id = :id',
            [
                'title' => trim((string) ($_POST['title'] ?? '')),
                'description' => trim((string) ($_POST['description'] ?? '')) ?: null,
                'category' => $category,
                'goal' => max(1, (int) ($_POST['goalAmount'] ?? 0)),
                'status' => ($_POST['status'] ?? 'ACTIVE') === 'CLOSED' ? 'CLOSED' : 'ACTIVE',
                'phone' => Msisdn::normalise((string) ($_POST['payoutPhone'] ?? '')),
                'id' => $id,
            ],
        );

        if (isset($_POST['fee_rate']) && $_POST['fee_rate'] !== '') {
            $nouveauTaux = max(0.0, min(20.0, (float) str_replace(',', '.', (string) $_POST['fee_rate'])));

            Db::execute('UPDATE campaigns SET fee_rate = :r WHERE id = :id', ['r' => $nouveauTaux, 'id' => $id]);

            // Changer un taux accepté est une modification contractuelle :
            // elle doit laisser une trace nominative.
            Logger::write('admin', 'Taux de commission modifié sur une collecte', [
                'collecte' => $id,
                'taux' => $nouveauTaux,
                'par' => Session::userId(),
            ]);
        }

        Logger::write('admin', 'Collecte modifiée', ['collecte' => $id, 'par' => Session::userId()]);

        self::redirect('/admin/collectes');
    }

    /**
     * Suppression d'une collecte.
     *
     * Refusée dès qu'un mouvement d'argent existe : effacer une collecte qui a
     * encaissé ferait disparaître la trace de sommes réellement perçues. Dans
     * ce cas on la ferme, on ne la supprime pas.
     */
    public function deleteCampaign(Request $request): void
    {
        Session::requireRole('ADMIN');

        if (!Csrf::isValid($_POST['_csrf'] ?? null)) {
            self::redirect('/admin/collectes');

            return;
        }

        $id = (int) ($_POST['id'] ?? 0);

        $mouvements = (int) (Db::selectOne(
            'SELECT COUNT(*) AS n FROM contributions WHERE campaign_id = :id',
            ['id' => $id],
        )['n'] ?? 0);

        if ($mouvements > 0) {
            Db::execute(
                'UPDATE campaigns SET status = "CLOSED", updated_at = NOW() WHERE id = :id',
                ['id' => $id],
            );

            self::redirect('/admin/collectes?erreur=' . rawurlencode(
                'Cette collecte a reçu des contributions : elle a été fermée plutôt que supprimée, pour conserver la trace des paiements.',
            ));

            return;
        }

        $campaign = Db::selectOne('SELECT cover_path FROM campaigns WHERE id = :id', ['id' => $id]);
        Db::execute('DELETE FROM campaigns WHERE id = :id', ['id' => $id]);
        Upload::delete($campaign['cover_path'] ?? null);

        Logger::write('admin', 'Collecte supprimée', ['collecte' => $id, 'par' => Session::userId()]);

        self::redirect('/admin/collectes');
    }

    /** Ajout ou retrait d'un rôle. */
    public function toggleRole(Request $request): void
    {
        $adminId = Session::requireRole('ADMIN');

        if (!Csrf::isValid($_POST['_csrf'] ?? null)) {
            self::redirect('/admin/utilisateurs');

            return;
        }

        $userId = (int) ($_POST['user_id'] ?? 0);
        $role = strtoupper((string) ($_POST['role'] ?? ''));
        $action = (string) ($_POST['action'] ?? '');

        if (!in_array($role, ['ADMIN', 'ORGANIZER', 'API_MERCHANT'], true)) {
            self::redirect('/admin/utilisateurs');

            return;
        }

        // Se retirer soi-même le rôle ADMIN fermerait la porte de l'intérieur,
        // sans personne pour la rouvrir depuis l'interface.
        if ($role === 'ADMIN' && $action === 'remove' && $userId === $adminId) {
            self::redirect('/admin/utilisateurs?erreur=' . rawurlencode(
                'Vous ne pouvez pas retirer votre propre rôle administrateur.',
            ));

            return;
        }

        if ($action === 'remove') {
            Db::execute(
                'DELETE FROM user_roles WHERE user_id = :id AND role = :role',
                ['id' => $userId, 'role' => $role],
            );
        } else {
            Db::execute(
                'INSERT IGNORE INTO user_roles (user_id, role) VALUES (:id, :role)',
                ['id' => $userId, 'role' => $role],
            );
        }

        Logger::write('admin', 'Rôle modifié', [
            'utilisateur' => $userId,
            'role' => $role,
            'action' => $action,
            'par' => $adminId,
        ]);

        self::redirect('/admin/utilisateurs');
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
