<?php

declare(strict_types=1);

/**
 * Applique les migrations SQL non encore jouées.
 *
 *   php bin/migrate.php
 *
 * Même logique que la route POST /internal/migrate : les deux passent par
 * Sungku\Core\Migrator, pour qu'une base migrée en ligne de commande et une
 * base migrée par HTTP ne puissent pas diverger.
 */

use Sungku\Core\Env;
use Sungku\Core\Migrator;

require dirname(__DIR__) . '/autoload.php';

Env::load(dirname(__DIR__) . '/.env');

$applied = Migrator::run();

foreach ($applied as $version) {
    echo "Appliquée : {$version}\n";
}

echo $applied === [] ? "Base déjà à jour.\n" : count($applied) . " migration(s) appliquée(s).\n";
