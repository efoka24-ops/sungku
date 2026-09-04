<?php

declare(strict_types=1);

namespace Sungku\Http\Controllers;

use PDOException;
use Sungku\Core\Db;
use Sungku\Core\Request;
use Sungku\Http\Session;
use Sungku\Http\View;
use Sungku\Payments\StatusMapper;

/**
 * Pages HTML.
 *
 * Rendues côté serveur plutôt que par une application JavaScript : le socle
 * n'a ni Node ni chaîne de construction, et une page de cagnotte doit rester
 * lisible par les robots pour être partageable. Seul le tunnel de
 * contribution est piloté en JavaScript, parce qu'il doit attendre la
 * validation du PIN sans recharger la page.
 */
final class PageController
{
    public function home(Request $request): void
    {
        $campaigns = Db::select(
            'SELECT c.slug, c.title, c.category, c.goal_amount,
                    COALESCE(SUM(ct.amount), 0) AS collected
               FROM campaigns c
               LEFT JOIN contributions ct
                      ON ct.campaign_id = c.id AND ct.status = :confirmed
              WHERE c.status = :active AND c.moderation_status = :approved
              GROUP BY c.id
              ORDER BY c.created_at DESC
              LIMIT 60',
            ['confirmed' => StatusMapper::CONFIRMED, 'active' => 'ACTIVE', 'approved' => 'APPROVED'],
        );

        View::render('accueil', ['campaigns' => $campaigns], 'Sungku — cagnottes solidaires');
    }

    public function campaign(Request $request, array $params): void
    {
        $campaign = CampaignController::findBySlugOrId($params['slug']);

        if ($campaign === null) {
            http_response_code(404);
            View::render('introuvable', [], 'Cagnotte introuvable');

            return;
        }

        $contributions = Db::select(
            'SELECT amount, contributor_name, is_anonymous, message, created_at
               FROM contributions
              WHERE campaign_id = :id AND status = :confirmed
              ORDER BY created_at DESC
              LIMIT 100',
            ['id' => $campaign['id'], 'confirmed' => StatusMapper::CONFIRMED],
        );

        $collected = (int) array_sum(array_column($contributions, 'amount'));

        View::render(
            'campagne',
            ['campaign' => $campaign, 'contributions' => $contributions, 'collected' => $collected],
            $campaign['title'] . ' — Sungku',
        );
    }

    public function loginForm(Request $request, array $params = [], ?string $erreur = null): void
    {
        View::render(
            'connexion',
            [
                'erreur' => $erreur,
                // Sans HTTPS, le cookie de session marqué Secure n'est jamais
                // renvoyé : autant le dire ici plutôt que de laisser
                // l'utilisateur croire à un mot de passe erroné.
                'httpsManquant' => ($_SERVER['HTTPS'] ?? '') !== 'on',
            ],
            'Connexion — Sungku',
        );
    }

    public function login(Request $request): void
    {
        $email = mb_strtolower(trim((string) ($_POST['email'] ?? '')));
        $password = (string) ($_POST['password'] ?? '');

        $user = Db::selectOne('SELECT id, password_hash FROM users WHERE email = :e LIMIT 1', ['e' => $email]);

        // Réponse identique pour un compte inconnu et un mot de passe faux :
        // les distinguer permettrait d'énumérer les adresses inscrites.
        if ($user === null || !password_verify($password, (string) $user['password_hash'])) {
            $this->loginForm($request, [], 'Identifiants incorrects.');

            return;
        }

        $userId = (int) $user['id'];
        Session::login($userId, Session::rolesOf($userId));
        self::redirect('/');
    }

    public function register(Request $request): void
    {
        $email = mb_strtolower(trim((string) ($_POST['email'] ?? '')));
        $password = (string) ($_POST['password'] ?? '');
        $fullName = trim((string) ($_POST['fullName'] ?? ''));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($password) < 8) {
            $this->loginForm($request, [], 'Adresse e-mail invalide ou mot de passe trop court (8 caractères).');

            return;
        }

        $pdo = Db::pdo();

        try {
            $pdo->beginTransaction();

            Db::execute(
                'INSERT INTO users (email, password_hash, full_name, created_at) VALUES (:e, :h, :n, NOW())',
                ['e' => $email, 'h' => password_hash($password, PASSWORD_DEFAULT), 'n' => $fullName ?: null],
            );

            $userId = (int) $pdo->lastInsertId();
            Db::execute('INSERT INTO user_roles (user_id, role) VALUES (:i, :r)', ['i' => $userId, 'r' => 'ORGANIZER']);

            $pdo->commit();
        } catch (PDOException $e) {
            $pdo->rollBack();

            // 23000 : l'unicité de l'e-mail est tenue par la base, pas par un
            // SELECT préalable qui laisserait une fenêtre entre les deux.
            $this->loginForm(
                $request,
                [],
                $e->getCode() === '23000'
                    ? 'Un compte existe déjà avec cette adresse.'
                    : 'Création impossible pour le moment.',
            );

            return;
        }

        Session::login($userId, ['ORGANIZER']);
        self::redirect('/creer');
    }

    public function logout(Request $request): void
    {
        Session::logout();
        self::redirect('/');
    }

    public function createForm(Request $request, array $params = [], ?string $erreur = null): void
    {
        if (Session::userId() === null) {
            self::redirect('/connexion');

            return;
        }

        View::render('creer', ['erreur' => $erreur], 'Créer une cagnotte — Sungku');
    }

    public function create(Request $request): void
    {
        $userId = Session::userId();
        if ($userId === null) {
            self::redirect('/connexion');

            return;
        }

        $title = trim((string) ($_POST['title'] ?? ''));
        $goal = (int) ($_POST['goalAmount'] ?? 0);
        $category = strtoupper(trim((string) ($_POST['category'] ?? 'AUTRE')));

        if ($title === '' || $goal <= 0) {
            $this->createForm($request, [], 'Le titre et un objectif positif sont requis.');

            return;
        }

        $slug = CampaignController::makeSlug($title);

        Db::execute(
            'INSERT INTO campaigns
                (slug, title, description, category, goal_amount, currency, organizer_id,
                 status, moderation_status, created_at, updated_at)
             VALUES
                (:slug, :title, :description, :category, :goal, "XAF", :organizer,
                 "ACTIVE", :moderation, NOW(), NOW())',
            [
                'slug' => $slug,
                'title' => $title,
                'description' => trim((string) ($_POST['description'] ?? '')) ?: null,
                'category' => $category,
                'goal' => $goal,
                'organizer' => $userId,
                'moderation' => in_array($category, ['SANTE', 'FUNERAILLES'], true) ? 'PENDING' : 'APPROVED',
            ],
        );

        self::redirect('/c/' . $slug);
    }

    private static function redirect(string $path): void
    {
        header('Location: ' . $path, true, 302);
    }
}
