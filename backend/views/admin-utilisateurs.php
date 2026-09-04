<?php

use Sungku\Http\Csrf;
use Sungku\Http\Session;
use Sungku\Http\View;

/** @var array<int, array> $users */
?>
<h1 style="font-size:28px;margin:0 0 8px">Utilisateurs</h1>
<p style="font-size:14px;color:var(--ink-dim);margin:0 0 28px">
  Attribution et retrait des rôles. Chaque changement est journalisé au nom de
  l’administrateur qui le fait.
</p>

<?php if (!empty($_GET['erreur'])): ?>
  <div class="avis alerte"><?= View::e((string) $_GET['erreur']) ?></div>
<?php endif; ?>

<div class="table">
  <div class="entete" style="grid-template-columns:1.4fr 1.8fr 1.2fr 0.8fr 1fr 1.4fr">
    <span>Nom</span><span>E-mail</span><span>Rôles</span><span>Collectes</span><span>Inscription</span><span>Administrateur</span>
  </div>

  <?php foreach ($users as $u):
      $roles = array_filter(explode(', ', (string) $u['roles']));
      $estAdmin = in_array('ADMIN', $roles, true);
  ?>
    <div class="ligne" style="grid-template-columns:1.4fr 1.8fr 1.2fr 0.8fr 1fr 1.4fr">
      <span><?= View::e($u['full_name'] ?: '—') ?></span>
      <span style="color:var(--ink-dim);word-break:break-all"><?= View::e($u['email']) ?></span>
      <span>
        <?php foreach ($roles as $role): ?>
          <span class="badge <?= $role === 'ADMIN' ? 'neutre' : 'confirme' ?>"><?= View::e($role) ?></span>
        <?php endforeach; ?>
      </span>
      <span><?= (int) $u['collectes'] ?></span>
      <span style="color:var(--ink-dim)"><?= date('d/m/Y', strtotime((string) $u['created_at'])) ?></span>
      <span>
        <?php if ((int) $u['id'] === Session::userId()): ?>
          <span style="color:var(--ink-dim);font-size:13px">Vous-même</span>
        <?php else: ?>
          <form method="post" action="/admin/utilisateurs/role" style="margin:0"
                <?= $estAdmin ? '' : 'onsubmit="return confirm(\'Donner les droits administrateur à ce compte ?\')"' ?>>
            <?= Csrf::field() ?>
            <input type="hidden" name="user_id" value="<?= (int) $u['id'] ?>">
            <input type="hidden" name="role" value="ADMIN">
            <input type="hidden" name="action" value="<?= $estAdmin ? 'remove' : 'add' ?>">
            <button class="btn fantome" type="submit" style="padding:6px 12px;font-size:13px">
              <?= $estAdmin ? 'Retirer' : 'Promouvoir' ?>
            </button>
          </form>
        <?php endif; ?>
      </span>
    </div>
  <?php endforeach; ?>
</div>
