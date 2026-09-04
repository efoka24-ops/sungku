<?php

declare(strict_types=1);

namespace Sungku\Http\Controllers;

use PDOException;
use Sungku\Core\Db;
use Sungku\Core\Request;
use Sungku\Core\Response;
use Sungku\Http\Session;

final class AuthController
{
    public function register(Request $request): void
    {
        $email = mb_strtolower($request->string('email'));
        $password = (string) $request->input('password', '');
        $fullName = $request->string('fullName');

        if ($email === '' || $password === '') {
            Response::error('email et password sont requis.', 422);

            return;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Adresse e-mail invalide.', 422);

            return;
        }

        if (mb_strlen($password) < 8) {
            Response::error('Le mot de passe doit contenir au moins 8 caractères.', 422);

            return;
        }

        $pdo = Db::pdo();

        try {
            $pdo->beginTransaction();

            Db::execute(
                'INSERT INTO users (email, password_hash, full_name, created_at)
                 VALUES (:email, :hash, :full_name, NOW())',
                [
                    'email' => $email,
                    'hash' => password_hash($password, PASSWORD_DEFAULT),
                    'full_name' => $fullName === '' ? null : $fullName,
                ],
            );

            $userId = (int) $pdo->lastInsertId();
            Db::execute(
                'INSERT INTO user_roles (user_id, role) VALUES (:id, :role)',
                ['id' => $userId, 'role' => 'ORGANIZER'],
            );

            $pdo->commit();
        } catch (PDOException $e) {
            $pdo->rollBack();

            // 23000 = violation de contrainte : l'unicité de l'e-mail est
            // garantie par la base, pas par un SELECT préalable qui laisserait
            // une fenêtre entre la vérification et l'insertion.
            if ($e->getCode() === '23000') {
                Response::error('Un compte existe déjà avec cette adresse e-mail.', 409);

                return;
            }

            throw $e;
        }

        Session::login($userId, ['ORGANIZER']);
        Response::json(['userId' => $userId, 'email' => $email, 'roles' => ['ORGANIZER']], 201);
    }

    public function login(Request $request): void
    {
        $email = mb_strtolower($request->string('email'));
        $password = (string) $request->input('password', '');

        if ($email === '' || $password === '') {
            Response::error('email et password sont requis.', 422);

            return;
        }

        $user = Db::selectOne(
            'SELECT id, password_hash FROM users WHERE email = :email LIMIT 1',
            ['email' => $email],
        );

        // Message identique pour un compte inconnu et un mot de passe faux :
        // les distinguer permettrait d'énumérer les adresses inscrites.
        if ($user === null || !password_verify($password, (string) $user['password_hash'])) {
            Response::error('Identifiants incorrects.', 401);

            return;
        }

        $userId = (int) $user['id'];

        // Le coût de hachage par défaut de PHP augmente avec les versions :
        // on remet à niveau les hachages anciens à la volée.
        if (password_needs_rehash((string) $user['password_hash'], PASSWORD_DEFAULT)) {
            Db::execute(
                'UPDATE users SET password_hash = :hash WHERE id = :id',
                ['hash' => password_hash($password, PASSWORD_DEFAULT), 'id' => $userId],
            );
        }

        $roles = Session::rolesOf($userId);
        Session::login($userId, $roles);

        Response::json(['userId' => $userId, 'email' => $email, 'roles' => $roles]);
    }

    public function logout(Request $request): void
    {
        Session::logout();
        Response::json(['loggedOut' => true]);
    }

    public function me(Request $request): void
    {
        $userId = Session::requireUser();

        $user = Db::selectOne(
            'SELECT id, email, full_name, created_at FROM users WHERE id = :id',
            ['id' => $userId],
        );

        Response::json(['user' => $user, 'roles' => Session::roles()]);
    }
}
