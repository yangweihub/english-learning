/**
 * Progress Manager Service
 *
 * Implements the ProgressManager interface for tracking user learning progress,
 * calculating daily streaks, recommending articles, checking achievements,
 * and identifying words due for review.
 *
 * Reads/writes user progress from LocalStorage via storage utilities.
 * Delegates to the word bank (IndexedDB) for pending reviews.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import type {
  UserProgress,
  LearningSession,
  Achievement,
  NewsArticle,
  DifficultyLevel,
  WordBankEntry,
} from '../types';
import { storageGet, storageSet } from '../utils/storage';
import { getAll, STORE_NAMES } from '../utils/db';

// ============================================================
// ProgressManager Interface
// ============================================================

export interface ProgressManager {
  getUserProgress(): UserProgress;
  updateSessionStats(session: LearningSession): void;
  calculateDailyStreak(): number;
  getRecommendedArticles(progress: UserProgress, articles: NewsArticle[]): NewsArticle[];
  checkAchievements(progress: UserProgress): Achievement[];
  getPendingReviews(): Promise<WordBankEntry[]>;
}

// ============================================================
// Constants
// ============================================================

const DEFAULT_PROGRESS: UserProgress = {
  userId: 'local-user',
  dailyStreak: 0,
  totalWordsLearned: 0,
  totalArticlesRead: 0,
  currentLevel: 'intermediate',
  lastActiveDate: new Date(),
  quizPoints: 0,
  achievements: [],
  readingHistory: [],
};

/**
 * Number of hours after which a word is due for review.
 * Uses a simple spaced repetition: words reviewed fewer times are due sooner.
 */
const REVIEW_INTERVAL_HOURS_BASE = 24;

/**
 * Adjacent difficulty levels for article recommendations.
 * Users can see articles at their level or one level away.
 */
const ADJACENT_LEVELS: Record<DifficultyLevel, DifficultyLevel[]> = {
  beginner: ['beginner', 'intermediate'],
  intermediate: ['beginner', 'intermediate', 'advanced'],
  advanced: ['intermediate', 'advanced'],
};

// ============================================================
// Achievement Milestone Definitions
// ============================================================

interface AchievementMilestone {
  id: string;
  title: string;
  description: string;
  type: Achievement['type'];
  check: (progress: UserProgress) => boolean;
}

const ACHIEVEMENT_MILESTONES: AchievementMilestone[] = [
  // Streak achievements
  { id: 'streak-3', title: '三日坚持', description: '连续学习3天', type: 'streak', check: (p) => p.dailyStreak >= 3 },
  { id: 'streak-7', title: '一周坚持', description: '连续学习7天', type: 'streak', check: (p) => p.dailyStreak >= 7 },
  { id: 'streak-30', title: '月度坚持', description: '连续学习30天', type: 'streak', check: (p) => p.dailyStreak >= 30 },
  // Words achievements
  { id: 'words-10', title: '词汇新手', description: '学习10个单词', type: 'words', check: (p) => p.totalWordsLearned >= 10 },
  { id: 'words-50', title: '词汇达人', description: '学习50个单词', type: 'words', check: (p) => p.totalWordsLearned >= 50 },
  { id: 'words-100', title: '词汇大师', description: '学习100个单词', type: 'words', check: (p) => p.totalWordsLearned >= 100 },
  // Articles achievements
  { id: 'articles-5', title: '阅读起步', description: '阅读5篇文章', type: 'articles', check: (p) => p.totalArticlesRead >= 5 },
  { id: 'articles-20', title: '阅读爱好者', description: '阅读20篇文章', type: 'articles', check: (p) => p.totalArticlesRead >= 20 },
  { id: 'articles-50', title: '阅读达人', description: '阅读50篇文章', type: 'articles', check: (p) => p.totalArticlesRead >= 50 },
  // Quiz achievements
  { id: 'quiz-100', title: '测验新手', description: '获得100测验积分', type: 'quiz', check: (p) => p.quizPoints >= 100 },
  { id: 'quiz-500', title: '测验达人', description: '获得500测验积分', type: 'quiz', check: (p) => p.quizPoints >= 500 },
  // Grammar achievements (based on quiz points as proxy)
  { id: 'grammar-first', title: '语法入门', description: '完成首次语法学习', type: 'grammar', check: (p) => p.totalArticlesRead >= 1 && p.quizPoints >= 10 },
];

// ============================================================
// Helper Functions
// ============================================================

/**
 * Normalizes a date to midnight (start of day) for streak comparison.
 */
function toDateOnly(date: Date | string): Date {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Gets the difference in calendar days between two dates.
 */
function daysDifference(date1: Date | string, date2: Date | string): number {
  const d1 = toDateOnly(date1);
  const d2 = toDateOnly(date2);
  const diffMs = Math.abs(d1.getTime() - d2.getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculates the daily streak based on the last active date and the current streak.
 * - Same day: keep current streak
 * - Next consecutive day: increment streak
 * - Gap of 2+ days: reset to 1 (today counts as active)
 */
function computeStreak(lastActiveDate: Date | string, currentStreak: number): number {
  const diff = daysDifference(new Date(), lastActiveDate);

  if (diff === 0) {
    // Same day — keep streak (minimum 1 if user is active)
    return Math.max(currentStreak, 1);
  } else if (diff === 1) {
    // Consecutive day — increment streak
    return currentStreak + 1;
  } else {
    // Streak broken — reset to 1
    return 1;
  }
}

// ============================================================
// Core Implementation
// ============================================================

/**
 * Reads the user's progress from LocalStorage.
 * Returns default progress if no stored data is found.
 */
export function getUserProgress(): UserProgress {
  const stored = storageGet('user-progress');
  if (stored) {
    return stored;
  }
  return { ...DEFAULT_PROGRESS };
}

/**
 * Updates user progress after a completed learning session.
 * Increments totalWordsLearned by session.wordsLearned.length,
 * increments totalArticlesRead by session.articlesRead.length,
 * recalculates the daily streak, and persists to LocalStorage.
 */
export function updateSessionStats(session: LearningSession): void {
  const current = getUserProgress();

  const updatedProgress: UserProgress = {
    ...current,
    totalWordsLearned: current.totalWordsLearned + session.wordsLearned.length,
    totalArticlesRead: current.totalArticlesRead + session.articlesRead.length,
    dailyStreak: computeStreak(current.lastActiveDate, current.dailyStreak),
    lastActiveDate: new Date(),
    readingHistory: [...current.readingHistory, ...session.articlesRead],
  };

  storageSet('user-progress', updatedProgress);
}

/**
 * Calculates the current daily streak based on stored progress.
 * Returns the computed streak value without modifying stored data.
 */
export function calculateDailyStreak(): number {
  const progress = getUserProgress();
  return computeStreak(progress.lastActiveDate, progress.dailyStreak);
}

/**
 * Recommends articles based on the user's current level and reading history.
 * - Includes articles at the user's level or one level adjacent
 * - Excludes articles the user has already read (from readingHistory)
 */
export function getRecommendedArticles(
  progress: UserProgress,
  articles: NewsArticle[]
): NewsArticle[] {
  const allowedLevels = ADJACENT_LEVELS[progress.currentLevel];
  const readSet = new Set(progress.readingHistory);

  return articles.filter((article) => {
    // Exclude already-read articles
    if (readSet.has(article.id)) return false;
    // Include only articles at allowed difficulty levels
    return allowedLevels.includes(article.difficulty);
  });
}

/**
 * Checks the user's progress against achievement milestones.
 * Returns newly earned achievements that are not already in the user's achievements list.
 */
export function checkAchievements(progress: UserProgress): Achievement[] {
  const earnedIds = new Set(progress.achievements.map((a) => a.id));
  const newAchievements: Achievement[] = [];

  for (const milestone of ACHIEVEMENT_MILESTONES) {
    // Skip already-earned achievements
    if (earnedIds.has(milestone.id)) continue;

    // Check if the milestone condition is met
    if (milestone.check(progress)) {
      newAchievements.push({
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        earnedAt: new Date(),
        type: milestone.type,
      });
    }
  }

  return newAchievements;
}

/**
 * Returns words from the word bank that are due for review.
 * A word is due for review if:
 * - It has never been reviewed (lastReviewedAt is undefined), OR
 * - The time since last review exceeds the spaced interval
 *   (interval increases with review count)
 *
 * Mastery level 100 words are excluded (fully mastered).
 */
export async function getPendingReviews(): Promise<WordBankEntry[]> {
  const allWords = await getAll(STORE_NAMES.wordBank);
  const now = new Date();

  return allWords.filter((entry) => {
    // Fully mastered words don't need review
    if (entry.masteryLevel >= 100) return false;

    // Never reviewed — always due
    if (!entry.lastReviewedAt) return true;

    // Spaced repetition: interval increases with review count
    const intervalHours = REVIEW_INTERVAL_HOURS_BASE * Math.max(1, entry.reviewCount);
    const lastReview = new Date(entry.lastReviewedAt);
    const hoursSinceReview = (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60);

    return hoursSinceReview >= intervalHours;
  });
}

// ============================================================
// Exported ProgressManager Object (convenience)
// ============================================================

export const progressManager: ProgressManager = {
  getUserProgress,
  updateSessionStats,
  calculateDailyStreak,
  getRecommendedArticles,
  checkAchievements,
  getPendingReviews,
};
