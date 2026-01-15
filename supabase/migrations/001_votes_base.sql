-- Base Votes Schema
-- This is the original schema - may already be applied in your Supabase instance
-- Run this ONLY if the votes table doesn't exist yet

-- Table: votes
-- Stores weekly deputy investigation priority votes
CREATE TABLE IF NOT EXISTS votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deputy_id INTEGER NOT NULL,
  deputy_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  week_number TEXT NOT NULL,  -- ISO week format: "2026-W02"
  voted_at TIMESTAMPTZ DEFAULT NOW(),

  -- Original constraint: one vote per user per week
  -- (This will be replaced by 003_multi_vote_support.sql)
  UNIQUE(user_email, week_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_votes_week ON votes(week_number);
CREATE INDEX IF NOT EXISTS idx_votes_deputy ON votes(deputy_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_email);

-- View: vote_leaderboard
-- Aggregated vote counts for current week
CREATE OR REPLACE VIEW vote_leaderboard AS
SELECT
  deputy_id,
  deputy_name,
  COUNT(*) as vote_count,
  COUNT(DISTINCT user_email) as unique_voters
FROM votes
WHERE week_number = (
  SELECT MAX(week_number) FROM votes
)
GROUP BY deputy_id, deputy_name
ORDER BY vote_count DESC;

-- RLS (Row Level Security)
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read votes (for leaderboard)
CREATE POLICY "Anyone can read votes"
  ON votes FOR SELECT
  USING (true);

-- Authenticated users can insert their own votes
CREATE POLICY "Authenticated users can vote"
  ON votes FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = user_email);

-- Grant access
GRANT SELECT ON vote_leaderboard TO anon, authenticated;

-- Comments
COMMENT ON TABLE votes IS 'Weekly deputy investigation priority votes';
COMMENT ON VIEW vote_leaderboard IS 'Current week vote counts per deputy';
