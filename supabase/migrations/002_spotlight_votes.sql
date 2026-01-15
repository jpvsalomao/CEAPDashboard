-- Spotlight Votes Schema
-- Run this in Supabase SQL Editor after 001_votes.sql (if not already applied)

-- Table: spotlight_votes
-- Stores individual votes on spotlight debate pages
CREATE TABLE IF NOT EXISTS spotlight_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL,                           -- Spotlight page slug (e.g., 'eduardo-bolsonaro')
  user_email TEXT NOT NULL,                     -- Google OAuth email
  vote_option TEXT NOT NULL CHECK (vote_option IN ('investigar', 'inconclusivo')),
  voted_at TIMESTAMPTZ DEFAULT NOW(),

  -- One vote per user per spotlight
  UNIQUE(slug, user_email)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_spotlight_votes_slug ON spotlight_votes(slug);
CREATE INDEX IF NOT EXISTS idx_spotlight_votes_user ON spotlight_votes(user_email);

-- View: spotlight_vote_counts
-- Aggregated vote counts per spotlight page
CREATE OR REPLACE VIEW spotlight_vote_counts AS
SELECT
  slug,
  COUNT(*) FILTER (WHERE vote_option = 'investigar') AS investigar_count,
  COUNT(*) FILTER (WHERE vote_option = 'inconclusivo') AS inconclusivo_count,
  COUNT(*) AS total_votes
FROM spotlight_votes
GROUP BY slug;

-- RLS (Row Level Security) Policies
ALTER TABLE spotlight_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read vote counts (for displaying results)
CREATE POLICY "Anyone can read spotlight votes"
  ON spotlight_votes FOR SELECT
  USING (true);

-- Authenticated users can insert their own votes
CREATE POLICY "Authenticated users can vote"
  ON spotlight_votes FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = user_email);

-- Users can update their own vote (change opinion)
CREATE POLICY "Users can update own vote"
  ON spotlight_votes FOR UPDATE
  USING (auth.jwt() ->> 'email' = user_email);

-- Grant access to the view
GRANT SELECT ON spotlight_vote_counts TO anon, authenticated;

-- Comment for documentation
COMMENT ON TABLE spotlight_votes IS 'Stores user votes on spotlight debate pages (investigar vs inconclusivo)';
COMMENT ON VIEW spotlight_vote_counts IS 'Aggregated vote counts per spotlight page for display';
