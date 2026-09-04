<?php

declare(strict_types=1);

namespace Sungku\Core;

/**
 * Journal applicatif écrit dans storage/logs — hors public_html : les traces
 * de paiement contiennent des numéros de téléphone et des identifiants de
 * transaction, elles n'ont rien à faire dans un dossier servi par Apache.
 */
final class Logger
{
    public static function write(string $channel, string $message, array $context = []): void
    {
        $dir = dirname(__DIR__, 2) . '/storage/logs';
        if (!is_dir($dir)) {
            @mkdir($dir, 0770, true);
        }

        $line = sprintf(
            "[%s] %s: %s %s\n",
            gmdate('Y-m-d\TH:i:s\Z'),
            strtoupper($channel),
            $message,
            $context === [] ? '' : json_encode($context, JSON_UNESCAPED_UNICODE),
        );

        @file_put_contents($dir . '/' . $channel . '-' . gmdate('Y-m-d') . '.log', $line, FILE_APPEND | LOCK_EX);
    }

    public static function payment(string $message, array $context = []): void
    {
        self::write('payments', $message, $context);
    }
}
