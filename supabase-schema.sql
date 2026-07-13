-- ============================================================
-- Supabase Schema for English Learning News
-- 
-- Run this SQL in your Supabase project's SQL Editor:
-- https://supabase.com/dashboard → Your Project → SQL Editor → New query
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. Profiles Table (extends Supabase auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  display_name text not null default '',
  avatar_url text,
  current_level text not null default 'intermediate' check (current_level in ('beginner', 'intermediate', 'advanced')),
  selected_source text not null default 'current-affairs' check (selected_source in ('current-affairs', 'senior-high', 'junior-high', 'junior-senior-mixed', 'elementary')),
  daily_goal integer not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Users can only read/update their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile on new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. Word Bank Table
-- ============================================================
create table if not exists public.word_bank (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  word text not null,
  word_data jsonb not null default '{}',
  context_sentence text not null default '',
  mastery_level integer not null default 0,
  review_count integer not null default 0,
  added_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  
  -- Prevent duplicate words per user
  unique(user_id, word)
);

alter table public.word_bank enable row level security;

create policy "Users can view own word bank" on public.word_bank
  for select using (auth.uid() = user_id);

create policy "Users can insert own words" on public.word_bank
  for insert with check (auth.uid() = user_id);

create policy "Users can update own words" on public.word_bank
  for update using (auth.uid() = user_id);

create policy "Users can delete own words" on public.word_bank
  for delete using (auth.uid() = user_id);

-- Index for fast lookups
create index if not exists idx_word_bank_user on public.word_bank(user_id);
create index if not exists idx_word_bank_mastery on public.word_bank(user_id, mastery_level);

-- ============================================================
-- 3. Reading History Table
-- ============================================================
create table if not exists public.reading_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  article_id text not null,
  article_title text not null default '',
  content_source text not null default 'current-affairs',
  read_at timestamptz not null default now(),
  
  -- Prevent duplicate entries for same article
  unique(user_id, article_id)
);

alter table public.reading_history enable row level security;

create policy "Users can view own reading history" on public.reading_history
  for select using (auth.uid() = user_id);

create policy "Users can insert own reading records" on public.reading_history
  for insert with check (auth.uid() = user_id);

create index if not exists idx_reading_history_user on public.reading_history(user_id);

-- ============================================================
-- 4. User Progress Table
-- ============================================================
create table if not exists public.user_progress (
  user_id uuid references auth.users(id) on delete cascade primary key,
  daily_streak integer not null default 0,
  total_words_learned integer not null default 0,
  total_articles_read integer not null default 0,
  current_level text not null default 'intermediate',
  last_active_date timestamptz not null default now(),
  quiz_points integer not null default 0,
  achievements jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

alter table public.user_progress enable row level security;

create policy "Users can view own progress" on public.user_progress
  for select using (auth.uid() = user_id);

create policy "Users can upsert own progress" on public.user_progress
  for insert with check (auth.uid() = user_id);

create policy "Users can update own progress" on public.user_progress
  for update using (auth.uid() = user_id);

-- ============================================================
-- 5. Quiz History Table
-- ============================================================
create table if not exists public.quiz_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  article_id text not null,
  total_questions integer not null default 0,
  correct_answers integer not null default 0,
  accuracy real not null default 0,
  points_earned integer not null default 0,
  completed_at timestamptz not null default now()
);

alter table public.quiz_history enable row level security;

create policy "Users can view own quiz history" on public.quiz_history
  for select using (auth.uid() = user_id);

create policy "Users can insert own quiz records" on public.quiz_history
  for insert with check (auth.uid() = user_id);

create index if not exists idx_quiz_history_user on public.quiz_history(user_id);
create index if not exists idx_quiz_history_date on public.quiz_history(user_id, completed_at);
