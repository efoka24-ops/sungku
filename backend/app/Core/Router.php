<?php

declare(strict_types=1);

namespace Sungku\Core;

/**
 * Routeur minimal à segments nommés : /campaigns/{slug}/contributions.
 *
 * Toutes les requêtes passent par lui, donc par un point unique où appliquer
 * en-têtes, CORS et journalisation. C'est ce qui distingue ce socle du
 * précédent, où chaque fichier .php était une porte d'entrée à sécuriser
 * séparément — et donc à oublier séparément.
 */
final class Router
{
    /** @var array<int, array{method: string, segments: array<int, string>, handler: callable}> */
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler): void
    {
        $this->routes[] = [
            'method' => strtoupper($method),
            'segments' => explode('/', trim($pattern, '/')),
            'handler' => $handler,
        ];
    }

    public function get(string $p, callable $h): void { $this->add('GET', $p, $h); }
    public function post(string $p, callable $h): void { $this->add('POST', $p, $h); }
    public function patch(string $p, callable $h): void { $this->add('PATCH', $p, $h); }

    public function dispatch(Request $request): void
    {
        $parts = explode('/', trim($request->path, '/'));
        $pathMatched = false;

        foreach ($this->routes as $route) {
            $params = $this->match($route['segments'], $parts);
            if ($params === null) {
                continue;
            }

            $pathMatched = true;
            if ($route['method'] !== $request->method) {
                continue;
            }

            ($route['handler'])($request, $params);

            return;
        }

        // Distinguer 405 de 404 évite de faire chercher une route qui existe.
        $pathMatched
            ? Response::error('Méthode non autorisée sur cette ressource.', 405)
            : Response::error('Ressource introuvable.', 404);
    }

    /**
     * @param array<int, string> $segments
     * @param array<int, string> $parts
     * @return array<string, string>|null
     */
    private function match(array $segments, array $parts): ?array
    {
        if (count($segments) !== count($parts)) {
            return null;
        }

        $params = [];
        foreach ($segments as $i => $segment) {
            if (str_starts_with($segment, '{') && str_ends_with($segment, '}')) {
                $params[trim($segment, '{}')] = rawurldecode($parts[$i]);
                continue;
            }

            if ($segment !== $parts[$i]) {
                return null;
            }
        }

        return $params;
    }
}
