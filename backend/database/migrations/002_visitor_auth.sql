CREATE TABLE IF NOT EXISTS visitor_profiles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_visitor_profiles_email (email)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_challenges (
  id CHAR(64) PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  mode VARCHAR(16) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  registration_payload LONGTEXT NULL,
  requested_ip_hash CHAR(64) NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_auth_challenges_email_created (email, created_at),
  KEY idx_auth_challenges_ip_created (requested_ip_hash, created_at),
  KEY idx_auth_challenges_expiry (expires_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
