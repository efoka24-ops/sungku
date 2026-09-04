<?php

use Sungku\Http\View;

/** @var array $campaign */
/** @var array<int, array> $contributions */
/** @var int $collected */
/** @var string|null $organisateur */
$goal = (int) $campaign['goal_amount'];
?>
<div class="wrap" style="padding-top:32px;padding-bottom:80px;
     display:grid;grid-template-columns:1.3fr 0.7fr;gap:40px" id="grille">

  <div>
    <div style="height:280px;border-radius:14px;margin-bottom:24px;
                background:linear-gradient(135deg,var(--violet-soft),var(--surface-2));
                display:flex;align-items:center;justify-content:center">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="var(--violet)" opacity=".5">
        <circle cx="9" cy="10" r="6"/><circle cx="15" cy="15" r="6" opacity=".6"/>
      </svg>
    </div>

    <h1 style="font-size:30px;margin:0 0 8px"><?= View::e($campaign['title']) ?></h1>
    <div style="font-size:14px;color:var(--ink-dim);margin-bottom:24px">
      Organisé par <?= View::e($organisateur ?: 'un organisateur Sungku') ?>
      · <?= View::e($campaign['category']) ?>
    </div>

    <?php if (!empty($campaign['description'])): ?>
      <p style="font-size:15px;line-height:1.6"><?= nl2br(View::e($campaign['description'])) ?></p>
    <?php endif; ?>

    <div style="margin-top:32px">
      <div style="font-size:14px;font-weight:600;margin-bottom:14px">Contributeurs récents</div>
      <?php if ($contributions === []): ?>
        <div style="font-size:14px;color:var(--ink-dim)">
          Aucune contribution confirmée pour l’instant. Soyez le premier.
        </div>
      <?php else: ?>
        <div style="display:flex;flex-direction:column;gap:10px">
          <?php foreach ($contributions as $c): ?>
            <div style="border:1px solid var(--border);border-radius:10px;padding:12px 16px;font-size:14px">
              <div style="display:flex;justify-content:space-between;gap:12px">
                <span><?= $c['is_anonymous'] ? 'Anonyme' : View::e($c['contributor_name'] ?: 'Contributeur') ?></span>
                <span style="color:var(--violet);font-weight:600;white-space:nowrap"><?= View::fcfa((int) $c['amount']) ?></span>
              </div>
              <?php if (!empty($c['message'])): ?>
                <div style="color:var(--ink-dim);font-size:13px;margin-top:4px"><?= View::e($c['message']) ?></div>
              <?php endif; ?>
            </div>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
    </div>
  </div>

  <div>
    <div class="carte" style="position:sticky;top:24px">
      <div class="jauge"><div style="width:<?= View::percent($collected, $goal) ?>%"></div></div>
      <div class="serif" style="font-size:22px;margin-bottom:2px"><?= View::fcfa($collected) ?></div>
      <div style="font-size:13px;color:var(--ink-dim);margin-bottom:20px">
        collectés sur <?= View::fcfa($goal) ?> · <?= count($contributions) ?> contributeur(s)
      </div>

      <div id="avis"></div>

      <!-- État 1 : repos -->
      <div id="etape-repos">
        <button class="btn bloc" onclick="ouvrirTunnel()">Contribuer à cette collecte</button>
      </div>

      <!-- État 2 : saisie -->
      <form id="etape-form" style="display:none;flex-direction:column;gap:16px">
        <div>
          <label>Montant</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
            <?php foreach ([1000, 5000, 10000, 25000] as $preset): ?>
              <span class="pilule" style="cursor:pointer;padding:6px 12px"
                    onclick="choisirMontant(this,<?= $preset ?>)"><?= number_format($preset, 0, ',', ' ') ?></span>
            <?php endforeach; ?>
          </div>
          <input type="number" id="amount" min="100" step="100" value="1000" required>
        </div>

        <div>
          <label>Numéro mobile money</label>
          <input type="tel" id="phoneNumber" placeholder="6 77 12 34 56" required>
          <div class="aide" id="operateur">L’opérateur est détecté automatiquement.</div>
        </div>

        <div>
          <label>Votre nom (facultatif)</label>
          <input type="text" id="contributorName" maxlength="80">
        </div>

        <div>
          <label>E-mail pour le reçu (facultatif)</label>
          <input type="email" id="contributorEmail">
        </div>

        <div>
          <label>Message (facultatif)</label>
          <textarea id="message" rows="2" maxlength="300"></textarea>
        </div>

        <label style="display:flex;align-items:center;gap:10px;color:var(--ink);margin:0">
          <input type="checkbox" id="isAnonymous" style="width:auto">
          Rester anonyme sur la page
        </label>

        <button class="btn bloc" type="submit" id="envoyer">Confirmer la contribution</button>
        <button class="btn fantome bloc" type="button" onclick="fermerTunnel()">Annuler</button>
      </form>

      <!-- État 3 : confirmé -->
      <div id="etape-fait" style="display:none;text-align:center;padding:12px 0">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="var(--success)" style="margin-bottom:12px">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 12.5l3 3 5.5 -6" stroke="var(--surface)" stroke-width="2" fill="none"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="serif" style="font-size:18px;margin-bottom:6px">Contribution confirmée</div>
        <div style="font-size:13px;color:var(--ink-dim);margin-bottom:16px" id="reference"></div>
      </div>

      <div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--border);
                  font-size:12px;color:var(--ink-dim);line-height:1.5">
        Vous validerez le paiement par votre code PIN, directement chez votre
        opérateur. Sungku ne le voit jamais.
      </div>
    </div>
  </div>
</div>

<style>
@media(max-width:860px){ #grille{grid-template-columns:1fr} }
</style>

<script>
const slug = <?= json_encode($campaign['slug']) ?>;
const repos = document.getElementById('etape-repos');
const form = document.getElementById('etape-form');
const fait = document.getElementById('etape-fait');
const avis = document.getElementById('avis');
const bouton = document.getElementById('envoyer');

function afficher(type, texte) {
  avis.innerHTML = texte ? '<div class="avis ' + type + '">' + texte + '</div>' : '';
}

function ouvrirTunnel() {
  repos.style.display = 'none';
  form.style.display = 'flex';
}

function fermerTunnel() {
  form.style.display = 'none';
  repos.style.display = 'block';
  afficher('', '');
}

function choisirMontant(el, montant) {
  document.querySelectorAll('#etape-form .pilule').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('amount').value = montant;
}

// L'opérateur est deviné côté serveur par pawaPay : sa table de préfixes est
// tenue à jour, une copie locale se périmerait à chaque ouverture de plage.
let minuteur;
document.getElementById('phoneNumber').addEventListener('input', (e) => {
  clearTimeout(minuteur);
  const valeur = e.target.value;
  minuteur = setTimeout(async () => {
    const aide = document.getElementById('operateur');
    if (valeur.replace(/\D/g, '').length < 9) {
      aide.textContent = 'L’opérateur est détecté automatiquement.';
      return;
    }
    try {
      const r = await fetch('/api/payments/predict-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: valeur }),
      });
      const d = await r.json();
      aide.textContent = r.ok
        ? 'Opérateur détecté : ' + (d.provider === 'ORANGE_CMR' ? 'Orange Money' : 'MTN Mobile Money')
        : 'Numéro non reconnu par les opérateurs.';
    } catch { /* le serveur retranchera de toute façon à l'envoi */ }
  }, 600);
});

// Le statut définitif n'arrive jamais dans la réponse initiale : le payeur doit
// d'abord saisir son PIN. On interroge donc la contribution jusqu'à ce qu'elle
// soit tranchée, avec un plafond pour ne pas boucler indéfiniment.
async function suivre(id, essais = 0) {
  if (essais > 40) {
    afficher('alerte', 'Toujours en attente de votre validation. La page se mettra à jour ' +
      'dès que l’opérateur confirmera — ne relancez pas le paiement.');
    bouton.disabled = false;
    return;
  }

  const r = await fetch('/api/contributions/' + id);
  const d = await r.json();

  if (d.status === 'CONFIRMED') {
    form.style.display = 'none';
    afficher('', '');
    document.getElementById('reference').textContent = 'Référence ' + id.slice(0, 8).toUpperCase();
    fait.style.display = 'block';
    setTimeout(() => location.reload(), 2500);
    return;
  }

  if (d.status === 'FAILED') {
    afficher('erreur', 'Paiement non abouti' + (d.failureMessage ? ' : ' + d.failureMessage : '.'));
    bouton.disabled = false;
    return;
  }

  setTimeout(() => suivre(id, essais + 1), 3000);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  bouton.disabled = true;
  afficher('info', 'Demande envoyée. Validez le paiement sur votre téléphone…');

  const corps = {
    amount: Number(document.getElementById('amount').value),
    phoneNumber: document.getElementById('phoneNumber').value,
    contributorName: document.getElementById('contributorName').value,
    contributorEmail: document.getElementById('contributorEmail').value,
    message: document.getElementById('message').value,
    isAnonymous: document.getElementById('isAnonymous').checked,
  };

  try {
    const r = await fetch('/api/campaigns/' + slug + '/contributions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corps),
    });
    const d = await r.json();

    if (!r.ok) {
      // 503 = issue indéterminée : surtout ne pas inviter à recommencer, le
      // débit a peut-être eu lieu. Le bouton reste donc désactivé.
      afficher(r.status === 503 ? 'alerte' : 'erreur', d.error || 'Paiement refusé.');
      if (r.status !== 503) bouton.disabled = false;
      return;
    }

    suivre(d.id);
  } catch (err) {
    afficher('alerte', 'Réponse du serveur non reçue. Vérifiez votre téléphone avant de réessayer.');
  }
});
</script>
