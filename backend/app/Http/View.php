<?php

declare(strict_types=1);

namespace Sungku\Http;

/**
 * Rendu des pages : un gabarit commun, des vues qui n'écrivent que leur
 * contenu. Pas de moteur de template — Twig demanderait Composer, absent de
 * ce socle.
 */
final class View
{
    /** @param array<string, mixed> $data */
    public static function render(string $view, array $data = [], string $title = 'Sungku'): void
    {
        $file = dirname(__DIR__, 2) . '/views/' . $view . '.php';

        if (!is_file($file)) {
            http_response_code(500);
            echo 'Vue introuvable.';

            return;
        }

        extract($data, EXTR_SKIP);

        ob_start();
        require $file;
        $content = (string) ob_get_clean();

        header('Content-Type: text/html; charset=utf-8');
        require dirname(__DIR__, 2) . '/views/layout.php';
    }

    /**
     * Échappement systématique de tout ce qui vient de l'utilisateur : titres
     * de cagnotte, noms de contributeurs et messages sont saisis librement et
     * affichés à tous les visiteurs. Sans cela, un titre contenant du script
     * s'exécuterait dans le navigateur de chaque personne qui ouvre la page.
     */
    public static function e(?string $value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    public static function fcfa(int $amount): string
    {
        return number_format($amount, 0, ',', ' ') . ' FCFA';
    }

    /** Part collectée, plafonnée à 100 % pour que la jauge ne déborde jamais. */
    public static function percent(int $collected, int $goal): int
    {
        if ($goal <= 0) {
            return 0;
        }

        return (int) min(100, round($collected / $goal * 100));
    }
}
