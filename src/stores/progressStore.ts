import { create } from 'zustand';
import type { UserProgress, LearningSession, Achievement, DifficultyLevel } from '../types';
import { storageGet, storageSet } from '../utils/storage';

// ============================================================
// Progress Store State & Actions
// ============================================================

interface ProgressState {
  progress: UserProgress;
  currentSession: LearningSession | null;
}

interface ProgressActions {
  /** Load progress from LocalStorage on app init */
  loadProgress: () => void;
  /** Update progress after a completed learning session */
  updateSessionStats: (session: LearningSession) => void;
  /** Add an article ID to reading history */
  addArticleRead: (articleId: string) => void;
  /** Increment total words learned */
  addWordsLearned: (count: number) => void;
  /** Add quiz points */
  addQuizPoints: (points: number) => void;
  /** Add an achievement */
  addAchievement: (achievement: Achievement) => void;
  /** Update current difficulty level */
  setCurrentLevel: (level: DifficultyLevel) => void;
  /** Start a new learning session */
  startSession: () => void;
  /** End the current learning session */
  endSession: () => void;
}

type ProgressStore = ProgressState & ProgressActions;

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
 * Calculate daily streak based on last active date and current date.
 */
function calculateStreak(lastActiveDate: Date, currentStreak: number): number {
  const now = new Date();
  const last = new Date(lastActiveDate);
  const diffMs = now.getTime() - last.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Same day — keep streak
    return currentStreak;
  } else if (diffDays === 1) {
    // Consecutive day — increment streak
    return currentStreak + 1;
  } else {
    // Streak broken
    return 1;
  }
}

function persistProgress(progress: UserProgress): void {
  storageSet('user-progress', progress);
}

export const useProgressStore = create<ProgressStore>((set, get) => ({
  progress: DEFAULT_PROGRESS,
  currentSession: null,

  loadProgress: () => {
    const stored = storageGet('user-progress');
    if (stored) {
      set({ progress: stored });
    }
  },

  updateSessionStats: (session: LearningSession) => {
    const current = get().progress;
    const updatedProgress: UserProgress = {
      ...current,
      totalWordsLearned: current.totalWordsLearned + session.wordsLearned.length,
      totalArticlesRead: current.totalArticlesRead + session.articlesRead.length,
      dailyStreak: calculateStreak(current.lastActiveDate, current.dailyStreak),
      lastActiveDate: new Date(),
      readingHistory: [...current.readingHistory, ...session.articlesRead],
    };
    persistProgress(updatedProgress);
    set({ progress: updatedProgress });
  },

  addArticleRead: (articleId: string) => {
    const current = get().progress;
    if (current.readingHistory.includes(articleId)) return;
    const updatedProgress: UserProgress = {
      ...current,
      totalArticlesRead: current.totalArticlesRead + 1,
      readingHistory: [...current.readingHistory, articleId],
      dailyStreak: calculateStreak(current.lastActiveDate, current.dailyStreak),
      lastActiveDate: new Date(),
    };
    persistProgress(updatedProgress);
    set({ progress: updatedProgress });
  },

  addWordsLearned: (count: number) => {
    const current = get().progress;
    const updatedProgress: UserProgress = {
      ...current,
      totalWordsLearned: current.totalWordsLearned + count,
    };
    persistProgress(updatedProgress);
    set({ progress: updatedProgress });
  },

  addQuizPoints: (points: number) => {
    const current = get().progress;
    const updatedProgress: UserProgress = {
      ...current,
      quizPoints: current.quizPoints + points,
    };
    persistProgress(updatedProgress);
    set({ progress: updatedProgress });
  },

  addAchievement: (achievement: Achievement) => {
    const current = get().progress;
    const updatedProgress: UserProgress = {
      ...current,
      achievements: [...current.achievements, achievement],
    };
    persistProgress(updatedProgress);
    set({ progress: updatedProgress });
  },

  setCurrentLevel: (level: DifficultyLevel) => {
    const current = get().progress;
    const updatedProgress: UserProgress = {
      ...current,
      currentLevel: level,
    };
    persistProgress(updatedProgress);
    set({ progress: updatedProgress });
  },

  startSession: () => {
    const session: LearningSession = {
      startedAt: new Date(),
      articlesRead: [],
      wordsLearned: [],
      quizzesTaken: 0,
      quizAccuracy: 0,
    };
    storageSet('daily-session', session);
    set({ currentSession: session });
  },

  endSession: () => {
    const session = get().currentSession;
    if (session) {
      const ended: LearningSession = { ...session, endedAt: new Date() };
      get().updateSessionStats(ended);
    }
    set({ currentSession: null });
  },
}));
