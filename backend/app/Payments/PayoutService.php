<?php

declare(strict_types=1);

namespace Sungku\Payments;

use RuntimeException;
use Sungku\Core\Db;
use Sungku\Core\Env;
use Sungku\Core\Logger;
use Sungku\Core\Settings;
use Sungku\Support\Msisdn;
use Sungku\Support\Text;
use Sungku\Support\Uuid;

/**
 * Reversement d'une collecte à son organisateur.
 *
 * Les mêmes invariants que pour les encaissements, avec un enjeu inversé :
 * ici c'est l'argent de la plateforme qui sort. Un doublon ne fait pas perdre
 * une recette, il fait payer deux fois.
 *
 * D'où : la ligne est écrite AVANT l'appel sortant, son identifiant sert de
 * payoutId, et le solde disponible déduit les reversements encore en attente.
 */
final class PayoutService
{
    public function __construct(
        private readonly PawaPayClient $client = new PawaPayClient(),
    ) {
    }

    /**
     * @return array{payout: array, balance: array}
     * @throws RuntimeException si le montant demandé dépasse le disponible
     */
    public function send(int $campaignId, int $grossAmount, string $phone, ?int $requestedBy = null): array
    {
        $campaign = Db::selectOne('SELECT * FROM campaigns WHERE id = :id', ['id' => $campaignId]);
        if ($campaign === null) {
            throw new RuntimeException('Collecte introuvable.');
        }

        $balance = Balance::forCampaign($campaignId);

        if ($grossAmount <= 0) {
            throw new RuntimeException('Le montant doit être positif.');
        }

        // Contrôle du plafond au moment de l'envoi, pas seulement à
        // l'affichage : entre le chargement de la page et la soumission, un
        // autre administrateur a pu reverser.
        if ($grossAmount > $balance['available']) {
            throw new RuntimeException(sprintf(
                'Montant supérieur au disponible (%d FCFA).',
                $balance['available'],
            ));
        }

        $rate = (float) $balance['fee_rate'];
        $fee = Settings::feeAmount($grossAmount, $rate);
        $net = $grossAmount - $fee;

        if ($net <= 0) {
            throw new RuntimeException('Après commission, le montant net est nul.');
        }

        $msisdn = Msisdn::normalise($phone);
        $payoutId = Uuid::v4();
        $currency = Env::get('PAWAPAY_CURRENCY', 'XAF') ?? 'XAF';

        $provider = (string) ($this->client->predictProvider($msisdn)['provider'] ?? '');

        Db::execute(
            'INSERT INTO payouts
                (id, campaign_id, organizer_id, gross_amount, fee_rate, fee_amount, amount,
                 currency, phone_number, provider, status, requested_by, created_at, updated_at)
             VALUES
                (:id, :campaign_id, :organizer_id, :gross, :rate, :fee, :net,
                 :currency, :phone, :provider, :status, :by, NOW(), NOW())',
            [
                'id' => $payoutId,
                'campaign_id' => $campaignId,
                'organizer_id' => $campaign['organizer_id'],
                'gross' => $grossAmount,
                'rate' => $rate,
                'fee' => $fee,
                'net' => $net,
                'currency' => $currency,
                'phone' => $msisdn,
                'provider' => $provider,
                'status' => StatusMapper::PENDING,
                'by' => $requestedBy,
            ],
        );

        try {
            $response = $this->client->createPayout(
                payoutId: $payoutId,
                amount: (string) $net,
                currency: $currency,
                phoneNumber: $msisdn,
                provider: $provider,
                customerMessage: Text::customerMessage(
                    (Env::get('PAYMENT_LABEL', 'TRU GROUP') ?? 'TRU GROUP') . ' reversement',
                ),
                clientReferenceId: (string) $campaign['slug'],
                metadata: ['campaignId' => (string) $campaignId],
            );
        } catch (PawaPayException $e) {
            // Une issue indéterminée laisse le reversement en attente : le
            // déclarer échoué le rendrait rejouable, et l'argent partirait
            // peut-être deux fois.
            $status = $e->isIndeterminate() ? StatusMapper::PENDING : StatusMapper::FAILED;
            $this->markFailure($payoutId, $status, $e->failureCode, $e->getMessage());

            Logger::payment('Reversement refusé', [
                'payoutId' => $payoutId,
                'code' => $e->failureCode,
                'resultat' => $status,
            ]);

            throw $e;
        }

        if (($response['status'] ?? '') === 'REJECTED') {
            $reason = $response['failureReason'] ?? [];
            $this->markFailure(
                $payoutId,
                StatusMapper::FAILED,
                (string) ($reason['failureCode'] ?? 'REJECTED'),
                (string) ($reason['failureMessage'] ?? 'Reversement rejeté.'),
            );
        }

        Logger::payment('Reversement initié', [
            'payoutId' => $payoutId,
            'net' => $net,
            'commission' => $fee,
            'status' => $response['status'] ?? '',
        ]);

        return [
            'payout' => $this->find($payoutId),
            'balance' => Balance::forCampaign($campaignId),
        ];
    }

    /** Relit l'état réel auprès de pawaPay. Point d'entrée du cron et du back-office. */
    public function refresh(string $payoutId): ?array
    {
        $payout = $this->find($payoutId);
        if ($payout === null || StatusMapper::isFinal($payout['status'])) {
            return $payout;
        }

        try {
            $remote = $this->client->getPayout($payoutId);
        } catch (PawaPayException $e) {
            if ($e->httpStatus === 404) {
                // Inconnu de pawaPay : le reversement n'a jamais été créé,
                // donc aucun mouvement de fonds. Échec prouvé.
                $this->markFailure($payoutId, StatusMapper::FAILED, 'NOT_FOUND', 'Reversement inconnu de pawaPay.');

                return $this->find($payoutId);
            }

            Db::execute('UPDATE payouts SET last_checked_at = NOW() WHERE id = :id', ['id' => $payoutId]);

            return $payout;
        }

        $data = $remote['data'] ?? $remote;
        $status = StatusMapper::fromPawaPay((string) ($data['status'] ?? ''));
        $reason = $data['failureReason'] ?? [];

        Db::execute(
            'UPDATE payouts
                SET status = :status,
                    provider_tx_id = COALESCE(:tx, provider_tx_id),
                    failure_code = :code,
                    failure_message = :message,
                    completed_at = CASE WHEN :final = 1 THEN NOW() ELSE completed_at END,
                    last_checked_at = NOW(),
                    updated_at = NOW()
              WHERE id = :id',
            [
                'status' => $status,
                'tx' => $data['providerTransactionId'] ?? null,
                'code' => $reason['failureCode'] ?? null,
                'message' => $reason['failureMessage'] ?? null,
                'final' => (int) StatusMapper::isFinal($status),
                'id' => $payoutId,
            ],
        );

        return $this->find($payoutId);
    }

    /** @return array<int, array> */
    public function stale(int $minutes = 15, int $limit = 50): array
    {
        return Db::select(
            'SELECT id FROM payouts
              WHERE status IN (:pending, :processing)
                AND created_at < (NOW() - INTERVAL ' . (int) $minutes . ' MINUTE)
              ORDER BY created_at ASC
              LIMIT ' . (int) $limit,
            ['pending' => StatusMapper::PENDING, 'processing' => StatusMapper::PROCESSING],
        );
    }

    public function find(string $payoutId): ?array
    {
        return Db::selectOne('SELECT * FROM payouts WHERE id = :id', ['id' => $payoutId]);
    }

    private function markFailure(string $payoutId, string $status, string $code, string $message): void
    {
        Db::execute(
            'UPDATE payouts
                SET status = :status, failure_code = :code, failure_message = :message,
                    completed_at = CASE WHEN :final = 1 THEN NOW() ELSE completed_at END,
                    updated_at = NOW()
              WHERE id = :id',
            [
                'status' => $status,
                'code' => $code,
                'message' => mb_substr($message, 0, 255),
                'final' => (int) StatusMapper::isFinal($status),
                'id' => $payoutId,
            ],
        );
    }
}
