<?php

declare(strict_types=1);

namespace Sungku\Http\Controllers;

use Sungku\Core\Db;
use Sungku\Core\Request;
use Sungku\Core\Response;
use Sungku\Http\Session;
use Sungku\Payments\StatusMapper;
use Sungku\Support\Text;

final class CampaignController
{
    /** Catégories dont la collecte touche à des sujets sensibles : modération a priori. */
    private const SENSITIVE = ['SANTE', 'FUNERAILLES'];

    public function index(Request $request): void
    {
        $campaigns = Db::select(
            'SELECT c.*,
                    COALESCE(SUM(ct.amount), 0) AS collected,
                    COUNT(ct.id) AS contributors
               FROM campaigns c
               LEFT JOIN contributions ct
                      ON ct.campaign_id = c.id AND ct.status = :confirmed
              WHERE c.status = :active AND c.moderation_status = :approved
              GROUP BY c.id
              ORDER BY c.created_at DESC
              LIMIT 100',
            [
                'confirmed' => StatusMapper::CONFIRMED,
                'active' => 'ACTIVE',
                'approved' => 'APPROVED',
            ],
        );

        Response::json($campaigns);
    }

    public function show(Request $request, array $params): void
    {
        $campaign = self::findBySlugOrId($params['slug']);
        if ($campaign === null) {
            Response::error('Campagne introuvable.', 404);

            return;
        }

        // Seules les contributions confirmées sont comptées : inclure les
        // contributions en attente afficherait une jauge qui redescend.
        $totals = Db::selectOne(
            'SELECT COALESCE(SUM(amount), 0) AS collected, COUNT(id) AS contributors
               FROM contributions WHERE campaign_id = :id AND status = :confirmed',
            ['id' => $campaign['id'], 'confirmed' => StatusMapper::CONFIRMED],
        );

        Response::json($campaign + [
            'collected' => (int) ($totals['collected'] ?? 0),
            'contributors' => (int) ($totals['contributors'] ?? 0),
        ]);
    }

    public function store(Request $request): void
    {
        $userId = Session::requireRole('ORGANIZER');

        $title = $request->string('title');
        $goal = $request->int('goalAmount');
        $category = strtoupper($request->string('category', 'AUTRE'));

        if ($title === '' || $goal <= 0) {
            Response::error('title et goalAmount (positif) sont requis.', 422);

            return;
        }

        $slug = self::makeSlug($title);

        Db::execute(
            'INSERT INTO campaigns
                (slug, title, description, category, goal_amount, currency, organizer_id,
                 status, moderation_status, ends_at, created_at, updated_at)
             VALUES
                (:slug, :title, :description, :category, :goal_amount, :currency, :organizer_id,
                 :status, :moderation_status, :ends_at, NOW(), NOW())',
            [
                'slug' => $slug,
                'title' => $title,
                'description' => $request->string('description') ?: null,
                'category' => $category,
                'goal_amount' => $goal,
                'currency' => 'XAF',
                'organizer_id' => $userId,
                'status' => 'ACTIVE',
                'moderation_status' => in_array($category, self::SENSITIVE, true) ? 'PENDING' : 'APPROVED',
                'ends_at' => $request->string('endsAt') ?: null,
            ],
        );

        Response::json(self::findBySlugOrId($slug), 201);
    }

    public static function findBySlugOrId(string $key): ?array
    {
        return Db::selectOne(
            'SELECT * FROM campaigns WHERE slug = :key OR id = :id LIMIT 1',
            ['key' => $key, 'id' => ctype_digit($key) ? (int) $key : 0],
        );
    }

    public static function makeSlug(string $title): string
    {
        // Suffixe aléatoire : deux « collecte-pour-maman » peuvent coexister
        // sans que la seconde création échoue sur la contrainte d'unicité.
        return Text::slug($title) . '-' . bin2hex(random_bytes(3));
    }
}
