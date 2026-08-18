-- ================================================
-- Library Games - Supabase Database Schema
-- PostgreSQL Schema for Leaderboards + Visitor Logbook
--
-- HOW TO APPLY UPDATES:
-- Run this entire file in the Supabase SQL Editor.
-- All statements use IF NOT EXISTS / CREATE OR REPLACE
-- so it is safe to re-run at any time.
-- ================================================

-- Create leaderboards table
CREATE TABLE IF NOT EXISTS leaderboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_type VARCHAR(50) NOT NULL,
  game_mode VARCHAR(20) NOT NULL,
  player_name VARCHAR(50) DEFAULT 'Anonymous',
  score INTEGER NOT NULL,
  time_taken INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  date_played DATE DEFAULT CURRENT_DATE
);

-- Add comments for documentation
COMMENT ON TABLE leaderboards IS 'Stores game scores and leaderboard data';
COMMENT ON COLUMN leaderboards.game_type IS 'Type of game: wordle, spelling_bee, word_ladder, trivia, flashcards, wikipedia_race';
COMMENT ON COLUMN leaderboards.game_mode IS 'Game mode: daily or random';
COMMENT ON COLUMN leaderboards.player_name IS 'Player display name, defaults to Anonymous';
COMMENT ON COLUMN leaderboards.score IS 'Game score (interpretation varies by game)';
COMMENT ON COLUMN leaderboards.time_taken IS 'Time taken in seconds (optional)';
COMMENT ON COLUMN leaderboards.date_played IS 'Date when game was played';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_type ON leaderboards(game_type);
CREATE INDEX IF NOT EXISTS idx_game_mode ON leaderboards(game_mode);
CREATE INDEX IF NOT EXISTS idx_created_at ON leaderboards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_date_played ON leaderboards(date_played DESC);
CREATE INDEX IF NOT EXISTS idx_score ON leaderboards(score DESC);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_game_type_mode_score 
  ON leaderboards(game_type, game_mode, score DESC, time_taken ASC);

-- ================================================
-- Unique constraint: one best score per player per game per mode per day
-- ON CONFLICT will update the score only if the new score is HIGHER
-- ================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_best_score
  ON leaderboards(game_type, game_mode, player_name, date_played);

-- Function used by upsert: only update when new score beats old score
CREATE OR REPLACE FUNCTION leaderboards_keep_best()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- If a row already exists with a higher or equal score, keep it unchanged
  IF EXISTS (
    SELECT 1 FROM leaderboards
    WHERE game_type   = NEW.game_type
      AND game_mode   = NEW.game_mode
      AND player_name = NEW.player_name
      AND date_played = NEW.date_played
      AND score       >= NEW.score
  ) THEN
    RETURN NULL; -- skip the insert/update
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_keep_best_score ON leaderboards;
CREATE TRIGGER trg_keep_best_score
  BEFORE INSERT OR UPDATE ON leaderboards
  FOR EACH ROW EXECUTE FUNCTION leaderboards_keep_best();

-- ================================================
-- Views for Common Queries
-- ================================================

-- View for daily leaderboards (today's scores)
CREATE OR REPLACE VIEW daily_leaderboards AS
SELECT 
  *,
  ROW_NUMBER() OVER (
    PARTITION BY game_type, game_mode 
    ORDER BY score DESC, time_taken ASC NULLS LAST, created_at ASC
  ) as daily_rank
FROM leaderboards
WHERE date_played = CURRENT_DATE
ORDER BY game_type, game_mode, score DESC, time_taken ASC;

COMMENT ON VIEW daily_leaderboards IS 'Today''s leaderboard with rankings';

-- View for weekly leaderboards (past 7 days)
CREATE OR REPLACE VIEW weekly_leaderboards AS
SELECT 
  *,
  ROW_NUMBER() OVER (
    PARTITION BY game_type, game_mode 
    ORDER BY score DESC, time_taken ASC NULLS LAST, created_at ASC
  ) as weekly_rank
FROM leaderboards
WHERE date_played >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY game_type, game_mode, score DESC, time_taken ASC;

COMMENT ON VIEW weekly_leaderboards IS 'Past 7 days leaderboard with rankings';

-- View for all-time leaderboards
CREATE OR REPLACE VIEW alltime_leaderboards AS
SELECT 
  *,
  ROW_NUMBER() OVER (
    PARTITION BY game_type, game_mode 
    ORDER BY score DESC, time_taken ASC NULLS LAST, created_at ASC
  ) as alltime_rank
FROM leaderboards
ORDER BY game_type, game_mode, score DESC, time_taken ASC;

COMMENT ON VIEW alltime_leaderboards IS 'All-time leaderboard with rankings';

-- View: best score per player per game (deduplicates multiple submissions)
CREATE OR REPLACE VIEW leaderboards_best AS
SELECT DISTINCT ON (game_type, game_mode, player_name)
  id, game_type, game_mode, player_name, score, time_taken, created_at, date_played
FROM leaderboards
ORDER BY game_type, game_mode, player_name, score DESC, time_taken ASC NULLS LAST;

COMMENT ON VIEW leaderboards_best IS 'One row per player per game — their best score only';

-- ================================================
-- Row Level Security (RLS) Policies
-- ================================================

-- Enable RLS
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view leaderboards (public read)
DO $$ BEGIN
  CREATE POLICY "Allow public read access" ON leaderboards FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow anyone to insert scores (public write)
DO $$ BEGIN
  CREATE POLICY "Allow public insert" ON leaderboards FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Prevent updates and deletes from public
DO $$ BEGIN
  CREATE POLICY "Prevent public updates" ON leaderboards FOR UPDATE USING (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Prevent public deletes" ON leaderboards FOR DELETE USING (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ================================================
-- Functions
-- ================================================

-- Health check function for keep-alive
CREATE OR REPLACE FUNCTION health_check()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'OK';
END;
$$;

COMMENT ON FUNCTION health_check IS 'Simple health check for database keep-alive';

-- Function to get player rank
CREATE OR REPLACE FUNCTION get_player_rank(
  p_game_type VARCHAR(50),
  p_game_mode VARCHAR(20),
  p_score INTEGER,
  p_time_taken INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  rank_position INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO rank_position
  FROM leaderboards
  WHERE game_type = p_game_type
    AND game_mode = p_game_mode
    AND (
      score > p_score
      OR (score = p_score AND time_taken < COALESCE(p_time_taken, 999999))
    );
  
  RETURN rank_position;
END;
$$;

COMMENT ON FUNCTION get_player_rank IS 'Calculate player rank for a given score';

-- Function to get leaderboard statistics
CREATE OR REPLACE FUNCTION get_leaderboard_stats(
  p_game_type VARCHAR(50),
  p_game_mode VARCHAR(20)
)
RETURNS TABLE (
  total_entries BIGINT,
  today_entries BIGINT,
  top_score INTEGER,
  top_player VARCHAR(50),
  avg_score NUMERIC,
  unique_players BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE date_played = CURRENT_DATE) as today_entries,
    MAX(score) as top_score,
    (SELECT player_name FROM leaderboards 
     WHERE game_type = p_game_type AND game_mode = p_game_mode 
     ORDER BY score DESC, time_taken ASC NULLS LAST LIMIT 1) as top_player,
    ROUND(AVG(score), 2) as avg_score,
    COUNT(DISTINCT player_name) as unique_players
  FROM leaderboards
  WHERE game_type = p_game_type
    AND game_mode = p_game_mode;
END;
$$;

COMMENT ON FUNCTION get_leaderboard_stats IS 'Get comprehensive leaderboard statistics';

-- ================================================
-- Triggers (Optional - for data validation)
-- ================================================

-- Trigger to validate game types
CREATE OR REPLACE FUNCTION validate_game_type()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.game_type NOT IN (
    'wordle', 
    'spelling_bee', 
    'word_ladder', 
    'trivia', 
    'flashcards', 
    'wikipedia_race'
  ) THEN
    RAISE EXCEPTION 'Invalid game_type: %', NEW.game_type;
  END IF;
  
  IF NEW.game_mode NOT IN ('daily', 'random') THEN
    RAISE EXCEPTION 'Invalid game_mode: %', NEW.game_mode;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_game_type
  BEFORE INSERT OR UPDATE ON leaderboards
  FOR EACH ROW
  EXECUTE FUNCTION validate_game_type();

COMMENT ON TRIGGER trg_validate_game_type ON leaderboards IS 'Validates game_type and game_mode values';

-- ================================================
-- Sample Data (Optional - for testing)
-- ================================================

-- Uncomment to insert sample data
/*
INSERT INTO leaderboards (game_type, game_mode, player_name, score, time_taken) VALUES
  ('wordle', 'daily', 'Alice', 3, 45),
  ('wordle', 'daily', 'Bob', 4, 60),
  ('wordle', 'daily', 'Charlie', 5, 120),
  ('wordle', 'random', 'Alice', 2, 30),
  ('spelling_bee', 'daily', 'Alice', 150, 300),
  ('spelling_bee', 'daily', 'Bob', 120, 240),
  ('word_ladder', 'daily', 'Charlie', 4, 90),
  ('trivia', 'daily', 'Alice', 850, 180),
  ('wikipedia_race', 'daily', 'Bob', 5, 120);
*/

-- ================================================
-- Verification Queries
-- ================================================

-- Check table structure
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'leaderboards';

-- Check indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'leaderboards';

-- Check RLS policies
-- SELECT * FROM pg_policies WHERE tablename = 'leaderboards';

-- Test health check
-- SELECT health_check();

-- Test leaderboard query
-- SELECT * FROM daily_leaderboards WHERE game_type = 'wordle' LIMIT 10;

-- ================================================
-- Maintenance
-- ================================================

-- Query to clean up old entries (run periodically if needed)
-- DELETE FROM leaderboards 
-- WHERE date_played < CURRENT_DATE - INTERVAL '1 year';

-- Query to get database size
-- SELECT pg_size_pretty(pg_database_size(current_database()));

-- Query to get table size
-- SELECT pg_size_pretty(pg_total_relation_size('leaderboards'));

-- ================================================
-- Visitor Logbook Table
-- ================================================

CREATE TABLE IF NOT EXISTS visitor_logbook (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(40) NOT NULL DEFAULT 'Anonymous',
  message     VARCHAR(280) NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_posted DATE DEFAULT CURRENT_DATE
);

COMMENT ON TABLE visitor_logbook IS 'Public guestbook — anyone can leave a message';
COMMENT ON COLUMN visitor_logbook.name IS 'Display name, max 40 chars';
COMMENT ON COLUMN visitor_logbook.message IS 'Visitor message, max 280 chars';

-- Index for chronological fetch
CREATE INDEX IF NOT EXISTS idx_logbook_created_at ON visitor_logbook(created_at DESC);

-- RLS
ALTER TABLE visitor_logbook ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Logbook public read" ON visitor_logbook FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Logbook public insert" ON visitor_logbook
    FOR INSERT WITH CHECK (char_length(name) BETWEEN 1 AND 40 AND char_length(message) BETWEEN 1 AND 280);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Logbook no update" ON visitor_logbook FOR UPDATE USING (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Logbook no delete" ON visitor_logbook FOR DELETE USING (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ================================================
-- Setup Complete
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Library Games Database Schema Created!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables: leaderboards, visitor_logbook';
  RAISE NOTICE 'Views: daily_leaderboards, weekly_leaderboards, alltime_leaderboards';
  RAISE NOTICE 'Functions: health_check, get_player_rank, get_leaderboard_stats';
  RAISE NOTICE 'RLS: Enabled with public read/insert policies';
  RAISE NOTICE '========================================';
END $$;
