-- ============================================================
-- Phrase Bank Table for saving user's phrases/collocations
-- Run this in Supabase SQL Editor
-- ============================================================

create table if not exists public.phrase_bank (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  phrase text not null,
  translation text,
  added_at timestamptz not null default now(),

  -- Prevent duplicate phrases per user
  unique(user_id, phrase)
);

alter table public.phrase_bank enable row level security;

create policy "Users can view own phrases" on public.phrase_bank
  for select using (auth.uid() = user_id);

create policy "Users can insert own phrases" on public.phrase_bank
  for insert with check (auth.uid() = user_id);

create policy "Users can update own phrases" on public.phrase_bank
  for update using (auth.uid() = user_id);

create policy "Users can delete own phrases" on public.phrase_bank
  for delete using (auth.uid() = user_id);

create index if not exists idx_phrase_bank_user on public.phrase_bank(user_id);
