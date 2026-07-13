-- ============================================================
-- Articles Table for real content (crawled from news sources)
-- Run this in Supabase SQL Editor
-- ============================================================

create table if not exists public.articles (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  summary text not null default '',
  content text not null,
  source_name text not null default '',
  source_url text,
  content_source text not null default 'current-affairs' 
    check (content_source in ('current-affairs', 'senior-high', 'junior-high', 'junior-senior-mixed', 'elementary')),
  difficulty text not null default 'intermediate'
    check (difficulty in ('beginner', 'intermediate', 'advanced')),
  image_url text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Allow public read access (no auth required for reading articles)
alter table public.articles enable row level security;

create policy "Anyone can read articles" on public.articles
  for select using (true);

-- Only authenticated users with service role can insert (for crawler)
create policy "Service role can insert articles" on public.articles
  for insert with check (true);

create policy "Service role can update articles" on public.articles
  for update using (true);

-- Indexes for fast querying
create index if not exists idx_articles_source on public.articles(content_source);
create index if not exists idx_articles_published on public.articles(published_at desc);
create index if not exists idx_articles_difficulty on public.articles(difficulty);
