CREATE TABLE IF NOT EXISTS organiser_revocations (
  visitor_id BIGINT UNSIGNED PRIMARY KEY,
  revoked_by BIGINT UNSIGNED NULL,
  revoked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_organiser_revocation_visitor FOREIGN KEY (visitor_id)
    REFERENCES visitor_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_organiser_revocation_actor FOREIGN KEY (revoked_by)
    REFERENCES visitor_profiles(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
