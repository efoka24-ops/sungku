-- Adresse facultative du contributeur (pour le reçu) et verrou d'envoi.
--
-- notified_at sert de jeton : le callback pawaPay et le cron de rapprochement
-- peuvent constater la confirmation à quelques secondes d'intervalle. Sans
-- verrou, le contributeur reçoit deux reçus pour un seul paiement. La colonne
-- est réclamée par un UPDATE conditionnel, atomique, avant tout envoi.

ALTER TABLE contributions
    ADD COLUMN contributor_email VARCHAR(190) NULL AFTER contributor_name;

ALTER TABLE contributions
    ADD COLUMN notified_at DATETIME NULL AFTER completed_at;
