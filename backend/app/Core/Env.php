<?php

declare(strict_types=1);

namespace Sungku\Core;

use RuntimeException;

/**
 * Lecture du fichier .env, situé à la racine applicative — donc HORS de
 * public_html. Un .env servi par Apache livrerait le token pawaPay et les
 * accès base à quiconque devine son URL.
 */
final class Env
{
    /** @var array<string, string> */
    private static array $values = [];
    private static bool $loaded = false;

    public static function load(string $path): void
    {
        self::$loaded = true;

        if (!is_readable($path)) {
            return; // les variables peuvent aussi venir de l'environnement système
        }

        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
                continue;
            }

            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);

            // Les guillemets sont un habillage, pas une partie de la valeur.
            if (strlen($value) >= 2 && ($value[0] === '"' || $value[0] === "'") && $value[-1] === $value[0]) {
                $value = substr($value, 1, -1);
            }

            self::$values[$key] = $value;
        }
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        if (!self::$loaded) {
            throw new RuntimeException('Env::load() doit être appelé avant toute lecture.');
        }

        $value = self::$values[$key] ?? getenv($key);

        return ($value === false || $value === '') ? $default : (string) $value;
    }

    /** Variable dont l'absence est une erreur de configuration, pas un cas nominal. */
    public static function require(string $key): string
    {
        $value = self::get($key);
        if ($value === null) {
            throw new RuntimeException("Variable d'environnement manquante : {$key}");
        }

        return $value;
    }

    public static function bool(string $key, bool $default = false): bool
    {
        $value = self::get($key);

        return $value === null ? $default : in_array(strtolower($value), ['1', 'true', 'yes', 'on'], true);
    }

    public static function isProduction(): bool
    {
        return self::get('APP_ENV', 'production') === 'production';
    }
}
