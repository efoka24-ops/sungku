<?php

declare(strict_types=1);

namespace Sungku\Support;

final class Uuid
{
    /**
     * UUIDv4 conforme. pawaPay impose 36 caractères au format canonique pour
     * depositId : un bin2hex(random_bytes(16)) est rejeté malgré son entropie
     * identique, faute de tirets et de bits de version.
     */
    public static function v4(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40); // version 4
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80); // variant RFC 4122

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }

    public static function isValid(string $value): bool
    {
        return (bool) preg_match(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
            $value,
        );
    }
}
