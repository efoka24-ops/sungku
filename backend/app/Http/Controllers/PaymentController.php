<?php

declare(strict_types=1);

namespace Sungku\Http\Controllers;

use Sungku\Core\Request;
use Sungku\Core\Response;
use Sungku\Payments\PawaPayClient;
use Sungku\Payments\PawaPayException;
use Sungku\Support\Msisdn;

final class PaymentController
{
    public function __construct(
        private readonly PawaPayClient $client = new PawaPayClient(),
    ) {
    }

    /**
     * Opérateurs réellement opérationnels, pour alimenter le sélecteur du
     * frontend. Afficher un opérateur en panne ne produit que des paiements
     * échoués ; lire la configuration en direct évite aussi un redéploiement
     * le jour où il revient.
     */
    public function providers(Request $request): void
    {
        try {
            $conf = $this->client->activeConfiguration($request->query['country'] ?? 'CMR');
        } catch (PawaPayException $e) {
            Response::error('Configuration des opérateurs indisponible.', 502);

            return;
        }

        $result = [];
        foreach ($conf['countries'] ?? [] as $country) {
            foreach ($country['providers'] ?? [] as $provider) {
                foreach ($provider['currencies'] ?? [] as $currency) {
                    $deposit = $currency['operationTypes']['DEPOSIT'] ?? null;
                    if (($deposit['status'] ?? '') !== 'OPERATIONAL') {
                        continue;
                    }

                    $result[] = [
                        'provider' => $provider['provider'],
                        'displayName' => $provider['displayName'] ?? $provider['provider'],
                        'logo' => $provider['logo'] ?? null,
                        'currency' => $currency['currency'],
                        'minAmount' => $deposit['minAmount'],
                        'maxAmount' => $deposit['maxAmount'],
                    ];
                }
            }
        }

        Response::json($result);
    }

    /** Valide un numéro et renvoie son opérateur, avant même la saisie du montant. */
    public function predict(Request $request): void
    {
        $phone = Msisdn::normalise($request->string('phoneNumber'));

        if (!Msisdn::isPlausible($phone)) {
            Response::error('Numéro de téléphone invalide.', 422);

            return;
        }

        try {
            Response::json($this->client->predictProvider($phone));
        } catch (PawaPayException $e) {
            Response::error($e->getMessage(), 422, ['failureCode' => $e->failureCode]);
        }
    }
}
