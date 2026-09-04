<?php

declare(strict_types=1);

namespace Sungku\Http\Controllers;

use Sungku\Core\Db;
use Sungku\Core\Logger;
use Sungku\Core\Request;
use Sungku\Core\Response;
use Sungku\Payments\DepositService;
use Sungku\Support\Uuid;

/**
 * Callback pawaPay.
 *
 * Le contenu du corps n'est JAMAIS cru sur parole : il sert uniquement de
 * signal « ce dépôt a bougé, va vérifier ». L'état réel est ensuite lu par
 * GET /v2/deposits/{id}. Conséquence : un callback falsifié, rejoué ou arrivé
 * dans le désordre ne peut pas corrompre un statut, et la signature HTTP
 * (optionnelle chez pawaPay, ECDSA P-256 / RFC 9421) devient un durcissement
 * souhaitable plutôt qu'un prérequis à la mise en production.
 */
final class WebhookController
{
    public function __construct(
        private readonly DepositService $deposits = new DepositService(),
    ) {
    }

    public function pawapay(Request $request): void
    {
        $payload = $request->body;
        $depositId = (string) ($payload['depositId'] ?? $payload['data']['depositId'] ?? '');

        // Toujours acquitter en 200, même sur un dépôt inconnu : toute autre
        // réponse déclenche des réessais qui n'aboutiront jamais.
        if (!Uuid::isValid($depositId)) {
            Logger::payment('Callback sans depositId exploitable', ['ip' => $request->ip()]);
            Response::json(['received' => true, 'matched' => false]);

            return;
        }

        $this->archive($depositId, $request->rawBody);

        $contribution = $this->deposits->refresh($depositId);

        Logger::payment('Callback traité', [
            'depositId' => $depositId,
            'matched' => $contribution !== null,
            'status' => $contribution['status'] ?? null,
        ]);

        Response::json(['received' => true, 'matched' => $contribution !== null]);
    }

    /**
     * Trace brute de chaque callback. En cas de litige sur un encaissement,
     * c'est la seule pièce qui dit ce que pawaPay a réellement annoncé, et
     * quand.
     */
    private function archive(string $depositId, string $rawBody): void
    {
        Db::execute(
            'INSERT INTO payment_events (deposit_id, source, payload, received_at)
             VALUES (:deposit_id, :source, :payload, NOW())',
            [
                'deposit_id' => $depositId,
                'source' => 'CALLBACK',
                'payload' => mb_substr($rawBody, 0, 8000),
            ],
        );
    }
}
