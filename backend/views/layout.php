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
<style>
/* Jetons du design validé (Sungku — Style Sombre). */
:root{
  --bg:#0d0b14; --surface:#171320; --surface-2:#1f1a2b;
  --ink:#f3f0fa; --ink-dim:#a89fc0;
  --violet:#a78bfa; --violet-bright:#c4b5fd; --violet-soft:#2a2140;
  --border:#332a45;
  --success:#34d399; --success-soft:#173325;
  --warning:#f4b740; --warning-soft:#3a2c10;
  --danger:#f26a80; --danger-soft:#3a1620;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
  font-family:'Jost',system-ui,sans-serif;min-height:100vh;line-height:1.55}
h1,h2,h3,.serif{font-family:'Marcellus',Georgia,serif;font-weight:400}
a{color:var(--violet);text-decoration:none}
a:hover{color:var(--violet-bright)}
.wrap{max-width:1200px;margin:0 auto;padding:0 40px}

header.site{background:var(--surface);border-bottom:1px solid var(--border)}
header.site .inner{display:flex;align-items:center;gap:36px;padding:20px 40px;
  max-width:1200px;margin:0 auto}
.marque{display:flex;align-items:center;gap:10px;color:var(--ink)}
.marque span{font-family:'Marcellus',serif;font-size:21px}
nav.principal{display:flex;gap:28px;font-size:15px;flex:1}
nav.principal a{color:var(--ink-dim)}
nav.principal a.actif,nav.principal a:hover{color:var(--ink)}
.actions{display:flex;gap:12px}

.btn{display:inline-block;background:var(--violet);border:none;color:#fff;
  padding:10px 18px;border-radius:8px;font:inherit;font-size:14px;cursor:pointer}
.btn:hover{background:var(--violet-bright);color:#1a1524}
.btn.fantome{background:transparent;border:1px solid var(--border);color:var(--ink)}
.btn.fantome:hover{background:var(--surface-2);color:var(--ink)}
.btn.large{padding:14px 28px;font-size:15px}
.btn.bloc{width:100%;padding:14px;text-align:center}
.btn:disabled{opacity:.55;cursor:not-allowed}

.carte{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px}
label{display:block;font-size:13px;color:var(--ink-dim);margin-bottom:6px}
input,textarea,select{width:100%;border:1px solid var(--border);border-radius:8px;
  padding:12px 14px;font-size:15px;font-family:'Jost',sans-serif;
  background:var(--surface);color:var(--ink)}
input:focus,textarea:focus,select:focus{outline:none;border-color:var(--violet)}
textarea{resize:vertical}
.champ{margin-bottom:20px}
.aide{font-size:13px;color:var(--ink-dim);margin-top:6px}

.pilule{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--border);
  border-radius:20px;padding:8px 16px;font-size:13px;color:var(--ink-dim)}
.pilule.active{border-color:var(--violet);background:var(--violet-soft);color:var(--violet)}

.jauge{height:8px;background:var(--border);border-radius:4px;overflow:hidden;margin-bottom:10px}
.jauge > div{height:100%;background:var(--violet)}

.avis{border-radius:8px;padding:12px 16px;font-size:14px;margin-bottom:16px}
.avis.info{background:var(--violet-soft);color:var(--violet-bright)}
.avis.succes{background:var(--success-soft);color:var(--success)}
.avis.alerte{background:var(--warning-soft);color:var(--warning)}
.avis.erreur{background:var(--danger-soft);color:var(--danger)}

footer.site{border-top:1px solid var(--border);margin-top:80px;padding:32px 0;
  color:var(--ink-dim);font-size:13px;background:var(--surface)}

@media(max-width:860px){
  .wrap,header.site .inner{padding-left:20px;padding-right:20px}
  nav.principal{display:none}
}
</style>
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
        <a class="btn fantome" href="/creer">Créer une collecte</a>
        <a class="btn fantome" href="/deconnexion">Déconnexion</a>
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
    Sungku — paiements en ligne pour le Cameroun. Orange Money, MTN Mobile Money.
    Traitement des paiements par pawaPay.
  </div>
</footer>
</body>
</html>
