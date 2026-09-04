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

/* ─── Tableaux de bord ─── */
.app{display:grid;grid-template-columns:240px 1fr;min-height:100vh}
aside.menu{background:var(--surface-2);border-right:1px solid var(--border);padding:28px 20px}
aside.menu .marque{margin-bottom:28px}
aside.menu nav{display:flex;flex-direction:column;gap:2px;font-size:14px}
aside.menu nav a{padding:10px 12px;border-radius:8px;color:var(--ink-dim);display:block}
aside.menu nav a.actif{background:var(--violet-soft);color:var(--violet);font-weight:600}
aside.menu nav a:hover{color:var(--ink)}
main.contenu{padding:40px 48px;min-width:0}

.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin-bottom:36px}
.stat{border:1px solid var(--border);border-radius:12px;padding:20px;background:var(--surface)}
.stat .libelle{font-size:13px;color:var(--ink-dim);margin-bottom:8px}
.stat .valeur{font-family:'Marcellus',serif;font-size:24px}

.table{border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:36px}
.table .entete,.table .ligne{display:grid;gap:12px;padding:14px 20px;align-items:center}
.table .entete{background:var(--surface-2);font-size:12px;color:var(--ink-dim);
  text-transform:uppercase;letter-spacing:.04em}
.table .ligne{border-top:1px solid var(--border);font-size:14px}
.table .vide{padding:28px 20px;color:var(--ink-dim);font-size:14px;text-align:center}

.badge{display:inline-block;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:600}
.badge.confirme{background:var(--success-soft);color:var(--success)}
.badge.attente{background:var(--warning-soft);color:var(--warning)}
.badge.echec{background:var(--danger-soft);color:var(--danger)}
.badge.neutre{background:var(--violet-soft);color:var(--violet)}

@media(max-width:860px){
  .app{grid-template-columns:1fr}
  aside.menu{border-right:0;border-bottom:1px solid var(--border)}
  aside.menu nav{flex-direction:row;flex-wrap:wrap}
  main.contenu{padding:24px 20px}
  .table .entete{display:none}
  .table .ligne{grid-template-columns:1fr !important;gap:6px}
}
</style>
