-- Database Initialization Script for CDX 2026
-- Required for Supabase SQL Editor

-- Create Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'User',
  app_pass TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Material configuration
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  unit TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cost tracking
CREATE TABLE IF NOT EXISTS costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  content TEXT,
  total_amount NUMERIC NOT NULL,
  cost_type TEXT DEFAULT 'Chi phí',
  created_at TIMESTAMPTZ DEFAULT now()
);
