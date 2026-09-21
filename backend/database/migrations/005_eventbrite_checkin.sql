CREATE TABLE IF NOT EXISTS event_attendees (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id VARCHAR(128) NOT NULL DEFAULT 'indra-jatra-2026',
  source VARCHAR(32) NOT NULL DEFAULT 'eventbrite',
  source_attendee_id_hash CHAR(64) NULL,
  ticket_code_hash CHAR(64) NULL,
  order_number_hash CHAR(64) NULL,
  email_hash CHAR(64) NOT NULL,
  first_name VARCHAR(120) NOT NULL DEFAULT '',
  last_name VARCHAR(120) NOT NULL DEFAULT '',
  ticket_type VARCHAR(160) NOT NULL DEFAULT '',
  checked_in_at DATETIME NULL,
  checked_in_by BIGINT UNSIGNED NULL,
  imported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_event_attendee_source_id (source_attendee_id_hash),
  UNIQUE KEY uq_event_attendee_ticket (ticket_code_hash),
  KEY idx_event_attendee_order (order_number_hash),
  KEY idx_event_attendee_email (email_hash),
  KEY idx_event_attendee_checkin (event_id, checked_in_at),
  CONSTRAINT fk_event_attendee_checkin_by FOREIGN KEY (checked_in_by)
    REFERENCES visitor_profiles(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
