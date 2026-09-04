<?php

use Sungku\Http\Csrf;
use Sungku\Http\View;

/** @var array $campaign */
/** @var array<string, string> $categories */
/** @var array $balance */
?>
<h1 style="font-size:28px;margin:0 0 8px">Modifier la collecte</h1>
<p style="font-size:14px;color:var(--ink-dim);margin:0 0 28px">
  <a href="/c/<?= View::e($campaign['slug']) ?>">Voir la page publique</a>
</p>

<div class="stats" style="max-width:760px">
  <div class="stat">
    <div class="libelle">Collecté</div>
    <div class="valeur"><?= View::fcfa((int) $balance['gross']) ?></div>
  </div>
  <div class="stat">
    <div class="libelle">Commission</div>
    <div class="valeur"><?= View::fcfa((int) $balance['fee']) ?></div>
  </div>
  <div class="stat">
    <div class="libelle">Disponible</div>
    <div class="valeur" style="color:var(--violet)"><?= View::fcfa((int) $balance['available']) ?></div>
  </div>
</div>

<form method="post" action="/admin/collectes/modifier" class="carte" style="max-width:640px">
  <?= Csrf::field() ?>
  <input type="hidden" name="id" value="<?= (int) $campaign['id'] ?>">

  <div class="champ">
    <label for="title">Titre</label>
    <input type="text" id="title" name="title" required maxlength="120"
           value="<?= View::e($campaign['title']) ?>">
  </div>

  <div class="champ" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <div>
      <label for="category">Catégorie</label>
      <select id="category" name="category">
        <?php foreach ($categories as $code => $libelle): ?>
          <option value="<?= $code ?>" <?= $campaign['category'] === $code ? 'selected' : '' ?>><?= $libelle ?></option>
        <?php endforeach; ?>
      </select>
    </div>
    <div>
      <label for="goalAmount">Objectif (FCFA)</label>
      <input type="number" id="goalAmount" name="goalAmount" min="1000" step="1000"
             value="<?= (int) $campaign['goal_amount'] ?>">
    </div>
  </div>

  <div class="champ">
    <label for="description">Description</label>
    <textarea id="description" name="description" rows="4"><?= View::e($campaign['description']) ?></textarea>
  </div>

  <div class="champ" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <div>
      <label for="payoutPhone">Numéro de reversement</label>
      <input type="tel" id="payoutPhone" name="payoutPhone" value="<?= View::e($campaign['payout_phone']) ?>">
    </div>
    <div>
      <label for="status">État</label>
      <select id="status" name="status">
        <option value="ACTIVE" <?= $campaign['status'] === 'ACTIVE' ? 'selected' : '' ?>>Ouverte</option>
        <option value="CLOSED" <?= $campaign['status'] !== 'ACTIVE' ? 'selected' : '' ?>>Fermée</option>
      </select>
    </div>
  </div>

  <div class="champ">
    <label for="fee_rate">Taux de commission (%)</label>
    <input type="number" id="fee_rate" name="fee_rate" min="0" max="20" step="0.1"
           value="<?= number_format((float) $campaign['fee_rate'], 2, '.', '') ?>">
    <div class="aide">
      Ce taux a été accepté par l’organisateur le
      <?= $campaign['terms_accepted_at'] ? date('d/m/Y', strtotime((string) $campaign['terms_accepted_at'])) : '—' ?>
      (conditions <?= View::e($campaign['terms_version'] ?: '—') ?>).
      Le modifier change une clause déjà signée : l’action est tracée au nom de
      l’administrateur qui la fait, et devrait rester exceptionnelle.
    </div>
  </div>

  <button class="btn bloc" type="submit">Enregistrer</button>
</form>
