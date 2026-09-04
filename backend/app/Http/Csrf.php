<?php

declare(strict_types=1);

namespace Sungku\Http;

/**
 * Jetons anti-CSRF pour les formulaires.
 *
 * Sans jeton, un site tiers peut faire soumettre au navigateur d'un
 * organisateur connecté un formulaire vers /creer : le cookie de session
 * part avec la requête, et l'action s'exécute en son nom sans qu'il ait rien
 * demandé. SameSite=Lax couvre l'essentiel des cas, mais il dépend du
 * navigateur ; le jeton, lui, est vérifié par le serveur.
 */
final class Csrf
{
    private const CLE = '_csrf';

    public static function token(): string
    {
        Session::start();

        if (empty($_SESSION[self::CLE])) {
            $_SESSION[self::CLE] = bin2hex(random_bytes(32));
        }

        return (string) $_SESSION[self::CLE];
    }

    /** Champ caché à placer dans chaque formulaire POST. */
    public static function field(): string
    {
        return '<input type="hidden" name="_csrf" value="' . self::token() . '">';
    }

    public static function isValid(?string $given): bool
    {
        Session::start();
        $attendu = (string) ($_SESSION[self::CLE] ?? '');

        // hash_equals : une comparaison ordinaire s'arrête au premier
        // caractère différent et laisse deviner le jeton octet par octet.
        return $attendu !== '' && is_string($given) && hash_equals($attendu, $given);
    }
}
