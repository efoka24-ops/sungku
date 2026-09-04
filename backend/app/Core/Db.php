<?php

declare(strict_types=1);

namespace Sungku\Core;

use PDO;

/**
 * Connexion MySQL partagée, ouverte à la première utilisation.
 *
 * ERRMODE_EXCEPTION : sans lui, une requête échouée renvoie false en silence
 * et le code continue comme si tout allait bien — sur des mouvements d'argent,
 * c'est le pire des comportements.
 */
final class Db
{
    private static ?PDO $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $host = Env::get('DB_HOST', 'localhost');
        $port = Env::get('DB_PORT', '3306');
        $name = Env::require('DB_NAME');

        self::$pdo = new PDO(
            "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",
            Env::require('DB_USER'),
            Env::require('DB_PASSWORD'),
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                // Requêtes réellement préparées côté serveur : l'émulation
                // laisse PDO recoller la requête lui-même, ce qui a déjà
                // produit des injections sur certains jeux de caractères.
                PDO::ATTR_EMULATE_PREPARES => false,
            ],
        );

        return self::$pdo;
    }

    /** @param array<string, mixed> $params */
    public static function select(string $sql, array $params = []): array
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll();
    }

    /** @param array<string, mixed> $params */
    public static function selectOne(string $sql, array $params = []): ?array
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    /** @param array<string, mixed> $params */
    public static function execute(string $sql, array $params = []): int
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);

        return $stmt->rowCount();
    }
}
