-- ══════════════════════════════════════════════════════════════
-- GEOSCOPE — Supabase Schema
-- Run this in the Supabase SQL Editor to set up your tables
-- ══════════════════════════════════════════════════════════════

-- Countries table: stores all geopolitical data per country
CREATE TABLE IF NOT EXISTS countries (
  id SERIAL PRIMARY KEY,
  numeric_id INTEGER UNIQUE NOT NULL,     -- TopoJSON numeric ID
  name TEXT NOT NULL,
  iso3 TEXT,
  region TEXT NOT NULL DEFAULT 'Other',
  stability INTEGER NOT NULL DEFAULT 2,   -- 0=Very Stable, 1=Stable, 2=Moderate, 3=Unstable, 4=Critical
  conflict INTEGER NOT NULL DEFAULT 0,    -- 0=Peaceful, 1=Low, 2=Moderate, 3=High, 4=Critical
  freedom INTEGER DEFAULT NULL,           -- 0-100 Freedom House style
  gdp DOUBLE PRECISION DEFAULT NULL,      -- Current USD
  population BIGINT DEFAULT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Briefings table: cached AI briefings per country
CREATE TABLE IF NOT EXISTS briefings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country_id INTEGER REFERENCES countries(numeric_id),
  country_name TEXT NOT NULL,
  headline TEXT,
  stability TEXT,
  government_type TEXT,
  leader TEXT,
  population TEXT,
  gdp TEXT,
  key_facts JSONB DEFAULT '[]'::jsonb,
  recent_news JSONB DEFAULT '[]'::jsonb,
  analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watchlist: user bookmarked countries
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  country_id INTEGER REFERENCES countries(numeric_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, country_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_countries_numeric ON countries(numeric_id);
CREATE INDEX IF NOT EXISTS idx_briefings_country ON briefings(country_id);
CREATE INDEX IF NOT EXISTS idx_briefings_created ON briefings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);

-- Row Level Security (RLS)
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- Public read access for countries and briefings
CREATE POLICY "Public read countries" ON countries FOR SELECT USING (true);
CREATE POLICY "Public read briefings" ON briefings FOR SELECT USING (true);
CREATE POLICY "Service insert briefings" ON briefings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read watchlist" ON watchlist FOR SELECT USING (true);
CREATE POLICY "Public insert watchlist" ON watchlist FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete watchlist" ON watchlist FOR DELETE USING (true);
