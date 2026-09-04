<?php

declare(strict_types=1);

/**
 * Front controller — seule porte d'entrée, pages HTML comprises.
 *
 * Tout passe par ici, donc en-têtes de sécurité, CORS et gestion d'erreur
 * s'appliquent partout sans exception possible. C'est la différence avec une
 * arborescence de fichiers .php isolés, où il suffit d'en oublier un.
 */

use Sungku\Core\Env;
use Sungku\Core\Logger;
use Sungku\Core\Request;
use Sungku\Core\Response;
use Sungku\Core\Router;
use Sungku\Http\Controllers\AdminController;
use Sungku\Http\Controllers\AuthController;
use Sungku\Http\Controllers\CampaignController;
use Sungku\Http\Controllers\ContributionController;
use Sungku\Http\Controllers\DashboardController;
use Sungku\Http\Controllers\PaymentController;
use Sungku\Http\Controllers\MaintenanceController;
use Sungku\Http\Controllers\PageController;
use Sungku\Http\Controllers\WebhookController;

// La racine web du sous-domaine EST ce dossier : app/, bin/, database/ et le
// .env s'y trouvent donc aussi. Ils ne sont pas servis pour autant — le
// .htaccess d'à côté refuse le .env et chaque dossier de code porte le sien
// avec un « Require all denied ». C'est le prix de l'hébergement mutualisé,
// dont le compte FTP est cloisonné sur ce répertoire : impossible de placer
// le code ailleurs.
$root = __DIR__;

require $root . '/autoload.php';

Env::load($root . '/.env');

// En production, une trace d'erreur affichée révèle chemins, requêtes SQL et
// parfois des secrets. On journalise, on n'affiche pas.
$debug = !Env::isProduction();
ini_set('display_errors', $debug ? '1' : '0');
error_reporting(E_ALL);

$request = Request::capture();

Response::securityHeaders();
Response::cors($request);

if ($request->method === 'OPTIONS') {
    http_response_code(204);
    exit;
}
$router = new Router();

$pages = new PageController();
$auth = new AuthController();
$campaigns = new CampaignController();
$contributions = new ContributionController();
$payments = new PaymentController();
$webhooks = new WebhookController();
$maintenance = new MaintenanceController();
$dashboard = new DashboardController();
$admin = new AdminController();

// ─── Pages ──────────────────────────────────────────────────────────────────
// Rendues côté serveur : le socle n'a pas de chaîne de construction, et une
// page de cagnotte doit rester lisible par les robots pour être partageable.
$router->get('/', [$pages, 'home']);
$router->get('/c/{slug}', [$pages, 'campaign']);
$router->get('/connexion', [$pages, 'loginForm']);
$router->post('/connexion', [$pages, 'login']);
$router->post('/inscription', [$pages, 'register']);
$router->get('/deconnexion', [$pages, 'logout']);
$router->get('/creer', [$pages, 'createForm']);
$router->post('/creer', [$pages, 'create']);

// ─── Espace organisateur ────────────────────────────────────────────────────
$router->get('/tableau-de-bord', [$dashboard, 'index']);
$router->get('/tableau-de-bord/contributions', [$dashboard, 'contributions']);

// ─── Back-office ────────────────────────────────────────────────────────────
// Le contrôle du rôle ADMIN est fait dans chaque méthode, pas ici : une route
// ajoutée plus tard hériterait sinon silencieusement de l'oubli.
$router->get('/admin', [$admin, 'index']);
$router->get('/admin/collectes', [$admin, 'campaigns']);
$router->get('/admin/contributions', [$admin, 'contributions']);
$router->get('/admin/utilisateurs', [$admin, 'users']);
$router->post('/admin/moderation', [$admin, 'moderate']);
$router->post('/admin/revalider', [$admin, 'recheck']);

$router->get('/admin/reversements', [$admin, 'payouts']);
$router->post('/admin/reversements', [$admin, 'sendPayout']);
$router->post('/admin/reversements/verifier', [$admin, 'recheckPayout']);

$router->get('/admin/parametres', [$admin, 'settings']);
$router->post('/admin/parametres', [$admin, 'saveSettings']);

$router->get('/admin/collectes/{id}', [$admin, 'editCampaign']);
$router->post('/admin/collectes/modifier', [$admin, 'updateCampaign']);
$router->post('/admin/collectes/supprimer', [$admin, 'deleteCampaign']);

$router->post('/admin/utilisateurs/role', [$admin, 'toggleRole']);

// ─── API ────────────────────────────────────────────────────────────────────
// Préfixée /api pour ne pas disputer l'espace d'URL aux pages : sans cela,
// une cagnotte nommée « health » ou « campaigns » masquerait une route.
$router->get('/api/health', static fn () => Response::json(['status' => 'ok', 'time' => gmdate('c')]));
$router->get('/health', static fn () => Response::json(['status' => 'ok', 'time' => gmdate('c')]));

$router->post('/api/auth/register', [$auth, 'register']);
$router->post('/api/auth/login', [$auth, 'login']);
$router->post('/api/auth/logout', [$auth, 'logout']);
$router->get('/api/auth/me', [$auth, 'me']);

$router->get('/api/campaigns', [$campaigns, 'index']);
$router->post('/api/campaigns', [$campaigns, 'store']);
$router->get('/api/campaigns/{slug}', [$campaigns, 'show']);

$router->get('/api/campaigns/{slug}/contributions', [$contributions, 'index']);
$router->post('/api/campaigns/{slug}/contributions', [$contributions, 'store']);
$router->get('/api/contributions/{id}', [$contributions, 'show']);

$router->get('/api/payments/providers', [$payments, 'providers']);
$router->post('/api/payments/predict-provider', [$payments, 'predict']);

// URL à déclarer dans le dashboard pawaPay (Callback URLs).
$router->post('/api/payments/callbacks/pawapay', [$webhooks, 'pawapay']);

// Exploitation : pas d'accès shell sur cet hébergement, ces deux routes en
// tiennent lieu. Protégées par MIGRATE_KEY, inertes si la clé n'est pas définie.
$router->post('/internal/migrate', [$maintenance, 'migrate']);
$router->get('/internal/status', [$maintenance, 'status']);
$router->post('/internal/grant-role', [$maintenance, 'grantRole']);

try {
    $router->dispatch($request);
} catch (Throwable $e) {
    Logger::write('error', $e->getMessage(), [
        'path' => $request->path,
        'file' => $e->getFile() . ':' . $e->getLine(),
    ]);

    Response::error(
        $debug ? $e->getMessage() : 'Erreur interne du serveur.',
        500,
    );
}
