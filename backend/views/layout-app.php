<?php

use Sungku\Http\Session;
use Sungku\Http\View;

/**
 * Gabarit des espaces connectés : menu latéral et zone de contenu, comme au
 * canvas. Séparé du gabarit public parce qu'on n'y navigue pas de la même
 * façon — ici on travaille, on ne découvre pas.
 *
 * @var string $content
 * @var string $title
 * @var string $espace  'organisateur' ou 'admin'
 * @var string $onglet  entrée de menu active
 */
$espace = $espace ?? 'organisateur';
$onglet = $onglet ?? '';

$menu = $espace === 'admin'
    ? [
        '/admin' => ['Vue d’ensemble', 'ensemble'],
        '/admin/collectes' => ['Collectes', 'collectes'],
        '/admin/contributions' => ['Contributions', 'contributions'],
        '/admin/utilisateurs' => ['Utilisateurs', 'utilisateurs'],
    ]
    : [
        '/tableau-de-bord' => ['Mes collectes', 'collectes'],
        '/tableau-de-bord/contributions' => ['Contributions', 'contributions'],
        '/creer' => ['Nouvelle collecte', 'creer'],
    ];
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
<div class="app">
  <aside class="menu">
    <a class="marque" href="/">
      <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="var(--violet)"/>
        <circle cx="13" cy="13" r="6.5" fill="var(--violet-soft)"/>
        <circle cx="19" cy="19" r="6.5" fill="var(--violet-bright)"/>
      </svg>
      <span style="font-size:17px"><?= $espace === 'admin' ? 'Admin' : 'Sungku' ?></span>
    </a>

    <nav>
      <?php foreach ($menu as $url => [$libelle, $cle]): ?>
        <a href="<?= $url ?>" class="<?= $onglet === $cle ? 'actif' : '' ?>"><?= $libelle ?></a>
      <?php endforeach; ?>
    </nav>

    <nav style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border)">
      <?php if ($espace === 'admin'): ?>
        <a href="/tableau-de-bord">Espace organisateur</a>
      <?php elseif (Session::has('ADMIN')): ?>
        <a href="/admin">Espace admin</a>
      <?php endif; ?>
      <a href="/">Voir le site</a>
      <a href="/deconnexion">Déconnexion</a>
    </nav>
  </aside>

  <main class="contenu"><?= $content ?></main>
</div>
</body>
</html>
