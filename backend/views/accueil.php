<?php

use Sungku\Http\View;

/** @var array<int, array> $campaigns */
?>
<section style="padding:96px 40px 80px;text-align:center;max-width:760px;margin:0 auto">
  <div class="pilule active" style="margin-bottom:28px">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
    Paiements en ligne pour le Cameroun
  </div>
  <h1 style="font-size:52px;line-height:1.12;margin:0 0 24px">
    Encaissez et gérez vos paiements en un seul endroit
  </h1>
  <p style="font-size:18px;color:var(--ink-dim);line-height:1.6;margin:0 0 36px">
    Sungku simplifie les paiements en ligne en permettant aux entreprises et aux
    particuliers de collecter, envoyer et gérer leurs paiements depuis une seule
    plateforme.
  </p>
  <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
    <a class="btn large" href="/creer">Créer une collecte</a>
    <a class="btn fantome large" href="#cagnottes">Voir les collectes</a>
  </div>
</section>

<section style="padding:0 40px 88px;max-width:1100px;margin:0 auto;
                display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:20px">
  <?php
  $atouts = [
      ['Collecte de fonds', 'Créez une page de collecte en quelques minutes et partagez le lien.',
       '<circle cx="9" cy="10" r="6"/><circle cx="15" cy="15" r="6" opacity=".55"/>'],
      ['Mobile money', 'MTN MoMo et Orange Money, avec confirmation par l’opérateur.',
       '<rect x="6" y="2" width="12" height="20" rx="3"/><rect x="10" y="17" width="4" height="2" rx="1" fill="var(--violet-soft)"/>'],
      ['Suivi en temps réel', 'Chaque contribution apparaît une fois le paiement confirmé.',
       '<rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="6" width="4" height="15" rx="1"/><rect x="17" y="9" width="4" height="12" rx="1"/>'],
      ['Sécurité', 'Aucun code PIN ne transite par Sungku : la validation se fait chez l’opérateur.',
       '<path d="M12 2l8 3.6v6c0 5.2 -3.4 9 -8 10.4C7.4 20.6 4 16.8 4 11.6v-6z"/>'],
  ];
  foreach ($atouts as [$titre, $texte, $icone]): ?>
    <div class="carte" style="padding:28px 22px">
      <div style="width:44px;height:44px;border-radius:10px;background:var(--violet-soft);
                  display:flex;align-items:center;justify-content:center;margin-bottom:16px">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--violet)"><?= $icone ?></svg>
      </div>
      <div style="font-size:16px;font-weight:600;margin-bottom:6px"><?= $titre ?></div>
      <div style="font-size:14px;color:var(--ink-dim);line-height:1.5"><?= $texte ?></div>
    </div>
  <?php endforeach; ?>
</section>

<section class="wrap" id="cagnottes" style="padding-bottom:40px">
  <h2 style="font-size:26px;margin:0 0 24px">Collectes en cours</h2>

  <?php if ($campaigns === []): ?>
    <div class="carte" style="text-align:center;padding:48px 24px">
      <p style="margin:0 0 20px;color:var(--ink-dim)">
        Aucune collecte pour le moment. Ouvrez la première.
      </p>
      <a class="btn" href="/creer">Créer une collecte</a>
    </div>
  <?php else: ?>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px">
      <?php foreach ($campaigns as $c):
          $collected = (int) $c['collected'];
          $goal = (int) $c['goal_amount'];
      ?>
        <a class="carte" href="/c/<?= View::e($c['slug']) ?>" style="display:block;color:inherit;padding:0;overflow:hidden">
          <div style="height:140px;display:flex;align-items:center;justify-content:center;
                      background:<?= $c['cover_path']
                          ? "url('" . View::e($c['cover_path']) . "') center/cover no-repeat"
                          : 'linear-gradient(135deg,var(--violet-soft),var(--surface-2))' ?>">
            <?php if (empty($c['cover_path'])): ?>
              <svg width="42" height="42" viewBox="0 0 24 24" fill="var(--violet)" opacity=".55">
                <circle cx="9" cy="10" r="6"/><circle cx="15" cy="15" r="6" opacity=".6"/>
              </svg>
            <?php endif; ?>
          </div>
          <div style="padding:20px">
            <div style="font-size:12px;color:var(--ink-dim);letter-spacing:.06em;
                        text-transform:uppercase;margin-bottom:8px"><?= View::e($c['category']) ?></div>
            <div class="serif" style="font-size:19px;margin-bottom:14px"><?= View::e($c['title']) ?></div>
            <div class="jauge"><div style="width:<?= View::percent($collected, $goal) ?>%"></div></div>
            <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-dim)">
              <span><?= View::fcfa($collected) ?> collectés</span>
              <span>Objectif <?= View::fcfa($goal) ?></span>
            </div>
          </div>
        </a>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
</section>

<section style="padding:72px 40px 0;text-align:center">
  <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;
              color:var(--ink-dim);margin-bottom:20px">Compatible avec</div>
  <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
    <span class="pilule">Orange Money</span>
    <span class="pilule">MTN Mobile Money</span>
  </div>
</section>
