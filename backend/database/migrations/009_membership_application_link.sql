ALTER TABLE membership_rewards
  ADD COLUMN application_submission_id VARCHAR(64) NULL AFTER application_received_at,
  ADD COLUMN application_email VARCHAR(254) NULL AFTER application_submission_id,
  ADD KEY idx_membership_application_submission (application_submission_id);
