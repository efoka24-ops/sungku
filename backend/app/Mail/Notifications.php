<?php

declare(strict_types=1);

namespace Sungku\Mail;

use Sungku\Core\Db;
use Sungku\Core\Env;

/**
 * Messages transactionnels.
 *
 * Aucune méthode ne lève : un incident de messagerie ne doit jamais remonter
 * jusqu'à faire échouer un paiement déjà encaissé.
 */
final class Notifications
{
    public function __construct(
        private readonly Mailer $mailer = new Mailer(),
    ) {
    }

    public static function make(): self
    {
        return new self(Mailer::fromEnv());
    }

    /**
     * Reçu au contributeur et alerte à l'organisateur, sur contribution
     * confirmée.
     *
     * @param array<string, mixed> $contribution
     */
    public function contributionConfirmed(array $contribution): void
    {
        $campaign = Db::selectOne(
            'SELECT c.title, c.slug, c.goal_amount, u.email AS organizer_email, u.full_name AS organizer_name
               FROM campaigns c
               JOIN users u ON u.id = c.organizer_id
              WHERE c.id = :id',
            ['id' => $contribution['campaign_id']],
        );

        if ($campaign === null) {
            return;
        }

        $amount = self::formatAmount((int) $contribution['amount']);
        $title = (string) $campaign['title'];
        $url = rtrim(Env::get('APP_URL', 'https://sungku.trugroup.cm') ?? '', '/')
            . '/c/' . $campaign['slug'];

        // Le reçu n'est envoyé que si le contributeur a laissé une adresse :
        // elle est facultative, une contribution par mobile money n'en exige
        // aucune.
        $contributorEmail = (string) ($contribution['contributor_email'] ?? '');
        if ($contributorEmail !== '' && filter_var($contributorEmail, FILTER_VALIDATE_EMAIL)) {
            $this->mailer->send(
                $contributorEmail,
                "Reçu de votre contribution — {$title}",
                self::layout(
                    'Merci pour votre contribution',
                    "<p>Votre contribution de <strong>{$amount}</strong> à la cagnotte "
                    . '<strong>' . self::escape($title) . '</strong> a bien été encaissée.</p>'
                    . '<p>Référence : <code>' . self::escape((string) $contribution['id']) . '</code><br>'
                    . 'Conservez-la : c\'est elle qui identifie votre paiement en cas de question.</p>'
                    . '<p><a href="' . self::escape($url) . '">Voir la cagnotte</a></p>',
                ),
            );
        }

        $contributor = $contribution['is_anonymous']
            ? 'Un contributeur anonyme'
            : self::escape((string) ($contribution['contributor_name'] ?: 'Un contributeur'));

        $collected = Db::selectOne(
            'SELECT COALESCE(SUM(amount), 0) AS total FROM contributions
              WHERE campaign_id = :id AND status = :confirmed',
            ['id' => $contribution['campaign_id'], 'confirmed' => 'CONFIRMED'],
        );

        $total = self::formatAmount((int) ($collected['total'] ?? 0));
        $goal = self::formatAmount((int) $campaign['goal_amount']);

        $this->mailer->send(
            (string) $campaign['organizer_email'],
            "Nouvelle contribution de {$amount} — {$title}",
            self::layout(
                'Nouvelle contribution',
                "<p>{$contributor} vient de contribuer <strong>{$amount}</strong> à votre cagnotte "
                . '<strong>' . self::escape($title) . '</strong>.</p>'
                . "<p>Total collecté : <strong>{$total}</strong> sur un objectif de {$goal}.</p>"
                . '<p><a href="' . self::escape($url) . '">Ouvrir la cagnotte</a></p>',
            ),
        );
    }

    /** Alerte à l'exploitant : une transaction n'a pas pu être tranchée. */
    public function needsAttention(array $contribution): void
    {
        $to = Env::get('ADMIN_ALERT_EMAIL', '');
        if ($to === null || $to === '') {
            return;
        }

        $this->mailer->send(
            $to,
            'Contribution à vérifier manuellement',
            self::layout(
                'Transaction à l’issue indéterminée',
                '<p>La contribution <code>' . self::escape((string) $contribution['id']) . '</code> ('
                . self::formatAmount((int) $contribution['amount'])
                . ') n’a pas pu être tranchée automatiquement.</p>'
                . '<p><strong>Ne pas la considérer comme échouée :</strong> les fonds ont peut-être été '
                . 'débités. Vérifier son statut dans le tableau de bord pawaPay avant toute action.</p>',
            ),
        );
    }

    private static function layout(string $heading, string $content): string
    {
        return '<!doctype html><html lang="fr"><body style="margin:0;padding:24px;'
            . 'background:#f5f5f4;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1c1917">'
            . '<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">'
            . '<h1 style="margin:0 0 16px;font-size:20px">' . $heading . '</h1>'
            . '<div style="font-size:15px;line-height:1.6">' . $content . '</div>'
            . '<hr style="border:0;border-top:1px solid #e7e5e4;margin:24px 0">'
            . '<p style="font-size:13px;color:#78716c;margin:0">Sungku — message automatique, '
            . 'merci de ne pas y répondre.</p>'
            . '</div></body></html>';
    }

    private static function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    }

    private static function formatAmount(int $amount): string
    {
        return number_format($amount, 0, ',', ' ') . ' FCFA';
    }
}
