<?php

declare(strict_types=1);

namespace Sungku\Core;

final class Response
{
    public static function json(mixed $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    public static function error(string $message, int $status = 400, array $extra = []): void
    {
        self::json(['error' => $message] + $extra, $status);
    }

    /** En-têtes de sécurité, appliqués à toutes les réponses par le front controller. */
    public static function securityHeaders(): void
    {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Referrer-Policy: no-referrer');
        header_remove('X-Powered-By');
    }

    /**
     * CORS restreint à une liste blanche : un « * » laisserait n'importe quel
     * site déclencher des appels authentifiés depuis le navigateur d'un
     * organisateur connecté.
     */
    public static function cors(Request $request): void
    {
        $origin = $request->header('Origin');
        if ($origin === null) {
            return; // appel serveur à serveur : rien à autoriser
        }

        $allowed = array_filter(array_map('trim', explode(',', Env::get('CORS_ORIGINS', '') ?? '')));
        if (!in_array($origin, $allowed, true)) {
            return;
        }

        header("Access-Control-Allow-Origin: {$origin}");
        header('Vary: Origin');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Content-Type, X-Api-Key');
        header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
    }
}
