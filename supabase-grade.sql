-- ============================================================
-- Add grade column to articles table for grade-level filtering
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS grade text;

-- Create index for fast grade-based queries
CREATE INDEX IF NOT EXISTS idx_articles_grade ON public.articles(grade);

-- Also add grade to user_articles for consistency
ALTER TABLE public.user_articles ADD COLUMN IF NOT EXISTS grade text;
