<?php

declare(strict_types=1);

namespace Sungku\Payments;

/**
 * Traduction des statuts pawaPay vers les statuts de contribution.
 *
 * La règle qui gouverne tout ce fichier : un échec doit être PROUVÉ. Un
 * timeout, un HTTP 500 ou un UNKNOWN_ERROR ne prouvent rien — l'argent a
 * peut-être quitté le portefeuille du contributeur. Conclure trop vite à
 * l'échec, c'est encaisser sans créditer la cagnotte.
 */
final class StatusMapper
{
    public const PENDING = 'PENDING';
    public const PROCESSING = 'PROCESSING';
    public const CONFIRMED = 'CONFIRMED';
    public const FAILED = 'FAILED';
    public const NEEDS_ATTENTION = 'NEEDS_ATTENTION';

    /** Statuts sur lesquels on peut conclure : plus aucune évolution attendue. */
    public const FINAL = [self::CONFIRMED, self::FAILED];

    public static function fromPawaPay(string $status): string
    {
        return match (strtoupper(trim($status))) {
            'COMPLETED' => self::CONFIRMED,
            'FAILED', 'REJECTED' => self::FAILED,
            'ACCEPTED', 'SUBMITTED', 'ENQUEUED' => self::PENDING,
            'PROCESSING', 'IN_RECONCILIATION' => self::PROCESSING,
            // Statut inconnu d'une version d'API plus récente : ne surtout pas
            // le traiter comme un échec, le laisser remonter à un humain.
            default => self::NEEDS_ATTENTION,
        };
    }

    public static function isFinal(string $contributionStatus): bool
    {
        return in_array($contributionStatus, self::FINAL, true);
    }

    /**
     * Un code d'échec pawaPay autorise-t-il à conclure à l'absence de
     * mouvement de fonds ? Tout ce qui n'est pas listé ici reste en attente.
     */
    public static function provesFailure(?string $failureCode): bool
    {
        return in_array((string) $failureCode, [
            'INVALID_PHONE_NUMBER',
            'INVALID_AMOUNT',
            'AMOUNT_OUT_OF_BOUNDS',
            'INVALID_CURRENCY',
            'INVALID_PROVIDER',
            'INVALID_INPUT',
            'MISSING_PARAMETER',
            'UNSUPPORTED_PARAMETER',
            'INVALID_PARAMETER',
            'PAYER_LIMIT_REACHED',
            'PAYER_NOT_FOUND',
            'PAYMENT_NOT_APPROVED',
            'INSUFFICIENT_BALANCE',
            'UNSPECIFIED_FAILURE',
        ], true);
    }
}
