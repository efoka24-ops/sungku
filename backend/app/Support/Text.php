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

    /**
     * La casse est préservée : « TRU GROUP » doit rester en capitales sur
     * l'écran du payeur. C'est le slug, et lui seul, qui met en minuscules.
     */
    public static function ascii(string $value): string
    {
        $table = self::REMPLACEMENTS;
        foreach (self::REMPLACEMENTS as $accent => $remplacement) {
            $table[mb_strtoupper($accent, 'UTF-8')] = mb_strtoupper($remplacement, 'UTF-8');
        }

        // Ce qui reste hors ASCII imprimable n'a pas d'équivalent raisonnable :
        // on le retire plutôt que de laisser passer des octets illisibles.
        return (string) preg_replace('/[^\x20-\x7E]/', '', strtr($value, $table));
    }

    /**
     * Libellé conforme à customerMessage de pawaPay : 4 à 22 caractères,
     * lettres, chiffres et espaces uniquement.
     */
    public static function customerMessage(string $source, string $defaut = 'Collecte Sungku'): string
    {
        $clean = preg_replace('/[^A-Za-z0-9 ]/', ' ', self::ascii($source)) ?? '';
        $clean = trim((string) preg_replace('/\s+/', ' ', $clean));

        if (mb_strlen($clean) > 22) {
            $coupe = mb_substr($clean, 0, 22);

            // Couper au dernier espace évite un mot tronqué en plein milieu,
            // qui donne l'impression d'un libellé corrompu. Mais si ce recul
            // ampute plus de la moitié de la place disponible, on préfère le
            // mot coupé : « TRU GROUP Anniversair » informe plus que
            // « TRU GROUP » seul.
            $dernierEspace = mb_strrpos($coupe, ' ');
            if ($dernierEspace !== false && $dernierEspace >= 12) {
                $coupe = mb_substr($coupe, 0, $dernierEspace);
            }

            $clean = rtrim($coupe);
        }

        return mb_strlen($clean) >= 4 ? $clean : $defaut;
    }

    /** Fragment d'URL stable et lisible. */
    public static function slug(string $value): string
    {
        $base = mb_strtolower(self::ascii($value), 'UTF-8');
        $base = trim((string) preg_replace('/[^a-z0-9]+/', '-', $base), '-');

        return $base === '' ? 'collecte' : mb_substr($base, 0, 60);
    }
}
