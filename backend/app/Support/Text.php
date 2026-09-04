<?php

declare(strict_types=1);

namespace Sungku\Support;

final class Text
{
    /**
     * Translittération ASCII déterministe.
     *
     * iconv('ASCII//TRANSLIT') dépend de l'implémentation : la glibc rend
     * « é » par « e », la libiconv de Windows par « 'e ». Le même titre
     * produirait donc un libellé de paiement et une URL différents selon la
     * machine — sur le serveur et sur le poste de développement. D'où cette
     * table explicite, qui donne le même résultat partout.
     */
    private const REMPLACEMENTS = [
        'à' => 'a', 'á' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a', 'å' => 'a',
        'è' => 'e', 'é' => 'e', 'ê' => 'e', 'ë' => 'e',
        'ì' => 'i', 'í' => 'i', 'î' => 'i', 'ï' => 'i',
        'ò' => 'o', 'ó' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
        'ù' => 'u', 'ú' => 'u', 'û' => 'u', 'ü' => 'u',
        'ý' => 'y', 'ÿ' => 'y',
        'ñ' => 'n', 'ç' => 'c', 'œ' => 'oe', 'æ' => 'ae', 'ß' => 'ss',
        'ɛ' => 'e', 'ɔ' => 'o', 'ŋ' => 'ng', // voyelles des langues camerounaises
        '’' => "'", '‘' => "'", '“' => '"', '”' => '"', '–' => '-', '—' => '-',
    ];

    public static function ascii(string $value): string
    {
        $lower = mb_strtolower($value, 'UTF-8');
        $translitere = strtr($lower, self::REMPLACEMENTS);

        // Ce qui reste hors ASCII n'a pas d'équivalent raisonnable : on le
        // retire plutôt que de laisser passer des octets illisibles.
        return (string) preg_replace('/[^\x20-\x7E]/', '', $translitere);
    }

    /**
     * Libellé conforme à customerMessage de pawaPay : 4 à 22 caractères,
     * lettres, chiffres et espaces uniquement.
     */
    public static function customerMessage(string $source, string $defaut = 'Collecte Sungku'): string
    {
        $clean = self::ascii($source);
        $clean = preg_replace('/[^a-z0-9 ]/', ' ', $clean) ?? '';
        $clean = trim((string) preg_replace('/\s+/', ' ', $clean));

        // La troncature peut couper un mot et laisser une espace finale : on
        // retaille, puis on revérifie la borne basse.
        $clean = rtrim(mb_substr($clean, 0, 22));

        if (mb_strlen($clean) < 4) {
            return $defaut;
        }

        // Capitale initiale : le libellé s'affiche tel quel sur le téléphone.
        return ucfirst($clean);
    }

    /** Fragment d'URL stable et lisible. */
    public static function slug(string $value): string
    {
        $base = trim((string) preg_replace('/[^a-z0-9]+/', '-', self::ascii($value)), '-');

        return $base === '' ? 'collecte' : mb_substr($base, 0, 60);
    }
}
