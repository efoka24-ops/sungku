-- Reversements, commissions et conditions acceptées.

CREATE TABLE IF NOT EXISTS platform_settings (
    setting_key VARCHAR(64) NOT NULL PRIMARY KEY,
    value       TEXT        NOT NULL,
    updated_at  DATETIME    NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE campaigns
    ADD COLUMN cover_path VARCHAR(190) NULL AFTER description;

-- Le taux est FIGÉ sur la collecte au moment de l'acceptation, il n'est pas
-- lu dans les paramètres au moment du reversement. Sans cela, modifier la
-- grille tarifaire changerait rétroactivement les conditions de collectes
-- déjà en cours : l'organisateur aurait accepté un taux et se verrait
-- appliquer l'autre.
ALTER TABLE campaigns
    ADD COLUMN fee_rate DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER goal_amount;

ALTER TABLE campaigns
    ADD COLUMN terms_version VARCHAR(20) NULL AFTER fee_rate;

ALTER TABLE campaigns
    ADD COLUMN terms_accepted_at DATETIME NULL AFTER terms_version;

-- Coordonnées de reversement de l'organisateur, saisies à la création.
ALTER TABLE campaigns
    ADD COLUMN payout_phone VARCHAR(20) NULL AFTER terms_accepted_at;

CREATE TABLE IF NOT EXISTS payouts (
    -- id = payoutId pawaPay (UUIDv4), comme pour les dépôts : un seul
    -- identifiant de bout en bout.
    id              CHAR(36)     NOT NULL PRIMARY KEY,
    campaign_id     INT UNSIGNED NOT NULL,
    organizer_id    INT UNSIGNED NOT NULL,
    gross_amount    BIGINT       NOT NULL,  -- part de collecte reversée, avant commission
    fee_rate        DECIMAL(5,2) NOT NULL,
    fee_amount      BIGINT       NOT NULL,
    amount          BIGINT       NOT NULL,  -- net effectivement envoyé
    currency        CHAR(3)      NOT NULL DEFAULT 'XAF',
    phone_number    VARCHAR(20)  NOT NULL,
    provider        VARCHAR(40)  NULL,
    -- PENDING | PROCESSING | CONFIRMED | FAILED | NEEDS_ATTENTION
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    provider_tx_id  VARCHAR(64)  NULL,
    failure_code    VARCHAR(64)  NULL,
    failure_message VARCHAR(255) NULL,
    requested_by    INT UNSIGNED NULL,
    last_checked_at DATETIME     NULL,
    completed_at    DATETIME     NULL,
    created_at      DATETIME     NOT NULL,
    updated_at      DATETIME     NOT NULL,
    KEY idx_payouts_campaign (campaign_id, status),
    KEY idx_payouts_status_created (status, created_at),
    CONSTRAINT fk_payouts_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns (id),
    CONSTRAINT fk_payouts_organizer FOREIGN KEY (organizer_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
