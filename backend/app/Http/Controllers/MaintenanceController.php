<?php

declare(strict_types=1);

namespace Sungku\Http\Controllers;

use Sungku\Core\Db;
use Sungku\Core\Env;
use Sungku\Core\Logger;
use Sungku\Core\Migrator;
use Sungku\Core\Request;
use Sungku\Core\Response;

/**
 * Opérations d'exploitation déclenchées par HTTP, faute d'accès shell sur
 * l'hébergement mutualisé.
 *
 * Protégées par MIGRATE_KEY, comparée en temps constant. Sans clé définie, la
 * route répond 503 plutôt que de s'ouvrir : un endpoint de migration
 * accessible à tous laisserait n'importe qui rejouer le schéma.
 */
final class MaintenanceController
{
    public function migrate(Request $request): void
    {
        if (!$this->authorised($request)) {
            return;
        }

        try {
            $applied = Migrator::run();
        } catch (\Throwable $e) {
            Logger::write('error', 'Migration en échec', ['erreur' => $e->getMessage()]);
            Response::error('Migration en échec : ' . $e->getMessage(), 500);

            return;
        }

        Logger::write('deploy', 'Migrations appliquées', ['versions' => $applied]);

        Response::json([
            'applied' => $applied,
            'message' => $applied === [] ? 'Base déjà à jour.' : count($applied) . ' migration(s) appliquée(s).',
        ]);
    }

    /** Diagnostic de configuration : ce qui est branché, sans jamais révéler de secret. */
    public function status(Request $request): void
    {
        if (!$this->authorised($request)) {
            return;
        }

        $database = 'indisponible';
        $tables = [];

        try {
            // SHOW TABLES nomme sa colonne d'après la base : on prend la
            // première valeur de chaque ligne plutôt que de deviner ce nom.
            $rows = Db::select('SHOW TABLES');
            $database = 'connectée';
            $tables = array_map(static fn (array $r): string => (string) reset($r), $rows);
        } catch (\Throwable $e) {
            $database = 'erreur : ' . $e->getMessage();
        }

        Response::json([
            'php' => PHP_VERSION,
            'https' => ($_SERVER['HTTPS'] ?? '') === 'on',
            'database' => $database,
            'tables' => $tables,
            // Seule l'information « configuré ou non » sort d'ici : ni le
            // token, ni le mot de passe, ni même leur longueur.
            'pawapay' => [
                'baseUrl' => Env::get('PAWAPAY_BASE_URL'),
                'tokenConfigured' => (Env::get('PAWAPAY_API_TOKEN', '') ?? '') !== '',
            ],
            'mail' => [
                'host' => Env::get('MAIL_HOST'),
                'configured' => (Env::get('MAIL_PASSWORD', '') ?? '') !== '',
            ],
        ]);
    }

    /**
     * Attribue un rôle à un compte existant.
     *
     * Il n'existe pas d'écran pour cela, et il ne doit pas en exister : une
     * page « donner les droits admin » accessible depuis le site serait la
     * cible la plus rentable de toute la plateforme. Cette route passe par la
     * clé d'exploitation, au même titre que les migrations.
     */
    public function grantRole(Request $request): void
    {
        if (!$this->authorised($request)) {
            return;
        }

        $email = mb_strtolower($request->string('email'));
        $role = strtoupper($request->string('role'));

        // Liste blanche : un rôle libre permettrait d'en inventer un que le
        // code ne vérifie nulle part, donc de croire à tort à une protection.
        if (!in_array($role, ['ADMIN', 'ORGANIZER', 'API_MERCHANT'], true)) {
            Response::error('Rôle inconnu.', 422);

            return;
        }

        $user = Db::selectOne('SELECT id FROM users WHERE email = :e LIMIT 1', ['e' => $email]);
        if ($user === null) {
            Response::error('Aucun compte avec cette adresse.', 404);

            return;
        }

        Db::execute(
            'INSERT IGNORE INTO user_roles (user_id, role) VALUES (:id, :role)',
            ['id' => $user['id'], 'role' => $role],
        );

        Logger::write('deploy', 'Rôle attribué', ['email' => $email, 'role' => $role]);

        Response::json([
            'email' => $email,
            'roles' => array_column(
                Db::select('SELECT role FROM user_roles WHERE user_id = :id', ['id' => $user['id']]),
                'role',
            ),
            'note' => 'Reconnectez-vous : les rôles sont chargés à la connexion.',
        ]);
    }

    private function authorised(Request $request): bool
    {
        $expected = Env::get('MIGRATE_KEY', '') ?? '';

        if ($expected === '') {
            Response::error('Maintenance non configurée.', 503);

            return false;
        }

        $given = $request->header('X-Migrate-Key') ?? '';

        // hash_equals : une comparaison ordinaire s'arrête au premier
        // caractère différent, ce qui laisse deviner la clé octet par octet.
        if (!hash_equals($expected, $given)) {
            Logger::write('error', 'Tentative de maintenance non autorisée', ['ip' => $request->ip()]);
            Response::error('Accès refusé.', 403);

            return false;
        }

        return true;
    }
}
