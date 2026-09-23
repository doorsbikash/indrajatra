CREATE TABLE IF NOT EXISTS membership_rewards (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  visitor_id BIGINT UNSIGNED NOT NULL,
  reward_code VARCHAR(32) NOT NULL,
  discount_percent TINYINT UNSIGNED NOT NULL DEFAULT 25,
  status VARCHAR(32) NOT NULL DEFAULT 'issued',
  issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  email_sent_at DATETIME NULL,
  application_received_at DATETIME NULL,
  payment_requested_at DATETIME NULL,
  paid_at DATETIME NULL,
  activated_at DATETIME NULL,
  UNIQUE KEY uq_membership_reward_visitor (visitor_id),
  UNIQUE KEY uq_membership_reward_code (reward_code),
  KEY idx_membership_reward_status (status),
  CONSTRAINT fk_membership_reward_visitor FOREIGN KEY (visitor_id)
    REFERENCES visitor_profiles(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
