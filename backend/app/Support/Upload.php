<?php

declare(strict_types=1);

namespace Sungku\Support;

use RuntimeException;

/**
 * Réception d'une image de couverture.
 *
 * Un envoi de fichier est une des rares occasions où un visiteur écrit sur le
 * disque du serveur. Trois précautions non négociables :
 *
 * 1. Le type est déterminé par le CONTENU (getimagesize), jamais par le nom ni
 *    par le Content-Type annoncé — tous deux choisis par le client.
 * 2. Le nom est régénéré aléatoirement. Conserver celui d'origine, c'est
 *    accepter « ../../.env » ou « shell.php » comme nom de fichier.
 * 3. Le dossier de destination refuse l'exécution de PHP, au cas où une image
 *    valide contiendrait malgré tout du code dans ses métadonnées.
 */
final class Upload
{
    private const TAILLE_MAX = 4 * 1024 * 1024;

    private const TYPES = [
        IMAGETYPE_JPEG => 'jpg',
        IMAGETYPE_PNG => 'png',
        IMAGETYPE_WEBP => 'webp',
    ];

    /**
     * @param array{name?:string, tmp_name?:string, error?:int, size?:int} $file
     * @return string|null chemin public, ou null si aucun fichier envoyé
     */
    public static function coverImage(array $file): ?string
    {
        $erreur = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);

        if ($erreur === UPLOAD_ERR_NO_FILE) {
            return null; // l'image est facultative
        }

        if ($erreur !== UPLOAD_ERR_OK) {
            throw new RuntimeException('Le transfert de l’image a échoué.');
        }

        $tmp = (string) ($file['tmp_name'] ?? '');

        // is_uploaded_file : sans ce contrôle, un chemin fabriqué ferait lire
        // n'importe quel fichier du serveur, /etc/passwd compris.
        if ($tmp === '' || !is_uploaded_file($tmp)) {
            throw new RuntimeException('Fichier invalide.');
        }

        if ((int) ($file['size'] ?? 0) > self::TAILLE_MAX) {
            throw new RuntimeException('L’image ne doit pas dépasser 4 Mo.');
        }

        $infos = @getimagesize($tmp);
        if ($infos === false || !isset(self::TYPES[$infos[2]])) {
            throw new RuntimeException('Format non accepté. Utilisez JPEG, PNG ou WebP.');
        }

        $dossier = dirname(__DIR__, 2) . '/uploads';
        if (!is_dir($dossier) && !@mkdir($dossier, 0755, true) && !is_dir($dossier)) {
            throw new RuntimeException('Stockage des images indisponible.');
        }

        $nom = bin2hex(random_bytes(16)) . '.' . self::TYPES[$infos[2]];

        if (!move_uploaded_file($tmp, $dossier . '/' . $nom)) {
            throw new RuntimeException('Enregistrement de l’image impossible.');
        }

        @chmod($dossier . '/' . $nom, 0644);

        return '/uploads/' . $nom;
    }

    /** Supprime une couverture devenue inutile, sans jamais sortir du dossier. */
    public static function delete(?string $cheminPublic): void
    {
        if ($cheminPublic === null || !str_starts_with($cheminPublic, '/uploads/')) {
            return;
        }

        $fichier = dirname(__DIR__, 2) . '/uploads/' . basename($cheminPublic);
        if (is_file($fichier)) {
            @unlink($fichier);
        }
    }
}
