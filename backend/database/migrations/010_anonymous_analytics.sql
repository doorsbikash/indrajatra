CREATE TABLE IF NOT EXISTS analytics_devices (
  device_id CHAR(36) PRIMARY KEY,
  device_type VARCHAR(16) NOT NULL,
  display_mode VARCHAR(16) NOT NULL,
  first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  visit_count INT UNSIGNED NOT NULL DEFAULT 0,
  INDEX idx_analytics_devices_first_seen (first_seen_at),
  INDEX idx_analytics_devices_last_seen (last_seen_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analytics_visits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  device_id CHAR(36) NOT NULL,
  session_id CHAR(36) NOT NULL,
  landing_path VARCHAR(160) NOT NULL,
  first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  page_views INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_analytics_visit_session (session_id),
  INDEX idx_analytics_visits_device (device_id),
  INDEX idx_analytics_visits_first_seen (first_seen_at),
  CONSTRAINT fk_analytics_visit_device FOREIGN KEY (device_id)
    REFERENCES analytics_devices(device_id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  device_id CHAR(36) NOT NULL,
  session_id CHAR(36) NOT NULL,
  event_name VARCHAR(64) NOT NULL,
  path VARCHAR(160) NOT NULL,
  content_id VARCHAR(160) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_analytics_events_created (created_at),
  INDEX idx_analytics_events_name_created (event_name, created_at),
  INDEX idx_analytics_events_device (device_id),
  CONSTRAINT fk_analytics_event_device FOREIGN KEY (device_id)
    REFERENCES analytics_devices(device_id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
