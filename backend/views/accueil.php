<?php

use Sungku\Http\View;

/** @var array<int, array> $campaigns */
?>
<section class="hero">
  <h1>Collectez ensemble, par mobile money</h1>
  <p>
    Créez une cagnotte, partagez le lien, recevez les contributions par MTN MoMo
    ou Orange Money. Chaque contribution est confirmée par l'opérateur avant
    d'apparaître sur la page.
  </p>
  <a class="btn" href="/creer">Créer une cagnotte</a>
</section>

<h2 class="section">Cagnottes en cours</h2>

<?php if ($campaigns === []): ?>
  <div class="panneau">
    <p style="margin:0">Aucune cagnotte pour le moment. Soyez le premier à en ouvrir une.</p>
  </div>
<?php else: ?>
  <div class="grille">
    <?php foreach ($campaigns as $c):
        $collected = (int) $c['collected'];
        $goal = (int) $c['goal_amount'];
    ?>
      <a class="carte" href="/c/<?= View::e($c['slug']) ?>">
        <span class="categorie"><?= View::e($c['category']) ?></span>
        <h3><?= View::e($c['title']) ?></h3>
        <div class="jauge"><div style="width:<?= View::percent($collected, $goal) ?>%"></div></div>
        <div class="chiffres">
          <span><strong><?= View::fcfa($collected) ?></strong> collectés</span>
          <span>sur <?= View::fcfa($goal) ?></span>
        </div>
      </a>
    <?php endforeach; ?>
  </div>
<?php endif; ?>
