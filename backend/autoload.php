<?php

declare(strict_types=1);

/**
 * Autoloader PSR-4 minimal : Sungku\ → app/.
 *
 * Pas de Composer ici. L'hébergement est mutualisé et le déploiement se fait
 * par FTP : un vendor/ de plusieurs milliers de fichiers rendrait chaque
 * livraison interminable, pour un besoin que quinze lignes couvrent.
 */
spl_autoload_register(static function (string $class): void {
    $prefix = 'Sungku\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }

    $relative = substr($class, strlen($prefix));
    $file = __DIR__ . '/app/' . str_replace('\\', '/', $relative) . '.php';

    if (is_file($file)) {
        require $file;
    }
});
