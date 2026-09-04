-- Schéma initial Sungku — MySQL 8.
-- Chaque migration est rejouable : le déploiement FTP peut être relancé sans
-- qu'on sache toujours ce qui a déjà été appliqué.

CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(190) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(190) NULL,
    phone         VARCHAR(20)  NULL,
    created_at    DATETIME     NOT NULL,
    -- L'unicité est garantie par la base : un simple SELECT préalable laisse
    -- une fenêtre entre la vérification et l'insertion.
    UNIQUE KEY uniq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rôles cumulables : un organisateur peut aussi être marchand API. Une colonne
-- enum unique sur users rendrait ce cas impossible à représenter.
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INT UNSIGNED NOT NULL,
    role    VARCHAR(32)  NOT NULL,
    PRIMARY KEY (user_id, role),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS campaigns (
    id                INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    slug              VARCHAR(80)  NOT NULL,
    title             VARCHAR(190) NOT NULL,
    description       TEXT         NULL,
    category          VARCHAR(40)  NOT NULL DEFAULT 'AUTRE',
    goal_amount       BIGINT       NOT NULL,
    currency          CHAR(3)      NOT NULL DEFAULT 'XAF',
    organizer_id      INT UNSIGNED NOT NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    moderation_status VARCHAR(20)  NOT NULL DEFAULT 'APPROVED',
    ends_at           DATETIME     NULL,
    created_at        DATETIME     NOT NULL,
    updated_at        DATETIME     NOT NULL,
    UNIQUE KEY uniq_campaigns_slug (slug),
    KEY idx_campaigns_organizer (organizer_id),
    CONSTRAINT fk_campaigns_organizer FOREIGN KEY (organizer_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contributions (
    -- id = depositId pawaPay (UUIDv4) : un seul identifiant de bout en bout,
    -- donc un seul fil à tirer lors d'un litige.
    id              CHAR(36)     NOT NULL PRIMARY KEY,
    campaign_id     INT UNSIGNED NOT NULL,
    deposit_id      CHAR(36)     NOT NULL,
    amount          BIGINT       NOT NULL,
    currency        CHAR(3)      NOT NULL DEFAULT 'XAF',
    provider        VARCHAR(40)  NULL,
    phone_number    VARCHAR(20)  NULL,
    contributor_name VARCHAR(190) NULL,
    is_anonymous    TINYINT(1)   NOT NULL DEFAULT 0,
    message         TEXT         NULL,
    -- PENDING | PROCESSING | CONFIRMED | FAILED | NEEDS_ATTENTION
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    provider_tx_id  VARCHAR(64)  NULL,
    failure_code    VARCHAR(64)  NULL,
    failure_message VARCHAR(255) NULL,
    last_checked_at DATETIME     NULL,
    completed_at    DATETIME     NULL,
    created_at      DATETIME     NOT NULL,
    updated_at      DATETIME     NOT NULL,
    UNIQUE KEY uniq_contributions_deposit (deposit_id),
    -- Index du cron de rapprochement : il balaie les non-finales par ancienneté.
    KEY idx_contributions_status_created (status, created_at),
    KEY idx_contributions_campaign_status (campaign_id, status),
    CONSTRAINT fk_contributions_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trace brute de tout ce que pawaPay nous annonce. En cas de litige sur un
-- encaissement, c'est la seule pièce qui dit ce qui a été reçu, et quand.
CREATE TABLE IF NOT EXISTS payment_events (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    deposit_id  CHAR(36)     NOT NULL,
    source      VARCHAR(20)  NOT NULL,
    payload     TEXT         NULL,
    received_at DATETIME     NOT NULL,
    KEY idx_payment_events_deposit (deposit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
