<?php

declare(strict_types=1);

namespace Sungku\Support;

final class Msisdn
{
    private const COUNTRY_CODE = '237';

    /**
     * Normalise un numéro saisi en MSISDN : chiffres uniquement, indicatif
     * pays compris, sans + ni zéro initial — le seul format accepté par
     * pawaPay. Les saisies réelles arrivent en « +237 6 70 00 00 00 »,
     * « 00237670000000 » ou « 670000000 ».
     */
    public static function normalise(string $input): string
    {
        $digits = preg_replace('/\D/', '', $input) ?? '';

        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        }

        if (str_starts_with($digits, self::COUNTRY_CODE)) {
            return $digits;
        }

        // Numéro local camerounais : 9 chiffres commençant par 6.
        if (strlen($digits) === 9 && str_starts_with($digits, '6')) {
            return self::COUNTRY_CODE . $digits;
        }

        return $digits;
    }

    public static function isPlausible(string $msisdn): bool
    {
        return (bool) preg_match('/^\d{9,15}$/', $msisdn);
    }

    /** Masque un numéro pour l'affichage public : 237670***456. */
    public static function mask(string $msisdn): string
    {
        if (strlen($msisdn) < 7) {
            return '***';
        }

        return substr($msisdn, 0, 6) . str_repeat('*', 3) . substr($msisdn, -3);
    }
}
