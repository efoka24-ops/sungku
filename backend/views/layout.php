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
<title><?= View::e($title) ?></title>
<style>
:root{
  --vert:#0f7a4d; --vert-clair:#e8f5ee; --or:#e0a419;
  --encre:#1c1917; --gris:#78716c; --bord:#e7e5e4; --fond:#faf9f7;
}
*{box-sizing:border-box}
body{margin:0;background:var(--fond);color:var(--encre);
  font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.55}
a{color:var(--vert);text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:960px;margin:0 auto;padding:0 20px}

header.site{background:#fff;border-bottom:1px solid var(--bord);position:sticky;top:0;z-index:10}
header.site .wrap{display:flex;align-items:center;justify-content:space-between;height:64px;gap:16px}
.logo{font-weight:700;font-size:20px;color:var(--encre)}
.logo span{color:var(--vert)}
nav{display:flex;gap:18px;align-items:center;font-size:15px}

.btn{display:inline-block;background:var(--vert);color:#fff;padding:10px 18px;
  border-radius:8px;border:0;font:inherit;font-weight:600;cursor:pointer}
.btn:hover{background:#0c6440;text-decoration:none}
.btn.secondaire{background:#fff;color:var(--encre);border:1px solid var(--bord)}

.hero{padding:56px 0 32px}
.hero h1{font-size:34px;margin:0 0 12px;line-height:1.2}
.hero p{color:var(--gris);font-size:17px;margin:0 0 24px;max-width:620px}

h2.section{font-size:20px;margin:32px 0 16px}
.grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}
.carte{background:#fff;border:1px solid var(--bord);border-radius:12px;padding:20px;display:block;color:inherit}
.carte:hover{border-color:var(--vert);text-decoration:none}
.carte h3{margin:0 0 8px;font-size:17px}
.categorie{display:inline-block;background:var(--vert-clair);color:var(--vert);
  font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px;margin-bottom:10px}

.jauge{height:10px;background:var(--bord);border-radius:99px;overflow:hidden;margin:14px 0 8px}
.jauge > div{height:100%;background:var(--vert);border-radius:99px}
.chiffres{display:flex;justify-content:space-between;font-size:14px;color:var(--gris)}
.chiffres strong{color:var(--encre)}

.panneau{background:#fff;border:1px solid var(--bord);border-radius:12px;padding:24px;margin:20px 0}
label{display:block;font-size:14px;font-weight:600;margin:14px 0 6px}
input,textarea,select{width:100%;padding:11px 13px;border:1px solid var(--bord);
  border-radius:8px;font:inherit;background:#fff}
input:focus,textarea:focus,select:focus{outline:2px solid var(--vert);border-color:var(--vert)}
.aide{font-size:13px;color:var(--gris);margin-top:6px}
.ligne{display:flex;gap:12px;align-items:center;margin-top:14px}
.ligne input[type=checkbox]{width:auto}

.avis{padding:14px 16px;border-radius:8px;margin:16px 0;font-size:15px}
.avis.info{background:var(--vert-clair);color:#0c5537}
.avis.alerte{background:#fef3c7;color:#78350f}
.avis.erreur{background:#fee2e2;color:#991b1b}

.contribution{border-top:1px solid var(--bord);padding:14px 0}
.contribution:last-child{border-bottom:0}
.contribution .haut{display:flex;justify-content:space-between;gap:12px}
.contribution .montant{color:var(--vert);font-weight:700;white-space:nowrap}
.contribution .msg{color:var(--gris);font-size:14px;margin-top:4px}

footer.site{border-top:1px solid var(--bord);margin-top:56px;padding:28px 0;
  color:var(--gris);font-size:14px;background:#fff}
@media(max-width:640px){.hero h1{font-size:26px}nav{gap:12px;font-size:14px}}
</style>
</head>
<body>
<header class="site">
  <div class="wrap">
    <a class="logo" href="/">Sun<span>gku</span></a>
    <nav>
      <a href="/">Cagnottes</a>
      <?php if (Session::userId() !== null): ?>
        <a href="/creer">Créer</a>
        <a href="/deconnexion">Déconnexion</a>
      <?php else: ?>
        <a href="/connexion">Connexion</a>
        <a class="btn" href="/creer">Créer une cagnotte</a>
      <?php endif; ?>
    </nav>
  </div>
</header>

<main class="wrap"><?= $content ?></main>

<footer class="site">
  <div class="wrap">
    Sungku — collecte de fonds par mobile money (MTN MoMo, Orange Money).
    Paiements traités par pawaPay.
  </div>
</footer>
</body>
</html>
