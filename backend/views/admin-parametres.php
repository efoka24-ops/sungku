<?php

use Sungku\Core\Settings;
use Sungku\Http\Csrf;
use Sungku\Http\View;

/** @var array<string, float> $fees */
/** @var array<string, string> $categories */
/** @var string|null $message */
?>
<h1 style="font-size:28px;margin:0 0 8px">Commissions</h1>
<p style="font-size:14px;color:var(--ink-dim);margin:0 0 28px">
  Taux prélevé sur les sommes collectées, par catégorie. Il est affiché dans
  les conditions générales que l’organisateur accepte à la création.
</p>

<?php if (!empty($message)): ?>
  <div class="avis succes"><?= View::e($message) ?></div>
<?php endif; ?>

<div class="avis alerte">
  Une modification ne s’applique qu’aux collectes créées ensuite. Celles déjà
  ouvertes conservent le taux qu’elles ont accepté — changer rétroactivement
  les conditions d’un contrat déjà signé n’aurait aucune valeur.
</div>

<form method="post" action="/admin/parametres" class="carte" style="max-width:560px">
  <?= Csrf::field() ?>

  <?php foreach ($categories as $code => $libelle): ?>
    <div class="champ" style="display:grid;grid-template-columns:1fr 120px;gap:16px;align-items:center">
      <label for="fee_<?= $code ?>" style="margin:0"><?= $libelle ?></label>
      <div style="display:flex;align-items:center;gap:8px">
        <input type="number" id="fee_<?= $code ?>" name="fee_<?= $code ?>"
               value="<?= number_format((float) ($fees[$code] ?? 0), 2, '.', '') ?>"
               min="0" max="20" step="0.1" style="text-align:right">
        <span style="color:var(--ink-dim)">%</span>
      </div>
    </div>
  <?php endforeach; ?>

  <div class="aide" style="margin-bottom:16px">
    Bornes : 0 à 20 %. Version des conditions en vigueur :
    <?= Settings::TERMS_VERSION ?>.
  </div>

  <button class="btn bloc" type="submit">Enregistrer la grille</button>
</form>
