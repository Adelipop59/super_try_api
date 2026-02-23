-- Migration: Migrate existing UGC JSON data to UGC table
-- Description: Convert ugc_requests and ugc_submissions from Session JSON fields to UGC table entries
-- Date: 2026-01-29
-- IMPORTANT: Run this AFTER create_ugc_table.sql

-- Step 1: Migrate UGC Requests from sessions.ugc_requests to ugcs table
DO $$
DECLARE
  session_record RECORD;
  ugc_request JSONB;
  campaign_seller_id TEXT;
BEGIN
  -- Loop through all sessions that have ugc_requests
  FOR session_record IN
    SELECT
      s.id as session_id,
      s.ugc_requests,
      s.ugc_requested_at,
      s.potential_ugc_bonus,
      s.ugc_validated,
      s.ugc_validated_at,
      s.ugc_validation_comment,
      s.ugc_rejected_at,
      s.ugc_rejection_reason,
      s.ugc_declined,
      s.ugc_declined_at,
      s.ugc_decline_reason,
      s.ugc_submissions,
      s.ugc_submitted_at,
      s.final_ugc_bonus,
      c.seller_id,
      s.tester_id
    FROM sessions s
    JOIN campaigns c ON s.campaign_id = c.id
    WHERE s.ugc_requests IS NOT NULL
      AND jsonb_array_length(s.ugc_requests::jsonb) > 0
  LOOP
    campaign_seller_id := session_record.seller_id;

    -- Loop through each ugc_request in the JSON array
    FOR ugc_request IN
      SELECT * FROM jsonb_array_elements(session_record.ugc_requests::jsonb)
    LOOP
      -- Determine status based on session state
      DECLARE
        ugc_status "UGCStatus";
        ugc_type "UGCType";
        ugc_submitted_at TIMESTAMP(3);
        ugc_validated_at TIMESTAMP(3);
        ugc_validated_by TEXT;
        ugc_validation_comment TEXT;
        ugc_rejected_at TIMESTAMP(3);
        ugc_rejection_reason TEXT;
        ugc_declined_at TIMESTAMP(3);
        ugc_decline_reason TEXT;
        ugc_content_url TEXT;
        ugc_comment TEXT;
        ugc_paid_bonus DECIMAL(10,2);
      BEGIN
        -- Parse type
        ugc_type := (ugc_request->>'type')::"UGCType";

        -- Determine status
        IF session_record.ugc_declined THEN
          ugc_status := 'DECLINED';
          ugc_declined_at := session_record.ugc_declined_at;
          ugc_decline_reason := session_record.ugc_decline_reason;
        ELSIF session_record.ugc_validated THEN
          ugc_status := 'VALIDATED';
          ugc_validated_at := session_record.ugc_validated_at;
          ugc_validated_by := campaign_seller_id;
          ugc_validation_comment := session_record.ugc_validation_comment;
          ugc_paid_bonus := session_record.final_ugc_bonus;
        ELSIF session_record.ugc_rejected_at IS NOT NULL THEN
          ugc_status := 'REJECTED';
          ugc_rejected_at := session_record.ugc_rejected_at;
          ugc_rejection_reason := session_record.ugc_rejection_reason;
        ELSIF session_record.ugc_submitted_at IS NOT NULL THEN
          ugc_status := 'SUBMITTED';
          ugc_submitted_at := session_record.ugc_submitted_at;
        ELSE
          ugc_status := 'REQUESTED';
        END IF;

        -- Try to find matching submission
        IF session_record.ugc_submissions IS NOT NULL THEN
          DECLARE
            ugc_submission JSONB;
          BEGIN
            FOR ugc_submission IN
              SELECT * FROM jsonb_array_elements(session_record.ugc_submissions::jsonb)
            LOOP
              -- Match by type
              IF (ugc_submission->>'type') = (ugc_request->>'type') THEN
                ugc_content_url := ugc_submission->>'contentUrl';
                ugc_comment := ugc_submission->>'comment';
                ugc_submitted_at := session_record.ugc_submitted_at;
                EXIT; -- Found matching submission, stop loop
              END IF;
            END LOOP;
          END;
        END IF;

        -- Insert into ugcs table
        INSERT INTO ugcs (
          id,
          type,
          content_url,
          description,
          comment,
          requested_bonus,
          paid_bonus,
          deadline,
          status,
          validated_at,
          validated_by,
          validation_comment,
          rejected_at,
          rejection_reason,
          declined_at,
          decline_reason,
          submitted_at,
          session_id,
          chat_order_id,
          requested_by,
          submitted_by,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          ugc_type,
          ugc_content_url,
          COALESCE(ugc_request->>'description', 'UGC Request'),
          ugc_comment,
          (ugc_request->>'bonus')::DECIMAL(10,2),
          ugc_paid_bonus,
          (ugc_request->>'deadline')::TIMESTAMP(3),
          ugc_status,
          ugc_validated_at,
          ugc_validated_by,
          ugc_validation_comment,
          ugc_rejected_at,
          ugc_rejection_reason,
          ugc_declined_at,
          ugc_decline_reason,
          ugc_submitted_at,
          session_record.session_id,
          NULL, -- chat_order_id
          campaign_seller_id,
          CASE WHEN ugc_submitted_at IS NOT NULL THEN session_record.tester_id ELSE NULL END,
          session_record.ugc_requested_at,
          NOW()
        );
      END;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'UGC data migration completed successfully';
END $$;

-- Step 2: Verify migration
DO $$
DECLARE
  sessions_with_ugc_count INTEGER;
  migrated_ugc_count INTEGER;
BEGIN
  -- Count sessions with ugc_requests
  SELECT COUNT(*) INTO sessions_with_ugc_count
  FROM sessions
  WHERE ugc_requests IS NOT NULL
    AND jsonb_array_length(ugc_requests::jsonb) > 0;

  -- Count migrated UGC records
  SELECT COUNT(*) INTO migrated_ugc_count
  FROM ugcs
  WHERE session_id IS NOT NULL;

  RAISE NOTICE '====== MIGRATION VERIFICATION ======';
  RAISE NOTICE 'Sessions with UGC requests: %', sessions_with_ugc_count;
  RAISE NOTICE 'Migrated UGC records: %', migrated_ugc_count;
  RAISE NOTICE '===================================';
END $$;

-- Step 3: Show sample of migrated data
SELECT
  u.id,
  u.type,
  u.status,
  u.description,
  u.requested_bonus,
  u.paid_bonus,
  u.session_id,
  s.campaign_id
FROM ugcs u
JOIN sessions s ON u.session_id = s.id
LIMIT 10;

-- IMPORTANT NOTES:
-- 1. After verifying the migration is successful, you should:
--    - Backup the old data
--    - Drop the old UGC JSON columns from sessions table
--    - Update the application code to use the new UGC table
--
-- 2. To drop old columns (run separately after verification):
--    ALTER TABLE sessions DROP COLUMN IF EXISTS ugc_requests;
--    ALTER TABLE sessions DROP COLUMN IF EXISTS ugc_requested_at;
--    ALTER TABLE sessions DROP COLUMN IF EXISTS potential_ugc_bonus;
--    ALTER TABLE sessions DROP COLUMN IF EXISTS ugc_submissions;
--    ALTER TABLE sessions DROP COLUMN IF EXISTS ugc_submitted_at;
--    ALTER TABLE sessions DROP COLUMN IF EXISTS ugc_submission_message;
--    ALTER TABLE sessions DROP COLUMN IF EXISTS ugc_validated;
--    ALTER TABLE sessions DROP COLUMN IF EXISTS ugc_validation_comment;
--    ALTER TABLE sessions DROP COLUMN IF EXISTS ugc_validated_at;
--    ALTER TABLE sessions DROP COLUMN IF EXISTS ugc_rejection_reason;
--    ALTER TABLE sessions DROP COLUMN IF EXISTS ugc_rejected_at;
--    ALTER TABLE sessions DROP COLUMN IF EXISTS ugc_declined;
--    ALTER TABLE sessions DROP COLUMN IF EXISTS ugc_decline_reason;
--    ALTER TABLE sessions DROP COLUMN IF EXISTS ugc_declined_at;
--    ALTER TABLE sessions DROP COLUMN IF EXISTS final_ugc_bonus;
--    ALTER TABLE sessions DROP COLUMN IF EXISTS closing_message;
--
-- 3. Update Prisma schema to remove these fields from Session model
