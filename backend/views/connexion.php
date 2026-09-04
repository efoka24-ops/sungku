<?php

use Sungku\Http\View;

/** @var string|null $erreur */
/** @var bool $httpsManquant */
?>
<div class="wrap" style="max-width:960px;padding-top:64px;padding-bottom:80px">
  <div style="text-align:center;margin-bottom:40px">
    <h1 style="font-size:34px;margin:0 0 10px">Votre espace Sungku</h1>
    <p style="color:var(--ink-dim);margin:0">Créez vos collectes et suivez les contributions.</p>
  </div>

  <?php if (!empty($erreur)): ?>
    <div class="avis erreur" style="max-width:640px;margin:0 auto 20px"><?= View::e($erreur) ?></div>
  <?php endif; ?>

  <?php if (!empty($httpsManquant)): ?>
    <div class="avis alerte" style="max-width:640px;margin:0 auto 20px">
      Le certificat HTTPS du domaine n’est pas encore actif. La connexion
      fonctionne, mais elle circule en clair : à réserver aux essais, jamais à
      une utilisation réelle.
    </div>
  <?php endif; ?>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px" id="grille-auth">
    <form method="post" action="/connexion" class="carte">
      <h2 style="font-size:20px;margin:0 0 20px">Connexion</h2>

      <div class="champ">
        <label for="email">Adresse e-mail</label>
        <input type="email" id="email" name="email" required autocomplete="email">
      </div>

      <div class="champ">
        <label for="password">Mot de passe</label>
        <input type="password" id="password" name="password" required autocomplete="current-password">
      </div>

      <button class="btn bloc" type="submit">Se connecter</button>
    </form>

    <form method="post" action="/inscription" class="carte">
      <h2 style="font-size:20px;margin:0 0 20px">Créer un compte</h2>

      <div class="champ">
        <label for="fullName">Nom complet</label>
        <input type="text" id="fullName" name="fullName" required>
      </div>

      <div class="champ">
        <label for="email2">Adresse e-mail</label>
        <input type="email" id="email2" name="email" required autocomplete="email">
      </div>

      <div class="champ">
        <label for="password2">Mot de passe</label>
        <input type="password" id="password2" name="password" required minlength="8"
               autocomplete="new-password">
        <div class="aide">8 caractères minimum.</div>
      </div>

      <button class="btn fantome bloc" type="submit">Créer mon compte</button>
    </form>
  </div>
</div>

<style>
@media(max-width:860px){ #grille-auth{grid-template-columns:1fr} }
</style>
