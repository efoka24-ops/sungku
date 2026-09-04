<?php

use Sungku\Http\Csrf;
use Sungku\Http\View;

/** @var array<int, array> $campaigns */
?>
<h1 style="font-size:28px;margin:0 0 8px">Collectes</h1>
<p style="font-size:14px;color:var(--ink-dim);margin:0 0 28px">
  Les collectes en attente de modération apparaissent en tête. Tant qu’elles ne
  sont pas publiées, elles restent invisibles sur le site.
</p>

<div class="table">
  <div class="entete" style="grid-template-columns:2.2fr 1.6fr 1.1fr 1fr 1.4fr">
    <span>Collecte</span><span>Organisateur</span><span>Collecté</span><span>État</span><span>Actions</span>
  </div>

  <?php if ($campaigns === []): ?>
    <div class="vide">Aucune collecte.</div>
  <?php else: ?>
    <?php foreach ($campaigns as $c): ?>
      <div class="ligne" style="grid-template-columns:2.2fr 1.6fr 1.1fr 1fr 1.4fr">
        <span>
          <a href="/c/<?= View::e($c['slug']) ?>"><?= View::e($c['title']) ?></a>
          <div style="color:var(--ink-dim);font-size:12px;margin-top:4px">
            <?= View::e($c['category']) ?> ·
            objectif <?= View::fcfa((int) $c['goal_amount']) ?>
          </div>
        </span>
        <span style="color:var(--ink-dim);font-size:13px;word-break:break-all"><?= View::e($c['organizer_email']) ?></span>
        <span style="font-weight:600"><?= View::fcfa((int) $c['collected']) ?></span>
        <span>
          <?php if ($c['moderation_status'] === 'PENDING'): ?>
            <span class="badge attente">À modérer</span>
          <?php elseif ($c['moderation_status'] === 'REJECTED'): ?>
            <span class="badge echec">Refusée</span>
          <?php else: ?>
            <span class="badge confirme">Publiée</span>
          <?php endif; ?>
        </span>
        <span style="display:flex;gap:8px;flex-wrap:wrap">
          <?php if ($c['moderation_status'] !== 'APPROVED'): ?>
            <form method="post" action="/admin/moderation" style="margin:0">
              <?= Csrf::field() ?>
              <input type="hidden" name="id" value="<?= (int) $c['id'] ?>">
              <input type="hidden" name="decision" value="APPROVED">
              <button class="btn" type="submit" style="padding:6px 12px;font-size:13px">Publier</button>
            </form>
          <?php endif; ?>
          <?php if ($c['moderation_status'] !== 'REJECTED'): ?>
            <form method="post" action="/admin/moderation" style="margin:0">
              <?= Csrf::field() ?>
              <input type="hidden" name="id" value="<?= (int) $c['id'] ?>">
              <input type="hidden" name="decision" value="REJECTED">
              <button class="btn fantome" type="submit" style="padding:6px 12px;font-size:13px">Refuser</button>
            </form>
          <?php endif; ?>
        </span>
      </div>
    <?php endforeach; ?>
  <?php endif; ?>
</div>
