// Core type definitions for English Learning News application

// ============================================================
// Content Source Types & Constants
// ============================================================

/**
 * Content source type representing the five available data sources.
 * Each source targets a different English proficiency level.
 */
export type ContentSource =
  | 'current-affairs'
  | 'senior-high'
  | 'junior-high'
  | 'junior-senior-mixed'
  | 'elementary';

/**
 * Difficulty level for content, vocabulary, and exercises.
 */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Mapping from ContentSource to its corresponding DifficultyLevel.
 */
export const SOURCE_DIFFICULTY_MAP: Record<ContentSource, DifficultyLevel> = {
  'current-affairs': 'advanced',
  'senior-high': 'advanced',
  'junior-high': 'intermediate',
  'junior-senior-mixed': 'intermediate',
  'elementary': 'beginner',
};

/**
 * Chinese labels for each ContentSource, used in UI display.
 */
export const CONTENT_SOURCE_LABELS: Record<ContentSource, string> = {
  'current-affairs': '时政新闻',
  'senior-high': '高中英语',
  'junior-high': '初中英语',
  'junior-senior-mixed': '初高中混合',
  'elementary': '小学英语',
};

/**
 * Default content source when no user selection is stored.
 */
export const DEFAULT_CONTENT_SOURCE: ContentSource = 'current-affairs';

// ============================================================
// Type Enums / Unions
// ============================================================

export type QuizType =
  | 'vocabulary-matching'
  | 'fill-in-blank'
  | 'reading-comprehension'
  | 'sentence-ordering';

export type KnowledgeType = 'grammar' | 'idiom' | 'cultural-reference';

export type GrammarTopic =
  | 'tenses'
  | 'clauses'
  | 'prepositions'
  | 'articles'
  | 'conditionals'
  | 'passive-voice'
  | 'modals'
  | 'other';

// ============================================================
// News & Article Interfaces
// ============================================================

export interface Sentence {
  id: string;
  text: string;
  translation?: string;
  startIndex: number;
  endIndex: number;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  sentences: Sentence[];
  publishedAt: Date;
  source: string;
  contentSource: ContentSource;
  difficulty: DifficultyLevel;
  imageUrl?: string;
  grade?: string;
}

// ============================================================
// Vocabulary Interfaces
// ============================================================

export interface Definition {
  english: string;
  chinese: string;
}

export interface VocabularyWord {
  id: string;
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  definitions: Definition[];
  exampleSentences: string[];
  difficulty: DifficultyLevel;
  sourceArticleId: string;
  sourceSentence: string;
}

export interface WordBankEntry {
  word: VocabularyWord;
  addedAt: Date;
  masteryLevel: number; // 0-100
  reviewCount: number;
  lastReviewedAt?: Date;
}

// ============================================================
// Quiz Interfaces
// ============================================================

export interface QuizQuestion {
  id: string;
  type: QuizType;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  sourceArticleId: string;
  sourceSentence?: string;
  points: number;
}

export interface QuizResult {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
}

export interface QuizSession {
  articleId: string;
  questions: QuizQuestion[];
  results: QuizResult[];
  totalPoints: number;
  completedAt?: Date;
}

export interface QuizSummary {
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  pointsEarned: number;
  timeSpent: number;
  weakAreas: string[];
}

// ============================================================
// Knowledge & Grammar Interfaces
// ============================================================

export interface KnowledgePoint {
  id: string;
  type: KnowledgeType;
  title: string;
  explanation: string;
  examples: string[];
  relatedArticleIds: string[];
  sourceSentence: string;
  sourceArticleId: string;
  grammarTopic?: GrammarTopic;
  difficulty: DifficultyLevel;
}

export interface GrammarExercise {
  id: string;
  type: 'sentence-correction' | 'structure-analysis' | 'transformation';
  question: string;
  correctAnswer: string;
  explanation: string;
  grammarPointId: string;
  sourceArticleId: string;
  sourceSentence: string;
}

// ============================================================
// Training & Exercise Interfaces
// ============================================================

export interface VocabExercise {
  id: string;
  type: 'spelling' | 'definition-matching' | 'context-fill';
  word: VocabularyWord;
  question: string;
  options?: string[];
  correctAnswer: string;
  sourceArticleTitle: string;
  sourceSentence: string;
}

export interface ExerciseResult {
  exerciseId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
}

export interface TrainingSession {
  type: 'vocabulary' | 'grammar';
  startedAt: Date;
  endedAt?: Date;
  exercises: (VocabExercise | GrammarExercise)[];
  results: ExerciseResult[];
}

export interface SessionSummary {
  totalExercises: number;
  correctCount: number;
  accuracy: number;
  wordsMastered: string[];
  grammarPointsMastered: string[];
  duration: number;
}

// ============================================================
// User Progress & Settings Interfaces
// ============================================================

export interface Achievement {
  id: string;
  title: string;
  description: string;
  earnedAt: Date;
  type: 'streak' | 'words' | 'articles' | 'quiz' | 'grammar';
}

export interface UserProgress {
  userId: string;
  dailyStreak: number;
  totalWordsLearned: number;
  totalArticlesRead: number;
  currentLevel: DifficultyLevel;
  lastActiveDate: Date;
  quizPoints: number;
  achievements: Achievement[];
  readingHistory: string[]; // article IDs
}

export interface LearningSession {
  startedAt: Date;
  endedAt?: Date;
  articlesRead: string[];
  wordsLearned: string[];
  quizzesTaken: number;
  quizAccuracy: number;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large';
  autoTranslate: boolean;
  highlightLevel: DifficultyLevel;
  dailyGoal: number; // articles per day
  selectedSource: ContentSource;
}

// ============================================================
// Content Selector Component Interfaces
// ============================================================

export interface ContentSelectorProps {
  currentSource: ContentSource;
  onSourceChange: (source: ContentSource) => void;
  availableSources: ContentSource[];
}

export interface ContentSelectorState {
  activeSource: ContentSource;
  isLoading: boolean;
}
