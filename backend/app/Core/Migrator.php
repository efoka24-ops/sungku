<?php

declare(strict_types=1);

namespace Sungku\Core;

/**
 * Exécution des migrations SQL, partagée entre la ligne de commande
 * (bin/migrate.php) et la route de maintenance.
 *
 * Les deux chemins existent parce que l'hébergement mutualisé ne garantit pas
 * d'accès shell : sans la route, la seule option serait de coller le SQL à la
 * main dans phpMyAdmin à chaque livraison, ce qui finit toujours par produire
 * une base dans un état que personne ne sait décrire.
 */
final class Migrator
{
    /** @return array<int, string> noms des migrations appliquées lors de cet appel */
    public static function run(): array
    {
        $pdo = Db::pdo();

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS schema_migrations (
                version    VARCHAR(190) NOT NULL PRIMARY KEY,
                applied_at DATETIME     NOT NULL
             ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );

        $applied = array_column(Db::select('SELECT version FROM schema_migrations'), 'version');

        $files = glob(dirname(__DIR__, 2) . '/database/migrations/*.sql') ?: [];
        sort($files); // l'ordre des noms EST l'ordre d'application

        $ran = [];

        foreach ($files as $file) {
            $version = basename($file);
            if (in_array($version, $applied, true)) {
                continue;
            }

            // MySQL n'accepte pas plusieurs instructions dans un seul appel
            // préparé : on découpe sur les points-virgules en fin de ligne.
            foreach (preg_split('/;\s*\R/', (string) file_get_contents($file)) ?: [] as $statement) {
                $statement = trim($statement, " \t\n\r\0\x0B;");
                if ($statement === '') {
                    continue;
                }

                $pdo->exec($statement);
            }

            Db::execute(
                'INSERT INTO schema_migrations (version, applied_at) VALUES (:version, NOW())',
                ['version' => $version],
            );

            $ran[] = $version;
        }

        return $ran;
    }
}
