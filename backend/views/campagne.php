<?php

use Sungku\Http\View;

/** @var array $campaign */
/** @var array<int, array> $contributions */
/** @var int $collected */
$goal = (int) $campaign['goal_amount'];
?>
<section style="padding:32px 0 8px">
  <span class="categorie"><?= View::e($campaign['category']) ?></span>
  <h1 style="font-size:28px;margin:0 0 8px"><?= View::e($campaign['title']) ?></h1>
  <?php if (!empty($campaign['description'])): ?>
    <p style="color:var(--gris);max-width:640px"><?= nl2br(View::e($campaign['description'])) ?></p>
  <?php endif; ?>

  <div class="jauge"><div style="width:<?= View::percent($collected, $goal) ?>%"></div></div>
  <div class="chiffres">
    <span><strong><?= View::fcfa($collected) ?></strong> collectés</span>
    <span>objectif <?= View::fcfa($goal) ?> · <?= count($contributions) ?> contribution(s)</span>
  </div>
</section>

<div class="panneau">
  <h2 style="margin:0 0 4px;font-size:19px">Contribuer</h2>
  <p class="aide" style="margin:0 0 8px">
    Vous recevrez une demande de validation sur votre téléphone : saisissez votre
    code PIN pour confirmer le paiement.
  </p>

  <div id="avis"></div>

  <form id="don">
    <label for="amount">Montant (FCFA)</label>
    <input type="number" id="amount" name="amount" min="100" step="100" value="1000" required>

    <label for="phoneNumber">Numéro mobile money</label>
    <input type="tel" id="phoneNumber" name="phoneNumber" placeholder="6 77 12 34 56" required>
    <div class="aide" id="operateur">MTN MoMo et Orange Money acceptés. L'opérateur est détecté automatiquement.</div>

    <label for="contributorName">Votre nom (facultatif)</label>
    <input type="text" id="contributorName" name="contributorName" maxlength="80">

    <label for="contributorEmail">Votre e-mail (facultatif, pour le reçu)</label>
    <input type="email" id="contributorEmail" name="contributorEmail">

    <label for="message">Message (facultatif)</label>
    <textarea id="message" name="message" rows="2" maxlength="300"></textarea>

    <div class="ligne">
      <input type="checkbox" id="isAnonymous" name="isAnonymous">
      <label for="isAnonymous" style="margin:0;font-weight:400">Rester anonyme sur la page</label>
    </div>

    <div style="margin-top:20px">
      <button class="btn" type="submit" id="envoyer">Contribuer</button>
    </div>
  </form>
</div>

<h2 class="section">Contributeurs</h2>
<div class="panneau">
  <?php if ($contributions === []): ?>
    <p style="margin:0;color:var(--gris)">Aucune contribution confirmée pour l'instant.</p>
  <?php else: ?>
    <?php foreach ($contributions as $c): ?>
      <div class="contribution">
        <div class="haut">
          <strong><?= $c['is_anonymous'] ? 'Anonyme' : View::e($c['contributor_name'] ?: 'Contributeur') ?></strong>
          <span class="montant"><?= View::fcfa((int) $c['amount']) ?></span>
        </div>
        <?php if (!empty($c['message'])): ?>
          <div class="msg"><?= View::e($c['message']) ?></div>
        <?php endif; ?>
      </div>
    <?php endforeach; ?>
  <?php endif; ?>
</div>

<script>
const slug = <?= json_encode($campaign['slug']) ?>;
const form = document.getElementById('don');
const avis = document.getElementById('avis');
const bouton = document.getElementById('envoyer');

function afficher(type, texte) {
  avis.innerHTML = '<div class="avis ' + type + '">' + texte + '</div>';
}

// Le statut définitif d'un paiement mobile money n'arrive jamais dans la
// réponse initiale : le payeur doit d'abord saisir son PIN. On interroge donc
// la contribution jusqu'à ce qu'elle soit tranchée, avec un plafond pour ne
// pas boucler indéfiniment si le téléphone reste silencieux.
async function suivre(id, essais = 0) {
  if (essais > 40) {
    afficher('alerte', "Toujours en attente de votre validation. La page se mettra à jour dès " +
      "que l'opérateur confirmera — ne relancez pas le paiement.");
    bouton.disabled = false;
    return;
  }

  const r = await fetch('/api/contributions/' + id);
  const d = await r.json();

  if (d.status === 'CONFIRMED') {
    afficher('info', 'Merci ! Votre contribution est confirmée.');
    setTimeout(() => location.reload(), 1500);
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
      // 503 = issue indéterminée côté passerelle : surtout ne pas inviter à
      // recommencer, le débit a peut-être eu lieu.
      afficher(r.status === 503 ? 'alerte' : 'erreur', d.error || 'Paiement refusé.');
      if (r.status !== 503) bouton.disabled = false;
      return;
    }

    suivre(d.id);
  } catch (err) {
    afficher('alerte', "Réponse du serveur non reçue. Vérifiez votre téléphone avant de réessayer.");
  }
});
</script>
