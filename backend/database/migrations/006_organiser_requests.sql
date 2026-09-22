CREATE TABLE IF NOT EXISTS organiser_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  visitor_id BIGINT UNSIGNED NOT NULL,
  assistance_area VARCHAR(160) NOT NULL,
  message VARCHAR(500) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_organiser_request_visitor (visitor_id),
  KEY idx_organiser_request_status (status, created_at),
  CONSTRAINT fk_organiser_request_visitor FOREIGN KEY (visitor_id)
    REFERENCES visitor_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_organiser_request_reviewer FOREIGN KEY (reviewed_by)
    REFERENCES visitor_profiles(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
