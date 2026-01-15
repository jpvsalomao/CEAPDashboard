-- Multi-Vote Support Migration
-- Allows users to vote for up to 3 deputies per week instead of 1
-- Run this in Supabase SQL Editor

-- Step 1: Add selection_order column
-- Values: 1, 2, or 3 (user's 1st, 2nd, 3rd pick)
ALTER TABLE votes ADD COLUMN IF NOT EXISTS selection_order INTEGER DEFAULT 1;

-- Step 2: Add constraint for valid selection order
ALTER TABLE votes ADD CONSTRAINT valid_selection_order
  CHECK (selection_order >= 1 AND selection_order <= 3);

-- Step 3: Drop the old unique constraint (1 vote per week)
-- Note: The constraint name might vary - check your database
-- You may need to find the actual constraint name with:
-- SELECT constraint_name FROM information_schema.table_constraints
-- WHERE table_name = 'votes' AND constraint_type = 'UNIQUE';
DO $$
BEGIN
  -- Try common constraint names
  BEGIN
    ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_user_email_week_number_key;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;
  BEGIN
    ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_user_week_unique;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;
END $$;

-- Step 4: Add new unique constraint (3 votes per week, one per slot)
ALTER TABLE votes ADD CONSTRAINT votes_user_week_order_unique
  UNIQUE (user_email, week_number, selection_order);

-- Step 5: Add constraint to prevent duplicate deputy votes in same week
-- (user can't vote for same deputy twice in one week)
ALTER TABLE votes ADD CONSTRAINT votes_user_week_deputy_unique
  UNIQUE (user_email, week_number, deputy_id);

-- Step 6: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_votes_user_week ON votes(user_email, week_number);

-- Step 7: Update the leaderboard view to count all votes correctly
CREATE OR REPLACE VIEW vote_leaderboard AS
SELECT
  deputy_id,
  deputy_name,
  COUNT(*) as vote_count,
  COUNT(DISTINCT user_email) as unique_voters,
  RANK() OVER (ORDER BY COUNT(*) DESC) as position
FROM votes
WHERE week_number = (
  SELECT MAX(week_number) FROM votes
)
GROUP BY deputy_id, deputy_name
ORDER BY vote_count DESC;

-- Step 8: Create a view to get user's current week votes
CREATE OR REPLACE VIEW user_weekly_votes AS
SELECT
  user_email,
  week_number,
  array_agg(
    json_build_object(
      'deputy_id', deputy_id,
      'deputy_name', deputy_name,
      'selection_order', selection_order
    ) ORDER BY selection_order
  ) as selections,
  COUNT(*) as vote_count
FROM votes
GROUP BY user_email, week_number;

-- Grant access
GRANT SELECT ON vote_leaderboard TO anon, authenticated;
GRANT SELECT ON user_weekly_votes TO authenticated;

-- Comments for documentation
COMMENT ON COLUMN votes.selection_order IS 'User selection order: 1 (first pick), 2 (second), or 3 (third)';
COMMENT ON VIEW user_weekly_votes IS 'Aggregated view of user weekly votes with all selections';
