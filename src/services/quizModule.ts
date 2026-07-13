/**
 * Quiz Module Service
 *
 * Implements the QuizModule interface for quiz question generation,
 * answer evaluation, session tracking, and performance history.
 *
 * Uses SOURCE_DIFFICULTY_MAP to adapt quiz difficulty based on the article's
 * contentSource. Different content sources produce questions at the appropriate
 * difficulty level.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 10.8
 */

import type {
  NewsArticle,
  QuizQuestion,
  QuizResult,
  QuizSession,
  QuizSummary,
  QuizType,
  DifficultyLevel,
} from '../types';
import { SOURCE_DIFFICULTY_MAP } from '../types';
import { getAll, put, STORE_NAMES } from '../utils/db';

// ============================================================
// QuizModule Interface
// ============================================================

export interface QuizModule {
  generateQuestions(article: NewsArticle, count: number): QuizQuestion[];
  evaluateAnswer(question: QuizQuestion, answer: string): QuizResult;
  getSessionSummary(session: QuizSession): QuizSummary;
  getPerformanceHistory(): Promise<QuizSession[]>;
  saveQuizSession(session: QuizSession): Promise<void>;
}

// ============================================================
// Difficulty Configuration
// ============================================================

/**
 * Configuration for quiz difficulty based on content source level.
 * Controls question complexity, number of options, and scoring.
 */
interface DifficultyConfig {
  pointsPerQuestion: number;
  optionCount: number;
  sentenceOrderingLength: number;
}

const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  beginner: {
    pointsPerQuestion: 5,
    optionCount: 3,
    sentenceOrderingLength: 2,
  },
  intermediate: {
    pointsPerQuestion: 10,
    optionCount: 4,
    sentenceOrderingLength: 3,
  },
  advanced: {
    pointsPerQuestion: 15,
    optionCount: 4,
    sentenceOrderingLength: 4,
  },
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Simple deterministic shuffle using a seed derived from the article ID.
 */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }

  for (let i = result.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash + i) | 0;
    const j = Math.abs(hash) % (i + 1);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/**
 * Extracts meaningful words from text (non-stop words, 4+ characters).
 */
function extractKeyWords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
    'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
    'once', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both',
    'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than',
    'too', 'very', 'just', 'because', 'if', 'when', 'where', 'how',
    'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
    'also', 'about', 'up', 'there', 'here', 'while', 'although', 'since',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stopWords.has(w));

  return [...new Set(words)];
}

/**
 * Generates distractor options by modifying the correct answer or using article words.
 */
function generateDistractors(
  correctAnswer: string,
  articleContent: string,
  count: number
): string[] {
  const allWords = extractKeyWords(articleContent);
  const distractors: string[] = [];

  // Use other words from the article as distractors
  for (const word of allWords) {
    if (
      word.toLowerCase() !== correctAnswer.toLowerCase() &&
      !distractors.includes(word)
    ) {
      distractors.push(word);
    }
    if (distractors.length >= count) break;
  }

  // If not enough, generate generic distractors
  const genericWords = ['example', 'another', 'different', 'something', 'nothing'];
  let idx = 0;
  while (distractors.length < count && idx < genericWords.length) {
    const generic = genericWords[idx]!;
    if (
      generic.toLowerCase() !== correctAnswer.toLowerCase() &&
      !distractors.includes(generic)
    ) {
      distractors.push(generic);
    }
    idx++;
  }

  return distractors.slice(0, count);
}

// ============================================================
// Question Generators
// ============================================================

/**
 * Generates a vocabulary-matching question from a sentence.
 */
function generateVocabularyMatching(
  article: NewsArticle,
  sentenceIndex: number,
  config: DifficultyConfig,
  questionIndex: number
): QuizQuestion | null {
  const sentence = article.sentences[sentenceIndex];
  if (!sentence) return null;

  const keywords = extractKeyWords(sentence.text);
  if (keywords.length === 0) return null;

  // Pick a word to test
  const targetWord = keywords[questionIndex % keywords.length]!;
  const distractorCount = config.optionCount - 1;
  const distractors = generateDistractors(targetWord, article.content, distractorCount);

  // Create options with the correct answer inserted
  const options = [...distractors];
  const insertPos = questionIndex % (options.length + 1);
  options.splice(insertPos, 0, targetWord);

  return {
    id: `quiz-vocab-${article.id}-${questionIndex}`,
    type: 'vocabulary-matching',
    question: `Which word best fits in the context: "${sentence.text.replace(
      new RegExp(`\\b${targetWord}\\b`, 'i'),
      '______'
    )}"?`,
    options,
    correctAnswer: targetWord,
    explanation: `The word "${targetWord}" is used in this sentence from the article. It appears in the context: "${sentence.text}"`,
    sourceArticleId: article.id,
    sourceSentence: sentence.text,
    points: config.pointsPerQuestion,
  };
}

/**
 * Generates a fill-in-the-blank question from a sentence.
 */
function generateFillInBlank(
  article: NewsArticle,
  sentenceIndex: number,
  config: DifficultyConfig,
  questionIndex: number
): QuizQuestion | null {
  const sentence = article.sentences[sentenceIndex];
  if (!sentence) return null;

  const keywords = extractKeyWords(sentence.text);
  if (keywords.length === 0) return null;

  // Pick a word to blank out
  const targetWord = keywords[(questionIndex + 1) % keywords.length]!;
  const blankedSentence = sentence.text.replace(
    new RegExp(`\\b${targetWord}\\b`, 'i'),
    '______'
  );

  return {
    id: `quiz-fill-${article.id}-${questionIndex}`,
    type: 'fill-in-blank',
    question: `Fill in the blank: "${blankedSentence}"`,
    correctAnswer: targetWord,
    explanation: `The correct word is "${targetWord}". The complete sentence is: "${sentence.text}"`,
    sourceArticleId: article.id,
    sourceSentence: sentence.text,
    points: config.pointsPerQuestion,
  };
}

/**
 * Generates a reading-comprehension question from article sentences.
 */
function generateReadingComprehension(
  article: NewsArticle,
  sentenceIndex: number,
  config: DifficultyConfig,
  questionIndex: number
): QuizQuestion | null {
  const sentence = article.sentences[sentenceIndex];
  if (!sentence) return null;

  // Create a comprehension question about what the sentence discusses
  const keywords = extractKeyWords(sentence.text);
  if (keywords.length === 0) return null;

  const mainTopic = keywords[0]!;
  const correctAnswer = sentence.text;

  // Build options from other sentences
  const otherSentences = article.sentences
    .filter((_, idx) => idx !== sentenceIndex)
    .map((s) => s.text);

  const distractors = otherSentences.slice(0, config.optionCount - 1);

  // Ensure we have enough options
  while (distractors.length < config.optionCount - 1) {
    distractors.push(`A sentence not related to ${mainTopic}.`);
  }

  const options = [...distractors];
  const insertPos = questionIndex % (options.length + 1);
  options.splice(insertPos, 0, correctAnswer);

  return {
    id: `quiz-comp-${article.id}-${questionIndex}`,
    type: 'reading-comprehension',
    question: `Which sentence from the article discusses "${mainTopic}"?`,
    options,
    correctAnswer,
    explanation: `The sentence "${sentence.text}" discusses "${mainTopic}" in the context of this article.`,
    sourceArticleId: article.id,
    sourceSentence: sentence.text,
    points: config.pointsPerQuestion,
  };
}

/**
 * Generates a sentence-ordering question from consecutive sentences.
 */
function generateSentenceOrdering(
  article: NewsArticle,
  startIndex: number,
  config: DifficultyConfig,
  questionIndex: number
): QuizQuestion | null {
  const orderLength = Math.min(
    config.sentenceOrderingLength,
    article.sentences.length - startIndex
  );

  if (orderLength < 2) return null;

  const sentencesSlice = article.sentences
    .slice(startIndex, startIndex + orderLength)
    .map((s) => s.text);

  // The correct answer is the sentences in their original order joined
  const correctAnswer = sentencesSlice.join(' | ');

  // Create a shuffled version for the question
  const shuffled = seededShuffle(sentencesSlice, `${article.id}-${questionIndex}`);
  const shuffledDisplay = shuffled.join(' | ');

  return {
    id: `quiz-order-${article.id}-${questionIndex}`,
    type: 'sentence-ordering',
    question: `Arrange these sentences in the correct order: "${shuffledDisplay}"`,
    correctAnswer,
    explanation: `The correct order follows the logical flow of the article: "${correctAnswer}"`,
    sourceArticleId: article.id,
    sourceSentence: sentencesSlice[0]!,
    points: config.pointsPerQuestion,
  };
}

// ============================================================
// Core Implementation
// ============================================================

/**
 * Quiz question types to cycle through for variety.
 */
const QUIZ_TYPES: QuizType[] = [
  'vocabulary-matching',
  'fill-in-blank',
  'reading-comprehension',
  'sentence-ordering',
];

/**
 * Generates quiz questions from an article based on its content source difficulty.
 *
 * - Generates at least 3 questions for articles with 3+ sentences
 * - Each question references the source article ID
 * - Difficulty adapts based on SOURCE_DIFFICULTY_MAP[article.contentSource]
 * - Multiple quiz types are generated for variety
 *
 * Requirements: 4.1, 4.2, 10.8
 */
export function generateQuestions(
  article: NewsArticle,
  count: number
): QuizQuestion[] {
  const difficulty = SOURCE_DIFFICULTY_MAP[article.contentSource];
  const config = DIFFICULTY_CONFIGS[difficulty];
  const questions: QuizQuestion[] = [];

  // Ensure we generate at least 3 questions if article has 3+ sentences
  const targetCount = Math.max(
    count,
    article.sentences.length >= 3 ? 3 : article.sentences.length
  );

  let questionIndex = 0;
  let attempts = 0;
  const maxAttempts = targetCount * 4; // Prevent infinite loops

  while (questions.length < targetCount && attempts < maxAttempts) {
    const typeIndex = questionIndex % QUIZ_TYPES.length;
    const quizType = QUIZ_TYPES[typeIndex]!;
    const sentenceIndex = questionIndex % article.sentences.length;

    let question: QuizQuestion | null = null;

    switch (quizType) {
      case 'vocabulary-matching':
        question = generateVocabularyMatching(
          article,
          sentenceIndex,
          config,
          questionIndex
        );
        break;
      case 'fill-in-blank':
        question = generateFillInBlank(article, sentenceIndex, config, questionIndex);
        break;
      case 'reading-comprehension':
        question = generateReadingComprehension(
          article,
          sentenceIndex,
          config,
          questionIndex
        );
        break;
      case 'sentence-ordering': {
        // For sentence-ordering, use a start index that allows enough consecutive sentences
        const maxStart = Math.max(
          0,
          article.sentences.length - config.sentenceOrderingLength
        );
        const orderStartIndex = questionIndex % (maxStart + 1);
        question = generateSentenceOrdering(
          article,
          orderStartIndex,
          config,
          questionIndex
        );
        break;
      }
    }

    if (question) {
      questions.push(question);
    }

    questionIndex++;
    attempts++;
  }

  return questions;
}

/**
 * Evaluates a user's answer against the correct answer for a quiz question.
 *
 * - Correct answers return isCorrect=true with points > 0
 * - Incorrect answers return isCorrect=false with explanation
 *
 * Requirements: 4.3, 4.4
 */
export function evaluateAnswer(
  question: QuizQuestion,
  answer: string
): QuizResult {
  const isCorrect =
    answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

  return {
    questionId: question.id,
    userAnswer: answer,
    isCorrect,
    timeSpent: 0, // Time tracking is handled by the UI layer
  };
}

/**
 * Returns the points and explanation for an evaluated answer.
 * This is a helper that provides richer feedback beyond the QuizResult.
 */
export function getAnswerFeedback(
  question: QuizQuestion,
  isCorrect: boolean
): { points: number; explanation: string; correctAnswer: string } {
  if (isCorrect) {
    return {
      points: question.points,
      explanation: question.explanation,
      correctAnswer: question.correctAnswer,
    };
  }

  return {
    points: 0,
    explanation: question.explanation,
    correctAnswer: question.correctAnswer,
  };
}

/**
 * Gets the session summary for a completed quiz session.
 * Calculates accuracy (correct/total), total points from correct answers,
 * and identifies weak areas based on quiz types with incorrect answers.
 *
 * Requirements: 4.5
 */
export function getSessionSummary(session: QuizSession): QuizSummary {
  const totalQuestions = session.questions.length;
  const correctAnswers = session.results.filter((r) => r.isCorrect).length;
  const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;

  // Calculate points from correct answers
  const pointsEarned = session.results.reduce((sum, result, index) => {
    if (result.isCorrect && session.questions[index]) {
      return sum + session.questions[index]!.points;
    }
    return sum;
  }, 0);

  const timeSpent = session.results.reduce((sum, r) => sum + r.timeSpent, 0);

  // Identify weak areas based on incorrect answers by quiz type
  const weakAreas: string[] = [];
  const incorrectByType = new Map<string, number>();
  for (let i = 0; i < session.results.length; i++) {
    const result = session.results[i];
    const question = session.questions[i];
    if (result && question && !result.isCorrect) {
      incorrectByType.set(
        question.type,
        (incorrectByType.get(question.type) || 0) + 1
      );
    }
  }
  for (const [type] of incorrectByType) {
    weakAreas.push(type);
  }

  return {
    totalQuestions,
    correctAnswers,
    accuracy,
    pointsEarned,
    timeSpent,
    weakAreas,
  };
}

/**
 * Retrieves past quiz sessions from IndexedDB quizHistory store.
 *
 * Requirements: 4.5
 */
export async function getPerformanceHistory(): Promise<QuizSession[]> {
  return getAll(STORE_NAMES.quizHistory);
}

/**
 * Saves a completed quiz session to IndexedDB quizHistory store.
 * Sets completedAt if not already set.
 *
 * Requirements: 4.5
 */
export async function saveQuizSession(session: QuizSession): Promise<void> {
  const sessionToStore: QuizSession = {
    ...session,
    completedAt: session.completedAt ?? new Date(),
  };
  await put(STORE_NAMES.quizHistory, sessionToStore);
}
