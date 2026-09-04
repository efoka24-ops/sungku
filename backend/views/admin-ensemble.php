<?php

use Sungku\Http\Csrf;
use Sungku\Http\View;

/** @var array $stats */
/** @var array $compteurs */
/** @var array<int, array> $aVerifier */
?>
<h1 style="font-size:28px;margin:0 0 8px">Vue d’ensemble</h1>
<p style="font-size:14px;color:var(--ink-dim);margin:0 0 28px">
  Encaissement mobile money · Cameroun
</p>

<div class="stats">
  <div class="stat">
    <div class="libelle">Total encaissé</div>
    <div class="valeur"><?= View::fcfa((int) $stats['collecte']) ?></div>
  </div>
  <div class="stat">
    <div class="libelle">Contributions confirmées</div>
    <div class="valeur"><?= (int) $stats['confirmees'] ?></div>
  </div>
  <div class="stat">
    <div class="libelle">En cours</div>
    <div class="valeur"><?= (int) $stats['en_cours'] ?></div>
  </div>
  <div class="stat">
    <div class="libelle">À vérifier</div>
    <div class="valeur" style="<?= (int) $stats['a_verifier'] > 0 ? 'color:var(--warning)' : '' ?>">
      <?= (int) $stats['a_verifier'] ?>
    </div>
  </div>
</div>

<div class="stats">
  <div class="stat">
    <div class="libelle">Utilisateurs</div>
    <div class="valeur"><?= (int) $compteurs['utilisateurs'] ?></div>
  </div>
  <div class="stat">
    <div class="libelle">Collectes</div>
    <div class="valeur"><?= (int) $compteurs['collectes'] ?></div>
  </div>
  <div class="stat">
    <div class="libelle">En attente de modération</div>
    <div class="valeur" style="<?= (int) $compteurs['a_moderer'] > 0 ? 'color:var(--warning)' : '' ?>">
      <?= (int) $compteurs['a_moderer'] ?>
    </div>
  </div>
</div>

<h2 style="font-size:20px;margin:0 0 6px">Transactions à vérifier</h2>
<p style="font-size:13px;color:var(--ink-dim);margin:0 0 16px">
  Issue indéterminée : le service n’a pas pu établir si les fonds ont bougé.
  <strong>Ne jamais les considérer comme échouées.</strong> « Revérifier »
  interroge à nouveau l’opérateur — c’est la seule source qui fasse foi.
</p>

<div class="table">
  <div class="entete" style="grid-template-columns:1.1fr 2fr 1fr 1.4fr 1fr">
    <span>Date</span><span>Collecte</span><span>Montant</span><span>Détail</span><span></span>
  </div>

  <?php if ($aVerifier === []): ?>
    <div class="vide">Aucune transaction en attente de vérification.</div>
  <?php else: ?>
    <?php foreach ($aVerifier as $c): ?>
      <div class="ligne" style="grid-template-columns:1.1fr 2fr 1fr 1.4fr 1fr">
        <span style="color:var(--ink-dim)"><?= date('d/m/Y H:i', strtotime((string) $c['created_at'])) ?></span>
        <span><?= View::e($c['title']) ?></span>
        <span style="font-weight:600"><?= View::fcfa((int) $c['amount']) ?></span>
        <span style="color:var(--ink-dim);font-size:13px">
          <?= View::e($c['failure_message'] ?: 'Aucun détail fourni par l’opérateur') ?>
        </span>
        <span>
          <form method="post" action="/admin/revalider" style="margin:0">
            <?= Csrf::field() ?>
            <input type="hidden" name="id" value="<?= View::e($c['id']) ?>">
            <button class="btn fantome" type="submit" style="padding:6px 12px;font-size:13px">Revérifier</button>
          </form>
        </span>
      </div>
    <?php endforeach; ?>
  <?php endif; ?>
</div>
