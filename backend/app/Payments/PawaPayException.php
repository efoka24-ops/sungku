<?php

declare(strict_types=1);

namespace Sungku\Payments;

use RuntimeException;

final class PawaPayException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $failureCode = 'UNKNOWN_ERROR',
        public readonly int $httpStatus = 0,
    ) {
        parent::__construct($message);
    }

    /**
     * Le silence réseau et les erreurs serveur n'autorisent aucune conclusion
     * sur le sort de l'argent : la demande a pu aboutir sans que la réponse
     * nous parvienne. Ces cas laissent la contribution en attente, jamais en
     * échec.
     */
    public function isIndeterminate(): bool
    {
        return in_array($this->failureCode, ['NETWORK_ERROR', 'INVALID_RESPONSE', 'UNKNOWN_ERROR'], true)
            || $this->httpStatus >= 500;
    }
}
