<?php

use Sungku\Http\View;

/** @var string|null $erreur */
?>
<div class="wrap" style="padding-top:32px;padding-bottom:80px">
  <h1 style="font-size:26px;margin:0 0 24px">Nouvelle collecte</h1>

  <?php if (!empty($erreur)): ?>
    <div class="avis erreur" style="max-width:640px"><?= View::e($erreur) ?></div>
  <?php endif; ?>

  <form method="post" action="/creer" id="formulaire"
        style="display:grid;grid-template-columns:1.1fr 0.9fr;gap:40px" id="grille-creation">
    <div>
      <div class="champ">
        <label for="title">Titre de la collecte</label>
        <input type="text" id="title" name="title" required maxlength="120"
               placeholder="Anniversaire de Sarah" oninput="majApercu()">
      </div>

      <div class="champ" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div>
          <label for="category">Catégorie</label>
          <select id="category" name="category">
            <option value="EDUCATION">Éducation</option>
            <option value="SANTE">Santé</option>
            <option value="FUNERAILLES">Funérailles</option>
            <option value="PROJET_COMMUNAUTAIRE">Projet communautaire</option>
            <option value="ENTREPRISE">Entreprise</option>
            <option value="TONTINE">Tontine</option>
            <option value="AUTRE" selected>Événement personnel</option>
          </select>
        </div>
        <div>
          <label for="goalAmount">Objectif (FCFA)</label>
          <input type="number" id="goalAmount" name="goalAmount" required
                 min="1000" step="1000" value="500000" oninput="majApercu()">
        </div>
      </div>

      <div class="champ">
        <label for="description">Description</label>
        <textarea id="description" name="description" rows="4"
                  placeholder="Expliquez à quoi serviront les fonds."></textarea>
      </div>

      <div class="champ">
        <label>Méthodes de paiement acceptées</label>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <span class="pilule active">Orange Money</span>
          <span class="pilule active">MTN Mobile Money</span>
          <span class="pilule">Carte bancaire — bientôt</span>
        </div>
        <div class="aide">
          Santé et funérailles passent par une validation avant publication.
        </div>
      </div>

      <button class="btn bloc" type="submit" style="margin-top:8px">Publier la collecte</button>
    </div>

    <div>
      <div style="font-size:13px;color:var(--ink-dim);margin-bottom:12px">Aperçu de la page publique</div>
      <div class="carte" style="padding:0;overflow:hidden">
        <div style="height:150px;background:linear-gradient(135deg,var(--violet-soft),var(--surface-2));
                    display:flex;align-items:center;justify-content:center">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="var(--violet)" opacity=".5">
            <circle cx="9" cy="10" r="6"/><circle cx="15" cy="15" r="6" opacity=".6"/>
          </svg>
        </div>
        <div style="padding:20px">
          <div class="serif" style="font-size:19px;margin-bottom:4px" id="apercu-titre">Votre collecte</div>
          <div style="font-size:13px;color:var(--ink-dim);margin-bottom:14px">Organisé par vous</div>
          <div class="jauge"><div style="width:0%"></div></div>
          <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-dim)">
            <span>0 FCFA collectés</span>
            <span id="apercu-objectif">Objectif 500 000 FCFA</span>
          </div>
        </div>
      </div>
    </div>
  </form>
</div>

<style>
@media(max-width:860px){ #formulaire{grid-template-columns:1fr} }
</style>

<script>
// Aperçu vivant : voir la page publique se former lève l'hésitation devant un
// formulaire dont on ne sait pas ce qu'il produira.
function majApercu() {
  const titre = document.getElementById('title').value.trim();
  const objectif = Number(document.getElementById('goalAmount').value || 0);
  document.getElementById('apercu-titre').textContent = titre || 'Votre collecte';
  document.getElementById('apercu-objectif').textContent =
    'Objectif ' + objectif.toLocaleString('fr-FR').replace(/ | /g, ' ') + ' FCFA';
}
</script>
