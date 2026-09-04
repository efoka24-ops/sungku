<?php

declare(strict_types=1);

namespace Sungku\Core;

/**
 * Paramètres de plateforme modifiables depuis le back-office.
 *
 * La grille des commissions vit ici et non dans le code : la changer ne doit
 * pas demander un déploiement. Elle ne s'applique en revanche qu'aux
 * collectes créées ensuite — le taux accepté est figé sur chaque collecte.
 */
final class Settings
{
    public const TERMS_VERSION = '2026-09';

    /** Taux par catégorie, en pourcentage du montant collecté. */
    private const FEES_DEFAUT = [
        'SANTE' => 0.0,
        'FUNERAILLES' => 0.0,
        'EDUCATION' => 1.5,
        'TONTINE' => 1.0,
        'PROJET_COMMUNAUTAIRE' => 2.5,
        'ENTREPRISE' => 4.0,
        'AUTRE' => 3.0,
    ];

    /** @return array<string, float> */
    public static function fees(): array
    {
        $row = Db::selectOne(
            'SELECT value FROM platform_settings WHERE setting_key = :k',
            ['k' => 'fees'],
        );

        if ($row === null) {
            return self::FEES_DEFAUT;
        }

        $decoded = json_decode((string) $row['value'], true);
        if (!is_array($decoded)) {
            return self::FEES_DEFAUT;
        }

        // Fusion avec les défauts : une catégorie ajoutée au code plus tard
        // aurait sinon un taux nul, donc gratuite sans que personne l'ait
        // décidé.
        return array_map('floatval', array_merge(self::FEES_DEFAUT, $decoded));
    }

    public static function feeFor(string $category): float
    {
        $fees = self::fees();

        return (float) ($fees[strtoupper($category)] ?? $fees['AUTRE']);
    }

    /** @param array<string, float> $fees */
    public static function saveFees(array $fees): void
    {
        $propre = [];
        foreach ($fees as $categorie => $taux) {
            $taux = (float) $taux;

            // Bornes dures : un taux négatif reverserait plus que collecté, et
            // au-delà de 20 % on est en dehors de toute grille plausible —
            // plus probablement une faute de frappe.
            $propre[strtoupper((string) $categorie)] = max(0.0, min(20.0, $taux));
        }

        $value = json_encode($propre, JSON_UNESCAPED_UNICODE);

        Db::execute(
            'INSERT INTO platform_settings (setting_key, value, updated_at)
             VALUES (:k, :v, NOW())
             ON DUPLICATE KEY UPDATE value = :v2, updated_at = NOW()',
            ['k' => 'fees', 'v' => $value, 'v2' => $value],
        );
    }

    /** Commission due sur un montant, arrondie à l'unité (le XAF n'a pas de décimales). */
    public static function feeAmount(int $gross, float $rate): int
    {
        return (int) round($gross * $rate / 100);
    }
}
