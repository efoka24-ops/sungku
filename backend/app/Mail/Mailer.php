<?php

declare(strict_types=1);

namespace Sungku\Mail;

use RuntimeException;
use Sungku\Core\Env;
use Sungku\Core\Logger;

/**
 * Client SMTP authentifié, écrit sur des sockets bruts.
 *
 * Pourquoi pas mail() : sur mutualisé, mail() part avec l'identité de
 * l'utilisateur système et sans authentification. Les messages atterrissent en
 * indésirable, quand ils ne sont pas rejetés — inacceptable pour un reçu de
 * paiement. Passer par le compte noreply@ authentifié aligne l'expéditeur sur
 * le domaine et respecte SPF.
 *
 * Pourquoi pas PHPMailer : pas de Composer sur ce socle (déploiement FTP).
 */
final class Mailer
{
    private const CRLF = "\r\n";

    public function __construct(
        private readonly string $host = '',
        private readonly int $port = 0,
        private readonly string $username = '',
        private readonly string $password = '',
        private readonly string $encryption = '',
    ) {
    }

    public static function fromEnv(): self
    {
        return new self(
            host: Env::get('MAIL_HOST', '') ?? '',
            port: (int) (Env::get('MAIL_PORT', '587') ?? '587'),
            username: Env::get('MAIL_USER', '') ?? '',
            password: Env::get('MAIL_PASSWORD', '') ?? '',
            encryption: strtolower(Env::get('MAIL_ENCRYPTION', 'tls') ?? 'tls'),
        );
    }

    public function isConfigured(): bool
    {
        return $this->host !== '' && $this->username !== '';
    }

    /**
     * Envoie un message HTML. Ne lève jamais : un serveur de messagerie
     * indisponible ne doit pas faire échouer un encaissement déjà abouti.
     */
    public function send(string $to, string $subject, string $htmlBody): bool
    {
        if (!$this->isConfigured()) {
            Logger::write('mail', 'Envoi ignoré : SMTP non configuré', ['to' => $to]);

            return false;
        }

        try {
            $this->deliver($to, $subject, $htmlBody);
            Logger::write('mail', 'Message envoyé', ['to' => $to, 'subject' => $subject]);

            return true;
        } catch (RuntimeException $e) {
            Logger::write('mail', 'Envoi en échec', ['to' => $to, 'erreur' => $e->getMessage()]);

            return false;
        }
    }

    private function deliver(string $to, string $subject, string $htmlBody): void
    {
        $fromAddress = Env::get('MAIL_FROM', $this->username) ?? $this->username;
        $fromName = Env::get('MAIL_FROM_NAME', 'Sungku') ?? 'Sungku';

        // smtps:// chiffre dès la connexion (port 465) ; sinon on ouvre en
        // clair puis on bascule par STARTTLS (port 587).
        $scheme = $this->encryption === 'ssl' ? 'ssl://' : '';
        $socket = @stream_socket_client(
            $scheme . $this->host . ':' . $this->port,
            $errno,
            $errstr,
            15,
            STREAM_CLIENT_CONNECT,
        );

        if ($socket === false) {
            throw new RuntimeException("Connexion SMTP impossible : {$errstr} ({$errno})");
        }

        stream_set_timeout($socket, 15);

        try {
            $this->expect($socket, 220);

            $hostname = (string) (parse_url((string) Env::get('APP_URL', 'sungku.trugroup.cm'), PHP_URL_HOST)
                ?: 'sungku.trugroup.cm');

            $this->command($socket, "EHLO {$hostname}", 250);

            if ($this->encryption === 'tls') {
                $this->command($socket, 'STARTTLS', 220);

                if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new RuntimeException('Bascule STARTTLS refusée.');
                }

                // Après STARTTLS, la session repart de zéro : il faut se
                // représenter, sinon le serveur ignore les capacités annoncées.
                $this->command($socket, "EHLO {$hostname}", 250);
            }

            $this->command($socket, 'AUTH LOGIN', 334);
            $this->command($socket, base64_encode($this->username), 334);
            $this->command($socket, base64_encode($this->password), 235);

            $this->command($socket, "MAIL FROM:<{$fromAddress}>", 250);
            $this->command($socket, "RCPT TO:<{$to}>", 250);
            $this->command($socket, 'DATA', 354);

            fwrite($socket, $this->message($to, $subject, $htmlBody, $fromAddress, $fromName));
            $this->expect($socket, 250);

            $this->command($socket, 'QUIT', 221);
        } finally {
            fclose($socket);
        }
    }

    private function message(
        string $to,
        string $subject,
        string $htmlBody,
        string $fromAddress,
        string $fromName,
    ): string {
        // Sujet encodé en base64 : les accents passeraient mal en brut, et un
        // « Reçu de contribution » illisible fait fuir le destinataire.
        $headers = [
            'From: =?UTF-8?B?' . base64_encode($fromName) . "?= <{$fromAddress}>",
            "To: <{$to}>",
            'Subject: =?UTF-8?B?' . base64_encode($subject) . '?=',
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
            'Date: ' . date(DATE_RFC2822),
            'Message-ID: <' . bin2hex(random_bytes(12)) . '@sungku.trugroup.cm>',
        ];

        return implode(self::CRLF, $headers)
            . self::CRLF . self::CRLF
            . chunk_split(base64_encode($htmlBody), 76, self::CRLF)
            . self::CRLF . '.' . self::CRLF;
    }

    /** @param resource $socket */
    private function command($socket, string $command, int $expected): void
    {
        fwrite($socket, $command . self::CRLF);
        $this->expect($socket, $expected);
    }

    /** @param resource $socket */
    private function expect($socket, int $expected): string
    {
        $response = '';

        // Une réponse SMTP peut tenir sur plusieurs lignes : seule celle dont
        // le code est suivi d'une espace clôt le bloc.
        while (($line = fgets($socket, 515)) !== false) {
            $response .= $line;
            if (strlen($line) < 4 || $line[3] !== '-') {
                break;
            }
        }

        $code = (int) substr(trim($response), 0, 3);
        if ($code !== $expected) {
            throw new RuntimeException("Réponse SMTP {$code}, attendu {$expected} : " . trim($response));
        }

        return $response;
    }
}
