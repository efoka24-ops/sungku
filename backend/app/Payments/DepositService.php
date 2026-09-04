<?php

declare(strict_types=1);

namespace Sungku\Payments;

use Sungku\Core\Db;
use Sungku\Core\Env;
use Sungku\Core\Logger;
use Sungku\Mail\Notifications;
use Sungku\Support\Msisdn;
use Sungku\Support\Text;
use Sungku\Support\Uuid;

/**
 * Orchestration d'une collecte : création de la contribution, appel pawaPay,
 * puis rapprochement du statut réel.
 *
 * Deux invariants gouvernent ce fichier :
 *
 * 1. La contribution est écrite en base AVANT tout appel sortant. Une coupure
 *    au pire moment laisse ainsi toujours une trace portant le depositId —
 *    c'est ce qui rend le rapprochement possible.
 * 2. Le statut ne descend jamais de pawaPay sur parole : callback ou cron,
 *    on interroge GET /v2/deposits/{id} avant de trancher.
 */
final class DepositService
{
    public function __construct(
        private readonly PawaPayClient $client = new PawaPayClient(),
    ) {
    }

    /**
     * @param array{campaign: array, amount: int, phoneNumber: string, provider?: string,
     *              contributorName?: ?string, isAnonymous?: bool, message?: ?string} $input
     * @return array{contribution: array, status: string}
     */
    public function collect(array $input): array
    {
        $campaign = $input['campaign'];
        $currency = Env::get('PAWAPAY_CURRENCY', 'XAF') ?? 'XAF';
        $msisdn = Msisdn::normalise($input['phoneNumber']);
        $depositId = Uuid::v4();

        $provider = $input['provider'] ?? null;
        if ($provider === null || $provider === '') {
            // Table de préfixes tenue par pawaPay : plus fiable qu'une copie
            // locale, qui se périme à chaque ouverture de plage.
            $provider = (string) ($this->client->predictProvider($msisdn)['provider'] ?? '');
        }

        Db::execute(
            'INSERT INTO contributions
                (id, campaign_id, deposit_id, amount, currency, provider, phone_number,
                 contributor_name, contributor_email, is_anonymous, message, status, created_at, updated_at)
             VALUES
                (:id, :campaign_id, :deposit_id, :amount, :currency, :provider, :phone_number,
                 :contributor_name, :contributor_email, :is_anonymous, :message, :status, NOW(), NOW())',
            [
                'id' => $depositId, // même identifiant partout : un seul fil à tirer
                'campaign_id' => $campaign['id'],
                'deposit_id' => $depositId,
                'amount' => $input['amount'],
                'currency' => $currency,
                'provider' => $provider,
                'phone_number' => $msisdn,
                'contributor_name' => ($input['isAnonymous'] ?? false) ? null : ($input['contributorName'] ?? null),
                // L'adresse reste enregistrée même sur une contribution
                // anonyme : l'anonymat vaut vis-à-vis du public, pas contre
                // l'envoi du reçu à celui qui a payé.
                'contributor_email' => $input['contributorEmail'] ?? null,
                'is_anonymous' => (int) ($input['isAnonymous'] ?? false),
                'message' => $input['message'] ?? null,
                'status' => StatusMapper::PENDING,
            ],
        );

        try {
            $response = $this->client->createDeposit(
                depositId: $depositId,
                amount: (string) $input['amount'], // le XAF n'a pas de décimales
                currency: $currency,
                phoneNumber: $msisdn,
                provider: $provider,
                customerMessage: self::customerMessage($campaign['title']),
                clientReferenceId: (string) $campaign['slug'],
                metadata: ['campaignId' => (string) $campaign['id']],
            );
        } catch (PawaPayException $e) {
            // Échec prouvé (paramètre invalide, opérateur inconnu) : on tranche.
            // Sinon la contribution reste en attente et le cron la résoudra.
            $status = $e->isIndeterminate() ? StatusMapper::PENDING : StatusMapper::FAILED;

            $this->markFailure($depositId, $status, $e->failureCode, $e->getMessage());
            Logger::payment('Initiation refusée', [
                'depositId' => $depositId,
                'code' => $e->failureCode,
                'resultat' => $status,
            ]);

            throw $e;
        }

        $pawaPayStatus = (string) ($response['status'] ?? '');

        if ($pawaPayStatus === 'REJECTED') {
            $reason = $response['failureReason'] ?? [];
            $this->markFailure(
                $depositId,
                StatusMapper::FAILED,
                (string) ($reason['failureCode'] ?? 'REJECTED'),
                (string) ($reason['failureMessage'] ?? 'Dépôt rejeté par pawaPay.'),
            );

            return ['contribution' => $this->find($depositId), 'status' => StatusMapper::FAILED];
        }

        // ACCEPTED comme DUPLICATE_IGNORED laissent la contribution en attente :
        // le client doit encore saisir son code PIN.
        Db::execute(
            'UPDATE contributions SET status = :status, updated_at = NOW() WHERE id = :id',
            ['status' => StatusMapper::PENDING, 'id' => $depositId],
        );

        Logger::payment('Dépôt initié', ['depositId' => $depositId, 'status' => $pawaPayStatus]);

        return ['contribution' => $this->find($depositId), 'status' => StatusMapper::PENDING];
    }

    /**
     * Interroge pawaPay et applique le statut réel. Point d'entrée unique du
     * webhook et du cron : une seule logique de transition, donc un seul
     * endroit où se tromper.
     */
    public function refresh(string $depositId): ?array
    {
        $contribution = $this->find($depositId);
        if ($contribution === null) {
            return null;
        }

        if (StatusMapper::isFinal($contribution['status'])) {
            return $contribution; // déjà tranché : les rejeux n'y touchent pas
        }

        try {
            $remote = $this->client->getDeposit($depositId);
        } catch (PawaPayException $e) {
            if ($e->httpStatus === 404) {
                // pawaPay ne connaît pas ce dépôt : il n'a jamais été créé,
                // donc aucun mouvement de fonds. C'est un échec prouvé.
                $this->markFailure($depositId, StatusMapper::FAILED, 'NOT_FOUND', 'Dépôt inconnu de pawaPay.');

                return $this->find($depositId);
            }

            Db::execute('UPDATE contributions SET last_checked_at = NOW() WHERE id = :id', ['id' => $depositId]);

            return $contribution; // indéterminé : on retentera
        }

        // La v2 renvoie soit l'objet, soit une enveloppe {data: {...}}.
        $deposit = $remote['data'] ?? $remote;
        $status = StatusMapper::fromPawaPay((string) ($deposit['status'] ?? ''));
        $reason = $deposit['failureReason'] ?? [];

        Db::execute(
            'UPDATE contributions
                SET status = :status,
                    provider_tx_id = COALESCE(:provider_tx_id, provider_tx_id),
                    failure_code = :failure_code,
                    failure_message = :failure_message,
                    completed_at = CASE WHEN :is_final = 1 THEN NOW() ELSE completed_at END,
                    last_checked_at = NOW(),
                    updated_at = NOW()
              WHERE id = :id',
            [
                'status' => $status,
                'provider_tx_id' => $deposit['providerTransactionId'] ?? null,
                'failure_code' => $reason['failureCode'] ?? null,
                'failure_message' => $reason['failureMessage'] ?? null,
                'is_final' => (int) StatusMapper::isFinal($status),
                'id' => $depositId,
            ],
        );

        Logger::payment('Statut rapproché', ['depositId' => $depositId, 'status' => $status]);

        $updated = $this->find($depositId);

        if ($status === StatusMapper::CONFIRMED && $updated !== null) {
            $this->notifyOnce($updated);
        }

        return $updated;
    }

    /**
     * Envoie le reçu et l'alerte organisateur, une seule fois.
     *
     * Le callback pawaPay et le cron peuvent constater la confirmation à
     * quelques secondes d'intervalle. On réclame donc le droit d'envoyer par
     * un UPDATE conditionnel : une seule des deux exécutions verra
     * rowCount() === 1, l'autre repartira sans rien envoyer. Vérifier puis
     * écrire en deux temps laisserait au contraire une fenêtre pour un
     * double reçu.
     */
    private function notifyOnce(array $contribution): void
    {
        $claimed = Db::execute(
            'UPDATE contributions SET notified_at = NOW() WHERE id = :id AND notified_at IS NULL',
            ['id' => $contribution['id']],
        );

        if ($claimed !== 1) {
            return;
        }

        try {
            Notifications::make()->contributionConfirmed($contribution);
        } catch (\Throwable $e) {
            // Une messagerie indisponible ne remet pas en cause un
            // encaissement abouti : on trace et on continue.
            Logger::write('mail', 'Notification de contribution en échec', [
                'depositId' => $contribution['id'],
                'erreur' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Contributions en attente depuis assez longtemps pour qu'un callback
     * perdu soit l'explication la plus probable.
     *
     * @return array<int, array>
     */
    public function stale(int $minutes = 15, int $limit = 100): array
    {
        // INTERVAL et LIMIT n'acceptent pas de paramètre lié en MySQL : les
        // valeurs sont donc interpolées, après cast entier explicite.
        return Db::select(
            'SELECT id FROM contributions
              WHERE status IN (:pending, :processing)
                AND created_at < (NOW() - INTERVAL ' . (int) $minutes . ' MINUTE)
              ORDER BY created_at ASC
              LIMIT ' . (int) $limit,
            [
                'pending' => StatusMapper::PENDING,
                'processing' => StatusMapper::PROCESSING,
            ],
        );
    }

    public function find(string $depositId): ?array
    {
        return Db::selectOne('SELECT * FROM contributions WHERE id = :id', ['id' => $depositId]);
    }

    private function markFailure(string $depositId, string $status, string $code, string $message): void
    {
        Db::execute(
            'UPDATE contributions
                SET status = :status,
                    failure_code = :code,
                    failure_message = :message,
                    completed_at = CASE WHEN :is_final = 1 THEN NOW() ELSE completed_at END,
                    updated_at = NOW()
              WHERE id = :id',
            [
                'status' => $status,
                'code' => $code,
                'message' => mb_substr($message, 0, 255),
                'is_final' => (int) StatusMapper::isFinal($status),
                'id' => $depositId,
            ],
        );
    }

    /**
     * Libellé affiché au payeur au moment de la saisie du PIN.
     *
     * pawaPay impose 4 à 22 caractères, lettres, chiffres et espaces
     * uniquement (champ customerMessage de POST /v2/deposits). Un libellé
     * parlant améliore nettement le taux d'autorisation : le payeur reconnaît
     * ce qu'il paie au lieu de voir un nom de marchand qui ne lui dit rien.
     *
     * ⚠ Ce champ s'AJOUTE au nom du compte marchand, il ne le remplace pas.
     * Le « KERRY PAY MERE » qui s'affiche vient du nom enregistré chez
     * pawaPay et ne se change que dans le tableau de bord, pas par l'API.
     * Selon l'opérateur, le message peut par ailleurs être tronqué, voire
     * ignoré : il ne faut donc jamais y faire porter une information
     * indispensable.
     */
    public static function customerMessage(string $campaignTitle): string
    {
        $label = Env::get('PAYMENT_LABEL', 'TRU GROUP') ?? 'TRU GROUP';

        // Le libellé de l'entreprise passe en premier : c'est lui que le
        // payeur doit reconnaître. Le titre de la collecte complète la ligne
        // s'il reste de la place dans les 22 caractères, sans jamais amputer
        // le libellé — un « TRU GRO Anniversaire » ne rassurerait personne.
        $court = Text::customerMessage($label, $label);
        $avecCollecte = Text::customerMessage($label . ' ' . $campaignTitle, $court);

        return str_starts_with(mb_strtolower($avecCollecte), mb_strtolower($court))
            ? $avecCollecte
            : $court;
    }
}
