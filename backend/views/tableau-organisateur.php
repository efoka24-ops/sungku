<?php

use Sungku\Http\View;

/** @var array<int, array> $campaigns */
/** @var array $totaux */
?>
<h1 style="font-size:28px;margin:0 0 28px">Mes collectes</h1>

<div class="stats">
  <div class="stat">
    <div class="libelle">Total collecté</div>
    <div class="valeur"><?= View::fcfa((int) $totaux['collecte']) ?></div>
  </div>
  <div class="stat">
    <div class="libelle">En attente de validation</div>
    <div class="valeur"><?= View::fcfa((int) $totaux['attente']) ?></div>
  </div>
  <div class="stat">
    <div class="libelle">Contributions confirmées</div>
    <div class="valeur"><?= (int) $totaux['confirmees'] ?></div>
  </div>
  <div class="stat">
    <div class="libelle">Collectes ouvertes</div>
    <div class="valeur"><?= count($campaigns) ?></div>
  </div>
</div>

<div class="stats">
  <div class="stat">
    <div class="libelle">Solde reversable</div>
    <div class="valeur" style="color:var(--violet)"><?= View::fcfa((int) $solde['disponible']) ?></div>
  </div>
  <div class="stat">
    <div class="libelle">Commissions retenues</div>
    <div class="valeur"><?= View::fcfa((int) $solde['commission']) ?></div>
  </div>
  <div class="stat">
    <div class="libelle">Déjà reversé</div>
    <div class="valeur"><?= View::fcfa((int) $solde['reverse']) ?></div>
  </div>
  <div class="stat">
    <div class="libelle">Reversement en cours</div>
    <div class="valeur" style="<?= (int) $solde['en_cours'] > 0 ? 'color:var(--warning)' : '' ?>">
      <?= View::fcfa((int) $solde['en_cours']) ?>
    </div>
  </div>
</div>

<p style="color:var(--ink-dim);font-size:13px;margin:-16px 0 28px">
  Le solde reversable est le montant confirmé, moins ce qui vous a déjà été
  envoyé. La commission est retenue au moment du reversement, au taux que vous
  avez accepté à la création de chaque collecte.
</p>

<div class="table">
  <div class="entete" style="grid-template-columns:2.2fr 1.2fr 1.2fr 1fr 1fr">
    <span>Collecte</span><span>Collecté</span><span>Objectif</span><span>État</span><span></span>
  </div>

  <?php if ($campaigns === []): ?>
    <div class="vide">
      Aucune collecte pour l’instant. <a href="/creer">Créez la première</a>.
    </div>
  <?php else: ?>
    <?php foreach ($campaigns as $c):
        $collected = (int) $c['collected'];
        $goal = (int) $c['goal_amount'];
    ?>
      <div class="ligne" style="grid-template-columns:2.2fr 1.2fr 1.2fr 1fr 1fr">
        <span>
          <a href="/c/<?= View::e($c['slug']) ?>"><?= View::e($c['title']) ?></a>
          <div style="color:var(--ink-dim);font-size:12px;margin-top:4px">
            <?= View::e($c['category']) ?> · <?= (int) $c['contributors'] ?> contributeur(s)
          </div>
        </span>
        <span style="font-weight:600"><?= View::fcfa($collected) ?></span>
        <span style="color:var(--ink-dim)">
          <?= View::fcfa($goal) ?>
          <div class="jauge" style="margin-top:6px"><div style="width:<?= View::percent($collected, $goal) ?>%"></div></div>
        </span>
        <span>
          <?php if ($c['moderation_status'] === 'PENDING'): ?>
            <span class="badge attente">En modération</span>
          <?php elseif ($c['status'] !== 'ACTIVE'): ?>
            <span class="badge neutre">Fermée</span>
          <?php else: ?>
            <span class="badge confirme">Publiée</span>
          <?php endif; ?>
        </span>
        <span><a href="/c/<?= View::e($c['slug']) ?>">Voir la page</a></span>
      </div>
    <?php endforeach; ?>
  <?php endif; ?>
</div>

<?php if ($campaigns !== []): ?>
  <p style="color:var(--ink-dim);font-size:13px">
    Le montant « en attente de validation » correspond aux contributions dont
    l’opérateur n’a pas encore confirmé le paiement. Il n’est pas encore acquis.
  </p>
<?php endif; ?>
