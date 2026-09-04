<?php

declare(strict_types=1);

namespace Sungku\Http;

use Sungku\Core\Db;
use Sungku\Core\Response;

/**
 * Session PHP durcie et contrôle de rôles.
 *
 * Les rôles sont cumulables : un même compte peut être organisateur ET
 * marchand API. Un enum unique sur users aurait rendu ce cas impossible.
 */
final class Session
{
    public static function start(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            // HttpOnly : le cookie devient illisible en JavaScript, donc
            // inexploitable par une XSS. SameSite=Lax bloque l'usage du
            // cookie depuis un site tiers (CSRF).
            'httponly' => true,
            // Secure dès que la connexion l'est. Le lier à APP_ENV rendait la
            // connexion impossible tant qu'AutoSSL n'était pas actif : le
            // navigateur acceptait le cookie sans jamais le renvoyer.
            //
            // ⚠ Conséquence : en HTTP, la session circule en clair et reste
            // rejouable. Activer le certificat et décommenter la redirection
            // du .htaccess AVANT toute ouverture au public.
            'secure' => ($_SERVER['HTTPS'] ?? '') === 'on',
            'samesite' => 'Lax',
        ]);

        session_name('sungku_session');
        session_start();
    }

    public static function login(int $userId, array $roles): void
    {
        self::start();
        // Régénérer l'identifiant à la connexion invalide un identifiant qu'un
        // attaquant aurait fixé au préalable (session fixation).
        session_regenerate_id(true);

        $_SESSION['user_id'] = $userId;
        $_SESSION['roles'] = $roles;
    }

    public static function logout(): void
    {
        self::start();
        $_SESSION = [];
        session_destroy();
    }

    public static function userId(): ?int
    {
        self::start();

        return isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
    }

    /** @return array<int, string> */
    public static function roles(): array
    {
        self::start();

        return array_map('strval', $_SESSION['roles'] ?? []);
    }

    public static function has(string $role): bool
    {
        return in_array($role, self::roles(), true);
    }

    /** Interrompt la requête si l'utilisateur n'est pas connecté. */
    public static function requireUser(): int
    {
        $userId = self::userId();
        if ($userId === null) {
            Response::error('Authentification requise.', 401);
            exit;
        }

        return $userId;
    }

    /** Interrompt la requête si le rôle attendu est absent. */
    public static function requireRole(string $role): int
    {
        $userId = self::requireUser();
        if (!self::has($role)) {
            Response::error('Accès refusé.', 403);
            exit;
        }

        return $userId;
    }

    /** @return array<int, string> */
    public static function rolesOf(int $userId): array
    {
        $rows = Db::select('SELECT role FROM user_roles WHERE user_id = :id', ['id' => $userId]);

        return array_column($rows, 'role');
    }
}
