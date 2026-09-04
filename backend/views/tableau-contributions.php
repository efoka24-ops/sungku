<?php

use Sungku\Http\View;

/** @var array<int, array> $contributions */
/** @var string $titre */

/** Traduction d'un statut technique en libellé et pastille. */
$etat = static function (string $status): array {
    return match ($status) {
        'CONFIRMED' => ['Confirmée', 'confirme'],
        'FAILED' => ['Échouée', 'echec'],
        'NEEDS_ATTENTION' => ['À vérifier', 'attente'],
        'PROCESSING' => ['En cours', 'attente'],
        default => ['En attente', 'attente'],
    };
};
?>
<h1 style="font-size:28px;margin:0 0 28px"><?= View::e($titre) ?></h1>

<div class="table">
  <div class="entete" style="grid-template-columns:1.1fr 2fr 1.4fr 1fr 1fr">
    <span>Date</span><span>Collecte</span><span>Contributeur</span><span>Montant</span><span>Statut</span>
  </div>

  <?php if ($contributions === []): ?>
    <div class="vide">Aucune contribution pour l’instant.</div>
  <?php else: ?>
    <?php foreach ($contributions as $c):
        [$libelle, $classe] = $etat((string) $c['status']);
    ?>
      <div class="ligne" style="grid-template-columns:1.1fr 2fr 1.4fr 1fr 1fr">
        <span style="color:var(--ink-dim)"><?= date('d/m/Y H:i', strtotime((string) $c['created_at'])) ?></span>
        <span><a href="/c/<?= View::e($c['slug']) ?>"><?= View::e($c['title']) ?></a></span>
        <span>
          <?= $c['is_anonymous'] ? 'Anonyme' : View::e($c['contributor_name'] ?: '—') ?>
          <div style="color:var(--ink-dim);font-size:12px;margin-top:2px">
            <?= $c['provider'] === 'ORANGE_CMR' ? 'Orange Money' : 'MTN Mobile Money' ?>
          </div>
        </span>
        <span style="font-weight:600"><?= View::fcfa((int) $c['amount']) ?></span>
        <span>
          <span class="badge <?= $classe ?>"><?= $libelle ?></span>
          <?php if (!empty($c['failure_message'])): ?>
            <div style="color:var(--ink-dim);font-size:12px;margin-top:4px"><?= View::e($c['failure_message']) ?></div>
          <?php endif; ?>
        </span>
      </div>
    <?php endforeach; ?>
  <?php endif; ?>
</div>

<p style="color:var(--ink-dim);font-size:13px">
  « À vérifier » signale une transaction dont l’issue n’a pas pu être établie.
  Ce n’est pas un échec : les fonds ont peut-être été débités. Ne la traitez
  jamais comme une contribution perdue sans avoir vérifié.
</p>
