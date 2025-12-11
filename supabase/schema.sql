-- =============================================
-- AI Trivia Game Show - Database Schema
-- =============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- Table: sessions
-- Stores game session data including player names,
-- scores, current round/question state
-- =============================================
CREATE TABLE public.sessions (
  id TEXT PRIMARY KEY,                          -- Unique session ID (8 chars)
  p1_name TEXT,                                 -- Player 1 name
  p2_name TEXT,                                 -- Player 2 name
  round_name TEXT,                              -- Current round (e.g., "Round 1: Movies")
  q_number INTEGER DEFAULT 0,                   -- Current question number (0-6)
  q_text TEXT,                                  -- Current question text
  p1_score INTEGER DEFAULT 0,                   -- Player 1 cumulative score
  p2_score INTEGER DEFAULT 0,                   -- Player 2 cumulative score
  p1_round1_score INTEGER DEFAULT 0,            -- Player 1 Round 1 score
  p1_round2_score INTEGER DEFAULT 0,            -- Player 1 Round 2 score
  p1_round3_score INTEGER DEFAULT 0,            -- Player 1 Round 3 score
  p2_round1_score INTEGER DEFAULT 0,            -- Player 2 Round 1 score
  p2_round2_score INTEGER DEFAULT 0,            -- Player 2 Round 2 score
  p2_round3_score INTEGER DEFAULT 0,            -- Player 2 Round 3 score
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Table: session_media
-- Stores image URLs fetched from Unsplash for Round 3
-- =============================================
CREATE TABLE public.session_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,                      -- URL to image from Unsplash
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Row Level Security (RLS) Policies
-- Game is publicly accessible - all operations allowed
-- =============================================

-- Enable RLS on sessions table
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Allow public SELECT on sessions
CREATE POLICY "Allow public select on sessions"
  ON public.sessions
  FOR SELECT
  TO public
  USING (true);

-- Allow public INSERT on sessions
CREATE POLICY "Allow public insert on sessions"
  ON public.sessions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public UPDATE on sessions
CREATE POLICY "Allow public update on sessions"
  ON public.sessions
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Enable RLS on session_media table
ALTER TABLE public.session_media ENABLE ROW LEVEL SECURITY;

-- Allow public SELECT on session_media
CREATE POLICY "Allow public select on session_media"
  ON public.session_media
  FOR SELECT
  TO public
  USING (true);

-- Allow public INSERT on session_media
CREATE POLICY "Allow public insert on session_media"
  ON public.session_media
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public UPDATE on session_media
CREATE POLICY "Allow public update on session_media"
  ON public.session_media
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- =============================================
-- Enable Realtime
-- Both tables need realtime for live game updates
-- =============================================

-- Note: Run these commands in Supabase SQL Editor or Dashboard
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.session_media;

-- =============================================
-- Indexes for performance
-- =============================================
CREATE INDEX idx_session_media_session_id ON public.session_media(session_id);
CREATE INDEX idx_sessions_created_at ON public.sessions(created_at DESC);
