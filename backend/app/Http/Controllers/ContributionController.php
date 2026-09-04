<?php

declare(strict_types=1);

namespace Sungku\Http\Controllers;

use Sungku\Core\Db;
use Sungku\Core\Env;
use Sungku\Core\Request;
use Sungku\Core\Response;
use Sungku\Payments\DepositService;
use Sungku\Payments\PawaPayException;
use Sungku\Payments\StatusMapper;
use Sungku\Support\Msisdn;

final class ContributionController
{
    public function __construct(
        private readonly DepositService $deposits = new DepositService(),
    ) {
    }

    /** Mur des contributeurs : uniquement les contributions réellement encaissées. */
    public function index(Request $request, array $params): void
    {
        $campaign = CampaignController::findBySlugOrId($params['slug']);
        if ($campaign === null) {
            Response::error('Campagne introuvable.', 404);

            return;
        }

        $rows = Db::select(
            'SELECT id, amount, currency, contributor_name, is_anonymous, message, created_at
               FROM contributions
              WHERE campaign_id = :id AND status = :confirmed
              ORDER BY created_at DESC
              LIMIT 200',
            ['id' => $campaign['id'], 'confirmed' => StatusMapper::CONFIRMED],
        );

        // Le numéro de téléphone n'est jamais exposé publiquement.
        Response::json(array_map(static fn (array $r): array => [
            'id' => $r['id'],
            'amount' => (int) $r['amount'],
            'currency' => $r['currency'],
            'contributorName' => $r['is_anonymous'] ? null : $r['contributor_name'],
            'isAnonymous' => (bool) $r['is_anonymous'],
            'message' => $r['message'],
            'createdAt' => $r['created_at'],
        ], $rows));
    }

    public function store(Request $request, array $params): void
    {
        $campaign = CampaignController::findBySlugOrId($params['slug']);
        if ($campaign === null) {
            Response::error('Campagne introuvable.', 404);

            return;
        }

        if ($campaign['status'] !== 'ACTIVE') {
            Response::error('Cette campagne n’accepte plus de contributions.', 409);

            return;
        }

        $amount = $request->int('amount');
        $phone = Msisdn::normalise($request->string('phoneNumber'));
        $min = (int) (Env::get('PAYMENT_MIN_AMOUNT', '100') ?? '100');
        $max = (int) (Env::get('PAYMENT_MAX_AMOUNT', '1000000') ?? '1000000');

        if ($amount < $min || $amount > $max) {
            Response::error("Le montant doit être compris entre {$min} et {$max} XAF.", 422);

            return;
        }

        if (!Msisdn::isPlausible($phone)) {
            Response::error('Numéro de téléphone invalide.', 422);

            return;
        }

        try {
            $result = $this->deposits->collect([
                'campaign' => $campaign,
                'amount' => $amount,
                'phoneNumber' => $phone,
                'provider' => $request->string('provider') ?: null,
                'contributorName' => $request->string('contributorName') ?: null,
                'isAnonymous' => $request->bool('isAnonymous'),
                'message' => $request->string('message') ?: null,
            ]);
        } catch (PawaPayException $e) {
            // Issue indéterminée : la contribution reste en attente et le cron
            // tranchera. Répondre « échec » ici ferait retenter le
            // contributeur, avec le risque d'un second débit.
            if ($e->isIndeterminate()) {
                Response::error(
                    'Paiement en cours de vérification. Ne relancez pas : consultez le statut dans un instant.',
                    503,
                );

                return;
            }

            Response::error($e->getMessage(), 402, ['failureCode' => $e->failureCode]);

            return;
        }

        $contribution = $result['contribution'];

        Response::json([
            'id' => $contribution['id'],
            'status' => $contribution['status'],
            'amount' => (int) $contribution['amount'],
            'provider' => $contribution['provider'],
            'phoneNumber' => Msisdn::mask((string) $contribution['phone_number']),
            'message' => 'Validez le paiement avec votre code PIN sur votre téléphone.',
        ], 201);
    }

    /**
     * Sondé par le tunnel de paiement. Sert de filet de sécurité si le
     * callback n'est pas encore arrivé : on interroge pawaPay à la demande,
     * sans attendre le passage du cron.
     */
    public function show(Request $request, array $params): void
    {
        $contribution = $this->deposits->find($params['id']);
        if ($contribution === null) {
            Response::error('Contribution introuvable.', 404);

            return;
        }

        if (!StatusMapper::isFinal($contribution['status'])) {
            $contribution = $this->deposits->refresh($params['id']) ?? $contribution;
        }

        Response::json([
            'id' => $contribution['id'],
            'status' => $contribution['status'],
            'amount' => (int) $contribution['amount'],
            'failureMessage' => $contribution['failure_message'],
            'completedAt' => $contribution['completed_at'],
        ]);
    }
}
