<?php

use Sungku\Http\View;

/** @var string|null $erreur */
/** @var bool $httpsManquant */
?>
<section style="max-width:440px;margin:40px auto">
  <h1 style="font-size:24px;margin:0 0 6px">Connexion</h1>
  <p class="aide" style="margin:0 0 18px">Pour créer et suivre vos cagnottes.</p>

  <?php if (!empty($httpsManquant)): ?>
    <div class="avis alerte">
      Le certificat HTTPS du domaine n'est pas encore actif. La connexion restera
      impossible tant qu'il manque : le cookie de session n'est transmis que sur
      une liaison chiffrée, pour qu'il ne puisse pas être intercepté et rejoué.
    </div>
  <?php endif; ?>

  <?php if (!empty($erreur)): ?>
    <div class="avis erreur"><?= View::e($erreur) ?></div>
  <?php endif; ?>

  <form method="post" action="/connexion" class="panneau">
    <label for="email">Adresse e-mail</label>
    <input type="email" id="email" name="email" required autocomplete="email">

    <label for="password">Mot de passe</label>
    <input type="password" id="password" name="password" required autocomplete="current-password">

    <div style="margin-top:20px">
      <button class="btn" type="submit">Se connecter</button>
    </div>
  </form>

  <div class="panneau">
    <h2 style="font-size:17px;margin:0 0 10px">Pas encore de compte ?</h2>
    <form method="post" action="/inscription">
      <label for="fullName">Nom complet</label>
      <input type="text" id="fullName" name="fullName" required>

      <label for="email2">Adresse e-mail</label>
      <input type="email" id="email2" name="email" required autocomplete="email">

      <label for="password2">Mot de passe</label>
      <input type="password" id="password2" name="password" required minlength="8" autocomplete="new-password">
      <div class="aide">8 caractères minimum.</div>

      <div style="margin-top:20px">
        <button class="btn secondaire" type="submit">Créer mon compte</button>
      </div>
    </form>
  </div>
</section>
