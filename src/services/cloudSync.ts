/**
 * Cloud Sync Service
 *
 * Synchronizes user data (word bank, reading history, progress, quiz history)
 * with Supabase cloud database. Provides CRUD operations for all user data tables.
 *
 * Tables:
 * - profiles: user profile (display_name, avatar_url, current_level)
 * - word_bank: vocabulary entries with mastery tracking
 * - reading_history: articles the user has read
 * - user_progress: learning stats (streak, words learned, etc.)
 * - quiz_history: quiz session records
 */

import { supabase } from '../utils/supabase';
import type {
  WordBankEntry,
  UserProgress,
  DifficultyLevel,
  ContentSource,
} from '../types';

// ============================================================
// Types for database rows
// ============================================================

export interface DbProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  current_level: DifficultyLevel;
  selected_source: ContentSource;
  daily_goal: number;
  created_at: string;
  updated_at: string;
}

export interface DbWordBankEntry {
  id: string;
  user_id: string;
  word: string;
  word_data: Record<string, unknown>; // full VocabularyWord JSON
  context_sentence: string;
  mastery_level: number;
  review_count: number;
  added_at: string;
  last_reviewed_at?: string;
}

export interface DbReadingHistory {
  id: string;
  user_id: string;
  article_id: string;
  article_title: string;
  content_source: ContentSource;
  read_at: string;
}

export interface DbUserProgress {
  user_id: string;
  daily_streak: number;
  total_words_learned: number;
  total_articles_read: number;
  current_level: DifficultyLevel;
  last_active_date: string;
  quiz_points: number;
  achievements: Record<string, unknown>[];
  updated_at: string;
}

export interface DbQuizHistory {
  id: string;
  user_id: string;
  article_id: string;
  total_questions: number;
  correct_answers: number;
  accuracy: number;
  points_earned: number;
  completed_at: string;
}

// ============================================================
// Profile Operations
// ============================================================

export async function getProfile(userId: string): Promise<DbProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data;
}

export async function upsertProfile(profile: Partial<DbProfile> & { id: string }) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ ...profile, updated_at: new Date().toISOString() });

  if (error) throw error;
}

// ============================================================
// Word Bank Operations
// ============================================================

export async function getWordBank(userId: string): Promise<DbWordBankEntry[]> {
  const { data, error } = await supabase
    .from('word_bank')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function addWordToBank(userId: string, entry: WordBankEntry) {
  const row: Omit<DbWordBankEntry, 'id'> = {
    user_id: userId,
    word: entry.word.word,
    word_data: entry.word as unknown as Record<string, unknown>,
    context_sentence: entry.word.sourceSentence ?? '',
    mastery_level: entry.masteryLevel,
    review_count: entry.reviewCount,
    added_at: entry.addedAt instanceof Date ? entry.addedAt.toISOString() : String(entry.addedAt),
    last_reviewed_at: entry.lastReviewedAt
      ? entry.lastReviewedAt instanceof Date
        ? entry.lastReviewedAt.toISOString()
        : String(entry.lastReviewedAt)
      : undefined,
  };

  const { error } = await supabase.from('word_bank').insert(row);
  if (error) throw error;
}

export async function updateWordMastery(
  userId: string,
  word: string,
  masteryLevel: number,
  reviewCount: number
) {
  const { error } = await supabase
    .from('word_bank')
    .update({
      mastery_level: masteryLevel,
      review_count: reviewCount,
      last_reviewed_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('word', word);

  if (error) throw error;
}

// ============================================================
// Reading History Operations
// ============================================================

export async function getReadingHistory(userId: string): Promise<DbReadingHistory[]> {
  const { data, error } = await supabase
    .from('reading_history')
    .select('*')
    .eq('user_id', userId)
    .order('read_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function addReadingRecord(
  userId: string,
  articleId: string,
  articleTitle: string,
  contentSource: ContentSource
) {
  const { error } = await supabase.from('reading_history').insert({
    user_id: userId,
    article_id: articleId,
    article_title: articleTitle,
    content_source: contentSource,
    read_at: new Date().toISOString(),
  });

  if (error) throw error;
}

// ============================================================
// User Progress Operations
// ============================================================

export async function getUserProgress(userId: string): Promise<DbUserProgress | null> {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return data;
}

export async function upsertUserProgress(userId: string, progress: Partial<UserProgress>) {
  const row: Partial<DbUserProgress> & { user_id: string } = {
    user_id: userId,
    daily_streak: progress.dailyStreak,
    total_words_learned: progress.totalWordsLearned,
    total_articles_read: progress.totalArticlesRead,
    current_level: progress.currentLevel,
    last_active_date: progress.lastActiveDate
      ? progress.lastActiveDate instanceof Date
        ? progress.lastActiveDate.toISOString()
        : String(progress.lastActiveDate)
      : new Date().toISOString(),
    quiz_points: progress.quizPoints,
    achievements: (progress.achievements ?? []) as unknown as Record<string, unknown>[],
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('user_progress').upsert(row);
  if (error) throw error;
}

// ============================================================
// Quiz History Operations
// ============================================================

export async function getQuizHistory(userId: string): Promise<DbQuizHistory[]> {
  const { data, error } = await supabase
    .from('quiz_history')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function addQuizRecord(
  userId: string,
  articleId: string,
  totalQuestions: number,
  correctAnswers: number,
  pointsEarned: number
) {
  const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;

  const { error } = await supabase.from('quiz_history').insert({
    user_id: userId,
    article_id: articleId,
    total_questions: totalQuestions,
    correct_answers: correctAnswers,
    accuracy,
    points_earned: pointsEarned,
    completed_at: new Date().toISOString(),
  });

  if (error) throw error;
}
