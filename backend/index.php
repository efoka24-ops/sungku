<?php

declare(strict_types=1);

/**
 * Front controller — seule porte d'entrée de l'API.
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
use Sungku\Http\Controllers\AuthController;
use Sungku\Http\Controllers\CampaignController;
use Sungku\Http\Controllers\ContributionController;
use Sungku\Http\Controllers\PaymentController;
use Sungku\Http\Controllers\MaintenanceController;
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

$auth = new AuthController();
$campaigns = new CampaignController();
$contributions = new ContributionController();
$payments = new PaymentController();
$webhooks = new WebhookController();

// Racine : ce service est une API, ouvrir le domaine dans un navigateur ne
// montre donc rien d'autre que ceci. Mieux vaut un index explicite qu'un
// « Ressource introuvable » qui laisse croire à une panne.
$router->get('/', static fn () => Response::json([
    'service' => 'Sungku API',
    'status' => 'ok',
    'time' => gmdate('c'),
    'endpoints' => [
        'GET  /health',
        'GET  /campaigns',
        'GET  /campaigns/{slug}',
        'GET  /campaigns/{slug}/contributions',
        'POST /campaigns/{slug}/contributions',
        'GET  /contributions/{id}',
        'GET  /payments/providers',
        'POST /payments/predict-provider',
        'POST /auth/register',
        'POST /auth/login',
        'GET  /auth/me',
    ],
]));

$router->get('/health', static fn () => Response::json(['status' => 'ok', 'time' => gmdate('c')]));

$router->post('/auth/register', [$auth, 'register']);
$router->post('/auth/login', [$auth, 'login']);
$router->post('/auth/logout', [$auth, 'logout']);
$router->get('/auth/me', [$auth, 'me']);

$router->get('/campaigns', [$campaigns, 'index']);
$router->post('/campaigns', [$campaigns, 'store']);
$router->get('/campaigns/{slug}', [$campaigns, 'show']);

$router->get('/campaigns/{slug}/contributions', [$contributions, 'index']);
$router->post('/campaigns/{slug}/contributions', [$contributions, 'store']);
$router->get('/contributions/{id}', [$contributions, 'show']);

$router->get('/payments/providers', [$payments, 'providers']);
$router->post('/payments/predict-provider', [$payments, 'predict']);

// URL à déclarer dans le dashboard pawaPay (Callback URLs).
$router->post('/payments/callbacks/pawapay', [$webhooks, 'pawapay']);

// Exploitation : pas d'accès shell sur cet hébergement, ces deux routes en
// tiennent lieu. Protégées par MIGRATE_KEY, inertes si la clé n'est pas définie.
$maintenance = new MaintenanceController();
$router->post('/internal/migrate', [$maintenance, 'migrate']);
$router->get('/internal/status', [$maintenance, 'status']);

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
