<?php

use Sungku\Http\Csrf;
use Sungku\Http\View;

/** @var array<int, array> $campaigns */
/** @var array<int, array> $historique */
/** @var array $plateforme */
/** @var string|null $message */
/** @var string|null $erreur */

$etat = static fn (string $s): array => match ($s) {
    'CONFIRMED' => ['Reversé', 'confirme'],
    'FAILED' => ['Échoué', 'echec'],
    'NEEDS_ATTENTION' => ['À vérifier', 'attente'],
    default => ['En cours', 'attente'],
};
?>
<h1 style="font-size:28px;margin:0 0 8px">Reversements</h1>
<p style="font-size:14px;color:var(--ink-dim);margin:0 0 28px">
  Envoi des fonds collectés à l’organisateur, commission déduite.
</p>

<?php if (!empty($message)): ?>
  <div class="avis succes"><?= View::e($message) ?></div>
<?php endif; ?>
<?php if (!empty($erreur)): ?>
  <div class="avis alerte"><?= View::e($erreur) ?></div>
<?php endif; ?>

<div class="stats">
  <div class="stat">
    <div class="libelle">Encaissé</div>
    <div class="valeur"><?= View::fcfa((int) $plateforme['collecte']) ?></div>
  </div>
  <div class="stat">
    <div class="libelle">Commissions perçues</div>
    <div class="valeur" style="color:var(--violet)"><?= View::fcfa((int) $plateforme['commissions']) ?></div>
  </div>
  <div class="stat">
    <div class="libelle">Reversé aux organisateurs</div>
    <div class="valeur"><?= View::fcfa((int) $plateforme['reverse']) ?></div>
  </div>
  <div class="stat">
    <div class="libelle">Solde à reverser</div>
    <div class="valeur"><?= View::fcfa((int) $plateforme['a_reverser']) ?></div>
  </div>
</div>

<h2 style="font-size:20px;margin:0 0 6px">Soldes par collecte</h2>
<p style="font-size:13px;color:var(--ink-dim);margin:0 0 16px">
  Le disponible ne compte que les contributions confirmées, et déduit les
  reversements déjà engagés — y compris ceux encore en cours, pour qu’un même
  montant ne parte pas deux fois.
</p>

<div class="table">
  <div class="entete" style="grid-template-columns:2fr 1.2fr 1fr 1.2fr 1.8fr">
    <span>Collecte</span><span>Collecté</span><span>Commission</span><span>Disponible</span><span>Reverser</span>
  </div>

  <?php $aucun = true; foreach ($campaigns as $c): $b = $c['balance']; ?>
    <?php if ($b['gross'] <= 0) { continue; } $aucun = false; ?>
    <div class="ligne" style="grid-template-columns:2fr 1.2fr 1fr 1.2fr 1.8fr">
      <span>
        <a href="/c/<?= View::e($c['slug']) ?>"><?= View::e($c['title']) ?></a>
        <div style="color:var(--ink-dim);font-size:12px;margin-top:4px">
          <?= View::e($c['organisateur'] ?: $c['organizer_email']) ?>
        </div>
      </span>
      <span style="font-weight:600"><?= View::fcfa((int) $b['gross']) ?></span>
      <span style="color:var(--ink-dim)">
        <?= View::fcfa((int) $b['fee']) ?>
        <div style="font-size:12px">(<?= rtrim(rtrim(number_format((float) $b['fee_rate'], 2, ',', ' '), '0'), ',') ?> %)</div>
      </span>
      <span style="color:var(--violet);font-weight:600">
        <?= View::fcfa((int) $b['available']) ?>
        <?php if ((int) $b['pending'] > 0): ?>
          <div style="font-size:12px;color:var(--warning)">
            <?= View::fcfa((int) $b['pending']) ?> en cours
          </div>
        <?php endif; ?>
      </span>
      <span>
        <?php if ((int) $b['available'] > 0): ?>
          <form method="post" action="/admin/reversements" style="margin:0;display:flex;gap:8px;flex-wrap:wrap">
            <?= Csrf::field() ?>
            <input type="hidden" name="campaign_id" value="<?= (int) $c['id'] ?>">
            <input type="number" name="amount" value="<?= (int) $b['available'] ?>"
                   min="1" max="<?= (int) $b['available'] ?>" required
                   style="width:110px;padding:8px 10px;font-size:13px">
            <input type="tel" name="phone" value="<?= View::e($c['payout_phone']) ?>" required
                   placeholder="Numéro" style="width:130px;padding:8px 10px;font-size:13px">
            <button class="btn" type="submit" style="padding:8px 14px;font-size:13px">Envoyer</button>
          </form>
        <?php else: ?>
          <span style="color:var(--ink-dim);font-size:13px">Rien à reverser</span>
        <?php endif; ?>
      </span>
    </div>
  <?php endforeach; ?>

  <?php if ($aucun): ?>
    <div class="vide">Aucune collecte n’a encore encaissé de contribution confirmée.</div>
  <?php endif; ?>
</div>

<h2 style="font-size:20px;margin:0 0 16px">Historique</h2>

<div class="table">
  <div class="entete" style="grid-template-columns:1.1fr 1.8fr 1fr 1fr 1fr 1fr">
    <span>Date</span><span>Collecte</span><span>Brut</span><span>Commission</span><span>Net envoyé</span><span>Statut</span>
  </div>

  <?php if ($historique === []): ?>
    <div class="vide">Aucun reversement effectué.</div>
  <?php else: ?>
    <?php foreach ($historique as $p): [$libelle, $classe] = $etat((string) $p['status']); ?>
      <div class="ligne" style="grid-template-columns:1.1fr 1.8fr 1fr 1fr 1fr 1fr">
        <span style="color:var(--ink-dim)"><?= date('d/m/Y H:i', strtotime((string) $p['created_at'])) ?></span>
        <span><a href="/c/<?= View::e($p['slug']) ?>"><?= View::e($p['title']) ?></a></span>
        <span><?= View::fcfa((int) $p['gross_amount']) ?></span>
        <span style="color:var(--ink-dim)"><?= View::fcfa((int) $p['fee_amount']) ?></span>
        <span style="font-weight:600"><?= View::fcfa((int) $p['amount']) ?></span>
        <span>
          <span class="badge <?= $classe ?>"><?= $libelle ?></span>
          <?php if (!in_array($p['status'], ['CONFIRMED', 'FAILED'], true)): ?>
            <form method="post" action="/admin/reversements/verifier" style="margin-top:6px">
              <?= Csrf::field() ?>
              <input type="hidden" name="id" value="<?= View::e($p['id']) ?>">
              <button class="btn fantome" type="submit" style="padding:4px 10px;font-size:12px">Vérifier</button>
            </form>
          <?php endif; ?>
          <?php if (!empty($p['failure_message'])): ?>
            <div style="color:var(--ink-dim);font-size:12px;margin-top:4px"><?= View::e($p['failure_message']) ?></div>
          <?php endif; ?>
        </span>
      </div>
    <?php endforeach; ?>
  <?php endif; ?>
</div>
