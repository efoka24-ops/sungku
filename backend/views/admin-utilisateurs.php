<?php

use Sungku\Http\View;

/** @var array<int, array> $users */
?>
<h1 style="font-size:28px;margin:0 0 8px">Utilisateurs</h1>
<p style="font-size:14px;color:var(--ink-dim);margin:0 0 28px">
  Les rôles s’attribuent par la route d’exploitation, jamais depuis cet écran :
  une page capable de donner les droits admin serait la cible la plus rentable
  du site.
</p>

<div class="table">
  <div class="entete" style="grid-template-columns:1.6fr 2fr 1.2fr 1fr 1.1fr">
    <span>Nom</span><span>E-mail</span><span>Rôles</span><span>Collectes</span><span>Inscription</span>
  </div>

  <?php foreach ($users as $u): ?>
    <div class="ligne" style="grid-template-columns:1.6fr 2fr 1.2fr 1fr 1.1fr">
      <span><?= View::e($u['full_name'] ?: '—') ?></span>
      <span style="color:var(--ink-dim);word-break:break-all"><?= View::e($u['email']) ?></span>
      <span>
        <?php foreach (explode(', ', (string) $u['roles']) as $role): ?>
          <?php if ($role !== ''): ?>
            <span class="badge <?= $role === 'ADMIN' ? 'neutre' : 'confirme' ?>"><?= View::e($role) ?></span>
          <?php endif; ?>
        <?php endforeach; ?>
      </span>
      <span><?= (int) $u['collectes'] ?></span>
      <span style="color:var(--ink-dim)"><?= date('d/m/Y', strtotime((string) $u['created_at'])) ?></span>
    </div>
  <?php endforeach; ?>
</div>
