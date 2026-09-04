<?php

use Sungku\Http\Session;
use Sungku\Http\View;

/** @var string $content */
/** @var string $title */
?><!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0d0b14">
<title><?= View::e($title) ?></title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700&family=Marcellus&display=swap" rel="stylesheet">
<?php require __DIR__ . '/_styles.php'; ?>
</head>
<body>
<header class="site">
  <div class="inner">
    <a class="marque" href="/">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="var(--violet)"/>
        <circle cx="13" cy="13" r="6.5" fill="var(--violet-soft)"/>
        <circle cx="19" cy="19" r="6.5" fill="var(--violet-bright)"/>
      </svg>
      <span>Sungku</span>
    </a>
    <nav class="principal">
      <a href="/" class="actif">Accueil</a>
      <a href="/#cagnottes">Collectes</a>
    </nav>
    <div class="actions">
      <?php if (Session::userId() !== null): ?>
        <a class="btn fantome" href="/tableau-de-bord">Tableau de bord</a>
        <?php if (Session::has('ADMIN')): ?>
          <a class="btn fantome" href="/admin">Admin</a>
        <?php endif; ?>
        <a class="btn" href="/creer">Créer une collecte</a>
      <?php else: ?>
        <a class="btn fantome" href="/connexion">Connexion</a>
        <a class="btn" href="/connexion">Inscription</a>
      <?php endif; ?>
    </div>
  </div>
</header>

<main><?= $content ?></main>

<footer class="site">
  <div class="wrap">
    Sungku — paiements en ligne pour le Cameroun.
  </div>
</footer>
</body>
</html>
