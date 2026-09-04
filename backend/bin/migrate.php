<?php

declare(strict_types=1);

/**
 * Applique les migrations SQL non encore jouées, dans l'ordre des noms de
 * fichier. À lancer après chaque déploiement.
 *
 *   php bin/migrate.php
 *
 * Le suivi en base évite de rejouer une migration, et la table schema_migrations
 * dit à tout moment dans quel état est la base — information qu'un déploiement
 * FTP, qui écrase des fichiers sans rien savoir de l'historique, ne donne pas.
 */

use Sungku\Core\Db;
use Sungku\Core\Env;

require dirname(__DIR__) . '/autoload.php';

Env::load(dirname(__DIR__) . '/.env');

$pdo = Db::pdo();

$pdo->exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (
        version    VARCHAR(190) NOT NULL PRIMARY KEY,
        applied_at DATETIME     NOT NULL
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
);

$applied = array_column(Db::select('SELECT version FROM schema_migrations'), 'version');

$files = glob(dirname(__DIR__) . '/database/migrations/*.sql') ?: [];
sort($files);

$count = 0;

foreach ($files as $file) {
    $version = basename($file);
    if (in_array($version, $applied, true)) {
        continue;
    }

    $sql = (string) file_get_contents($file);

    // MySQL n'accepte pas plusieurs instructions dans un prepare : on découpe
    // sur les points-virgules en fin de ligne.
    foreach (preg_split('/;\s*\R/', $sql) ?: [] as $statement) {
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

    echo "Appliquée : {$version}\n";
    ++$count;
}

echo $count === 0 ? "Base déjà à jour.\n" : "{$count} migration(s) appliquée(s).\n";
