<?php

declare(strict_types=1);

namespace Sungku\Payments;

use RuntimeException;
use Sungku\Core\Env;
use Sungku\Core\Logger;

/**
 * Client de l'API Merchant pawaPay v2.
 *
 * Authentification par bearer token (docs.pawapay.io/v2/docs/how_to_start).
 * PHP 8.1, cURL, aucune dépendance externe.
 */
final class PawaPayClient
{
    private readonly string $baseUrl;
    private readonly string $apiToken;

    public function __construct(?string $baseUrl = null, ?string $apiToken = null)
    {
        // Le défaut est le bac à sable : si la configuration est incomplète,
        // on veut échouer sans argent réel plutôt que débiter par accident.
        $this->baseUrl = rtrim($baseUrl ?? Env::get('PAWAPAY_BASE_URL', 'https://api.sandbox.pawapay.io'), '/');
        $this->apiToken = $apiToken ?? Env::get('PAWAPAY_API_TOKEN', '');
    }

    public function isConfigured(): bool
    {
        return $this->apiToken !== '';
    }

    /**
     * Initie une collecte. La réponse est immédiate mais NON finale :
     * ACCEPTED signifie « pris en charge », pas « encaissé ».
     *
     * @param array<string, mixed> $metadata
     * @return array{depositId: string, status: string, failureReason?: array}
     */
    public function createDeposit(
        string $depositId,
        string $amount,
        string $currency,
        string $phoneNumber,
        string $provider,
        ?string $customerMessage = null,
        ?string $clientReferenceId = null,
        array $metadata = [],
    ): array {
        $payload = [
            'depositId' => $depositId,
            'amount' => $amount,
            'currency' => $currency,
            'payer' => [
                'type' => 'MMO',
                'accountDetails' => [
                    'phoneNumber' => $phoneNumber,
                    'provider' => $provider,
                ],
            ],
        ];

        if ($customerMessage !== null) {
            $payload['customerMessage'] = $customerMessage;
        }

        if ($clientReferenceId !== null) {
            $payload['clientReferenceId'] = $clientReferenceId;
        }

        if ($metadata !== []) {
            // pawaPay attend une liste d'objets à une clé, plafonnée à 10.
            $payload['metadata'] = array_map(
                static fn (string $k, mixed $v): array => [$k => (string) $v],
                array_keys($metadata),
                array_values($metadata),
            );
        }

        return $this->request('POST', '/v2/deposits', $payload);
    }

    /**
     * État réel d'un dépôt. C'est la seule source de vérité : ni la réponse
     * initiale ni le contenu d'un callback ne font foi.
     *
     * @return array<string, mixed>
     */
    public function getDeposit(string $depositId): array
    {
        return $this->request('GET', '/v2/deposits/' . rawurlencode($depositId));
    }

    /**
     * Envoie de l'argent vers un portefeuille mobile money, depuis le solde du
     * compte marchand. Même asymétrie que le dépôt : la réponse est immédiate
     * mais non finale.
     *
     * @param array<string, mixed> $metadata
     * @return array{payoutId: string, status: string, failureReason?: array}
     */
    public function createPayout(
        string $payoutId,
        string $amount,
        string $currency,
        string $phoneNumber,
        string $provider,
        ?string $customerMessage = null,
        ?string $clientReferenceId = null,
        array $metadata = [],
    ): array {
        $payload = [
            'payoutId' => $payoutId,
            'amount' => $amount,
            'currency' => $currency,
            'recipient' => [
                'type' => 'MMO',
                'accountDetails' => [
                    'phoneNumber' => $phoneNumber,
                    'provider' => $provider,
                ],
            ],
        ];

        if ($customerMessage !== null) {
            $payload['customerMessage'] = $customerMessage;
        }

        if ($clientReferenceId !== null) {
            $payload['clientReferenceId'] = $clientReferenceId;
        }

        if ($metadata !== []) {
            $payload['metadata'] = array_map(
                static fn (string $k, mixed $v): array => [$k => (string) $v],
                array_keys($metadata),
                array_values($metadata),
            );
        }

        return $this->request('POST', '/v2/payouts', $payload);
    }

    /** @return array<string, mixed> */
    public function getPayout(string $payoutId): array
    {
        return $this->request('GET', '/v2/payouts/' . rawurlencode($payoutId));
    }

    /** @return array<string, mixed> */
    public function createRefund(string $refundId, string $depositId, ?string $amount = null): array
    {
        $payload = ['refundId' => $refundId, 'depositId' => $depositId];
        if ($amount !== null) {
            $payload['amount'] = $amount;
        }

        return $this->request('POST', '/v2/refunds', $payload);
    }

    /**
     * Opérateur correspondant à un numéro, d'après pawaPay lui-même. Leur
     * table de préfixes est tenue à jour ; une table locale se périme à
     * chaque ouverture de plage par l'ARTP.
     *
     * @return array{country: string, provider: string, phoneNumber: string}
     */
    public function predictProvider(string $phoneNumber): array
    {
        return $this->request('POST', '/v2/predict-provider', ['phoneNumber' => $phoneNumber]);
    }

    /**
     * Opérateurs et bornes de montant actifs pour un pays.
     *
     * @return array<string, mixed>
     */
    public function activeConfiguration(string $country = 'CMR'): array
    {
        return $this->request('GET', '/v2/active-conf?country=' . rawurlencode($country));
    }

    /**
     * @param array<string, mixed>|null $payload
     * @return array<string, mixed>
     */
    private function request(string $method, string $path, ?array $payload = null): array
    {
        if (!$this->isConfigured()) {
            throw new PawaPayException('PAWAPAY_API_TOKEN absent : aucun appel possible.', 'NOT_CONFIGURED');
        }

        $ch = curl_init($this->baseUrl . $path);

        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->apiToken,
                'Content-Type: application/json',
                'Accept: application/json',
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        if ($payload !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_THROW_ON_ERROR));
        }

        $response = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            // Aucune réponse : l'issue est INDÉTERMINÉE, pas négative. La
            // demande a pu être reçue et traitée malgré le silence réseau.
            Logger::payment('Appel pawaPay sans réponse', ['method' => $method, 'path' => $path, 'curl' => $curlError]);

            throw new PawaPayException("Appel pawaPay sans réponse : {$curlError}", 'NETWORK_ERROR');
        }

        try {
            $decoded = json_decode((string) $response, true, flags: JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new PawaPayException("Réponse pawaPay illisible (HTTP {$status}).", 'INVALID_RESPONSE', $status);
        }

        $decoded = is_array($decoded) ? $decoded : [];

        if ($status >= 400) {
            $reason = $decoded['failureReason'] ?? [];

            throw new PawaPayException(
                (string) ($reason['failureMessage'] ?? "pawaPay a répondu HTTP {$status}."),
                (string) ($reason['failureCode'] ?? 'UNKNOWN_ERROR'),
                $status,
            );
        }

        return $decoded;
    }
}
