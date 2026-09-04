<?php

use Sungku\Core\Settings;
use Sungku\Http\Csrf;
use Sungku\Http\View;

/** @var string|null $erreur */
/** @var array<string, float> $fees */
/** @var array<string, string> $categories */
?>
<div class="wrap" style="padding-top:32px;padding-bottom:80px">
  <h1 style="font-size:26px;margin:0 0 24px">Nouvelle collecte</h1>

  <?php if (!empty($erreur)): ?>
    <div class="avis erreur" style="max-width:640px"><?= View::e($erreur) ?></div>
  <?php endif; ?>

  <form method="post" action="/creer" id="formulaire" enctype="multipart/form-data"
        style="display:grid;grid-template-columns:1.1fr 0.9fr;gap:40px">
    <?= Csrf::field() ?>
    <div>
      <div class="champ">
        <label for="title">Titre de la collecte</label>
        <input type="text" id="title" name="title" required maxlength="120"
               placeholder="Anniversaire de Sarah" oninput="majApercu()">
      </div>

      <div class="champ" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div>
          <label for="category">Catégorie</label>
          <select id="category" name="category" onchange="majTaux()">
            <?php foreach ($categories as $valeur => $libelle): ?>
              <option value="<?= $valeur ?>" <?= $valeur === 'AUTRE' ? 'selected' : '' ?>>
                <?= $libelle ?>
              </option>
            <?php endforeach; ?>
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
        <label for="cover">Image de couverture</label>
        <input type="file" id="cover" name="cover" accept="image/jpeg,image/png,image/webp"
               onchange="apercuImage(event)">
        <div class="aide">JPEG, PNG ou WebP, 4 Mo maximum. Facultative.</div>
      </div>

      <div class="champ">
        <label for="payoutPhone">Numéro pour recevoir les fonds</label>
        <input type="tel" id="payoutPhone" name="payoutPhone" required placeholder="6 77 12 34 56">
        <div class="aide">
          C’est sur ce numéro mobile money que les reversements seront envoyés.
        </div>
      </div>

      <div class="champ">
        <label>Méthodes de paiement acceptées</label>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <span class="pilule active">Orange Money</span>
          <span class="pilule active">MTN Mobile Money</span>
        </div>
      </div>

      <!-- Conditions : le taux applicable est affiché DANS le texte, et il
           dépend de la catégorie choisie juste au-dessus. -->
      <div class="carte" style="background:var(--surface-2);margin-bottom:20px">
        <h2 style="font-size:17px;margin:0 0 12px">Conditions générales d’utilisation</h2>

        <div id="cgu" style="max-height:220px;overflow-y:auto;font-size:13px;
                    line-height:1.6;color:var(--ink-dim);padding-right:12px"
             onscroll="verifierLecture(this)">
          <p><strong style="color:var(--ink)">1. Objet.</strong> Sungku met à votre
          disposition une page de collecte et encaisse pour votre compte les
          contributions versées par mobile money.</p>

          <p><strong style="color:var(--ink)">2. Commission.</strong> Une commission de
          <strong style="color:var(--violet)"><span id="taux">3</span> %</strong> est
          prélevée sur les sommes collectées pour la catégorie
          « <span id="categorieLibelle">Événement personnel</span> ». Elle est
          retenue au moment du reversement : vous recevez le montant collecté
          diminué de cette commission. Aucun autre frais n’est prélevé.</p>

          <p><strong style="color:var(--ink)">3. Taux figé.</strong> Le taux ci-dessus est
          celui en vigueur au jour de la création de votre collecte. Il est
          enregistré avec elle et ne changera pas, même si la grille tarifaire
          de la plateforme évolue par la suite.</p>

          <p><strong style="color:var(--ink)">4. Reversement.</strong> Les fonds sont
          reversés sur le numéro mobile money que vous avez indiqué. Seules les
          contributions confirmées par l’opérateur sont reversables : une
          contribution en attente ne l’est pas, et peut ne jamais aboutir.</p>

          <p><strong style="color:var(--ink)">5. Modération.</strong> Les collectes des
          catégories Santé et Funérailles sont vérifiées avant publication. Une
          collecte trompeuse, illicite ou portant atteinte à autrui peut être
          retirée à tout moment.</p>

          <p><strong style="color:var(--ink)">6. Responsabilité.</strong> Vous êtes
          responsable de l’exactitude des informations publiées et de l’usage
          des fonds conforme à l’objet annoncé aux contributeurs.</p>

          <p><strong style="color:var(--ink)">7. Données.</strong> Le numéro de téléphone
          des contributeurs n’est jamais affiché publiquement. Vous ne recevez
          que les informations nécessaires au suivi de votre collecte.</p>

          <p style="color:var(--ink-dim)">Version <?= Settings::TERMS_VERSION ?>.</p>
        </div>

        <label style="display:flex;align-items:flex-start;gap:10px;color:var(--ink);
                      margin-top:16px;font-size:14px">
          <input type="checkbox" id="accept" name="acceptTerms" value="1" required
                 disabled style="width:auto;margin-top:3px">
          <span>
            J’ai lu et j’accepte les conditions générales, y compris la
            commission de <strong id="tauxCheck">3</strong> % applicable à ma collecte.
          </span>
        </label>
        <div class="aide" id="aideLecture">Faites défiler les conditions jusqu’au bout pour pouvoir accepter.</div>
      </div>

      <button class="btn bloc" type="submit">Publier la collecte</button>
    </div>

    <div>
      <div style="font-size:13px;color:var(--ink-dim);margin-bottom:12px">Aperçu de la page publique</div>
      <div class="carte" style="padding:0;overflow:hidden">
        <div id="apercuImage" style="height:150px;background:linear-gradient(135deg,var(--violet-soft),var(--surface-2));
                    display:flex;align-items:center;justify-content:center;background-size:cover;background-position:center">
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

      <div class="carte" style="margin-top:20px">
        <div style="font-size:13px;color:var(--ink-dim);margin-bottom:10px">Ce que vous recevrez</div>
        <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:6px">
          <span>Si vous collectez</span><span id="simCollecte">500 000 FCFA</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:14px;color:var(--ink-dim);margin-bottom:6px">
          <span>Commission (<span id="simTaux">3</span> %)</span><span id="simFrais">− 15 000 FCFA</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:600;
                    border-top:1px solid var(--border);padding-top:8px">
          <span>Vous recevez</span><span id="simNet" style="color:var(--violet)">485 000 FCFA</span>
        </div>
      </div>
    </div>
  </form>
</div>

<style>
@media(max-width:860px){ #formulaire{grid-template-columns:1fr} }
</style>

<script>
const TAUX = <?= json_encode($fees) ?>;
const LIBELLES = <?= json_encode($categories) ?>;

function fcfa(n) {
  return Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ') + ' FCFA';
}

function tauxCourant() {
  const cat = document.getElementById('category').value;
  return TAUX[cat] !== undefined ? TAUX[cat] : (TAUX.AUTRE || 0);
}

// Le taux affiché dans les conditions suit la catégorie : accepter un texte
// qui annonce un autre chiffre que celui appliqué n'aurait aucune valeur.
function majTaux() {
  const taux = tauxCourant();
  const cat = document.getElementById('category').value;

  document.getElementById('taux').textContent = String(taux).replace('.', ',');
  document.getElementById('tauxCheck').textContent = String(taux).replace('.', ',');
  document.getElementById('simTaux').textContent = String(taux).replace('.', ',');
  document.getElementById('categorieLibelle').textContent = LIBELLES[cat] || cat;

  // Changer de catégorie change les conditions : l'acceptation précédente ne
  // vaut plus, on la retire.
  const accept = document.getElementById('accept');
  accept.checked = false;

  majApercu();
}

function majApercu() {
  const titre = document.getElementById('title').value.trim();
  const objectif = Number(document.getElementById('goalAmount').value || 0);
  const taux = tauxCourant();
  const frais = Math.round(objectif * taux / 100);

  document.getElementById('apercu-titre').textContent = titre || 'Votre collecte';
  document.getElementById('apercu-objectif').textContent = 'Objectif ' + fcfa(objectif);
  document.getElementById('simCollecte').textContent = fcfa(objectif);
  document.getElementById('simFrais').textContent = '− ' + fcfa(frais);
  document.getElementById('simNet').textContent = fcfa(objectif - frais);
}

// La case ne s'active qu'une fois le texte parcouru. C'est une friction
// assumée : on ne peut pas dire de quelqu'un qu'il a accepté un taux qu'il
// n'a pas eu sous les yeux.
function verifierLecture(el) {
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 16) {
    document.getElementById('accept').disabled = false;
    document.getElementById('aideLecture').textContent = 'Vous pouvez maintenant accepter les conditions.';
  }
}

function apercuImage(e) {
  const fichier = e.target.files[0];
  if (!fichier) return;
  const url = URL.createObjectURL(fichier);
  const zone = document.getElementById('apercuImage');
  zone.style.backgroundImage = 'url(' + url + ')';
  zone.innerHTML = '';
}

// Un texte plus court que sa zone n'émet jamais d'évènement de défilement :
// sans ce contrôle initial, la case resterait bloquée.
window.addEventListener('load', () => {
  majTaux();
  verifierLecture(document.getElementById('cgu'));
});
</script>
