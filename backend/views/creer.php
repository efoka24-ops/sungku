<?php

use Sungku\Http\View;

/** @var string|null $erreur */
?>
<section style="max-width:560px;margin:40px auto">
  <h1 style="font-size:24px;margin:0 0 6px">Créer une cagnotte</h1>
  <p class="aide" style="margin:0 0 18px">
    Vous obtiendrez un lien à partager. Les contributions arrivent par mobile money.
  </p>

  <?php if (!empty($erreur)): ?>
    <div class="avis erreur"><?= View::e($erreur) ?></div>
  <?php endif; ?>

  <form method="post" action="/creer" class="panneau">
    <label for="title">Titre</label>
    <input type="text" id="title" name="title" required maxlength="120"
           placeholder="Frais de scolarité de Nadège">

    <label for="goalAmount">Objectif (FCFA)</label>
    <input type="number" id="goalAmount" name="goalAmount" required min="1000" step="1000" value="100000">

    <label for="category">Catégorie</label>
    <select id="category" name="category">
      <option value="EDUCATION">Éducation</option>
      <option value="SANTE">Santé</option>
      <option value="FUNERAILLES">Funérailles</option>
      <option value="PROJET_COMMUNAUTAIRE">Projet communautaire</option>
      <option value="ENTREPRISE">Entreprise</option>
      <option value="TONTINE">Tontine</option>
      <option value="AUTRE" selected>Autre</option>
    </select>
    <div class="aide">
      Santé et funérailles passent par une validation avant publication.
    </div>

    <label for="description">Description</label>
    <textarea id="description" name="description" rows="5"
              placeholder="Expliquez à quoi serviront les fonds."></textarea>

    <div style="margin-top:20px">
      <button class="btn" type="submit">Créer la cagnotte</button>
    </div>
  </form>
</section>
