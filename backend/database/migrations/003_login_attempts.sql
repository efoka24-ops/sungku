-- Tentatives de connexion, pour freiner les essais en série.
--
-- En base et non en session : un attaquant qui devine des mots de passe
-- n'envoie pas de cookie, un compteur stocké en session ne le ralentirait
-- donc pas d'une seconde. La clé associe l'adresse visée à l'IP source, ce
-- qui bloque l'acharnement sur un compte sans punir tout un réseau partagé
-- pour la faute d'un seul.

CREATE TABLE IF NOT EXISTS login_attempts (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(190) NOT NULL,
    ip         VARCHAR(45)  NOT NULL,
    tried_at   DATETIME     NOT NULL,
    KEY idx_login_attempts_lookup (email, ip, tried_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
