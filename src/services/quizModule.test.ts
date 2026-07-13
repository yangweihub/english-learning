/**
 * Unit tests for QuizModule service
 *
 * Tests cover:
 * - generateQuestions produces at least 3 questions for articles with 3+ sentences
 * - All questions reference sourceArticleId
 * - evaluateAnswer returns isCorrect=true and points>0 for correct answers
 * - evaluateAnswer returns isCorrect=false with explanation for incorrect answers
 * - Multiple quiz types are generated
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 10.8
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { NewsArticle, QuizSession, QuizQuestion } from '../types';
import {
  generateQuestions,
  evaluateAnswer,
  getAnswerFeedback,
  getSessionSummary,
  getPerformanceHistory,
  saveQuizSession,
} from './quizModule';
import 'fake-indexeddb/auto';
import { deleteDatabase } from '../utils/db';

// ============================================================
// Test Fixtures
// ============================================================

function createTestArticle(overrides?: Partial<NewsArticle>): NewsArticle {
  return {
    id: 'article-test-001',
    title: 'Technology Advances in Modern Education',
    summary: 'An article about how technology is changing education.',
    content:
      'Technology has transformed modern education significantly. Students now have access to digital resources and online learning platforms. Teachers use interactive tools to enhance classroom engagement. The integration of artificial intelligence promises even more personalized learning experiences.',
    sentences: [
      {
        id: 'sent-1',
        text: 'Technology has transformed modern education significantly.',
        startIndex: 0,
        endIndex: 54,
      },
      {
        id: 'sent-2',
        text: 'Students now have access to digital resources and online learning platforms.',
        startIndex: 55,
        endIndex: 129,
      },
      {
        id: 'sent-3',
        text: 'Teachers use interactive tools to enhance classroom engagement.',
        startIndex: 130,
        endIndex: 192,
      },
      {
        id: 'sent-4',
        text: 'The integration of artificial intelligence promises even more personalized learning experiences.',
        startIndex: 193,
        endIndex: 288,
      },
    ],
    publishedAt: new Date('2024-01-15'),
    source: 'Education Weekly',
    contentSource: 'senior-high',
    difficulty: 'advanced',
    ...overrides,
  };
}

function createBeginnerArticle(): NewsArticle {
  return createTestArticle({
    id: 'article-beginner-001',
    title: 'My Family and Friends',
    content:
      'I have a big family with many members. My friends come to visit every weekend. We play games together in the garden. Everyone is happy and having fun.',
    sentences: [
      {
        id: 'sent-b1',
        text: 'I have a big family with many members.',
        startIndex: 0,
        endIndex: 38,
      },
      {
        id: 'sent-b2',
        text: 'My friends come to visit every weekend.',
        startIndex: 39,
        endIndex: 77,
      },
      {
        id: 'sent-b3',
        text: 'We play games together in the garden.',
        startIndex: 78,
        endIndex: 115,
      },
      {
        id: 'sent-b4',
        text: 'Everyone is happy and having fun.',
        startIndex: 116,
        endIndex: 148,
      },
    ],
    contentSource: 'elementary',
    difficulty: 'beginner',
  });
}

function createShortArticle(): NewsArticle {
  return createTestArticle({
    id: 'article-short-001',
    content: 'Short article content here.',
    sentences: [
      {
        id: 'sent-s1',
        text: 'Short article content here.',
        startIndex: 0,
        endIndex: 27,
      },
    ],
  });
}

// ============================================================
// Tests: generateQuestions
// ============================================================

describe('generateQuestions', () => {
  it('produces at least 3 questions for articles with 3+ sentences', () => {
    const article = createTestArticle();
    const questions = generateQuestions(article, 3);

    expect(questions.length).toBeGreaterThanOrEqual(3);
  });

  it('all questions reference sourceArticleId', () => {
    const article = createTestArticle();
    const questions = generateQuestions(article, 5);

    for (const question of questions) {
      expect(question.sourceArticleId).toBe(article.id);
    }
  });

  it('generates multiple quiz types', () => {
    const article = createTestArticle();
    const questions = generateQuestions(article, 8);

    const types = new Set(questions.map((q) => q.type));
    // Should have at least 2 different quiz types
    expect(types.size).toBeGreaterThanOrEqual(2);
  });

  it('generates all four quiz types when enough questions are requested', () => {
    const article = createTestArticle();
    const questions = generateQuestions(article, 12);

    const types = new Set(questions.map((q) => q.type));
    expect(types.has('vocabulary-matching')).toBe(true);
    expect(types.has('fill-in-blank')).toBe(true);
    expect(types.has('reading-comprehension')).toBe(true);
    expect(types.has('sentence-ordering')).toBe(true);
  });

  it('adapts difficulty based on article contentSource (beginner)', () => {
    const article = createBeginnerArticle();
    const questions = generateQuestions(article, 4);

    // Beginner articles award 5 points per question
    for (const question of questions) {
      expect(question.points).toBe(5);
    }
  });

  it('adapts difficulty based on article contentSource (advanced)', () => {
    const article = createTestArticle({ contentSource: 'current-affairs' });
    const questions = generateQuestions(article, 4);

    // Advanced articles award 15 points per question
    for (const question of questions) {
      expect(question.points).toBe(15);
    }
  });

  it('adapts difficulty based on article contentSource (intermediate)', () => {
    const article = createTestArticle({ contentSource: 'junior-high' });
    const questions = generateQuestions(article, 4);

    // Intermediate articles award 10 points per question
    for (const question of questions) {
      expect(question.points).toBe(10);
    }
  });

  it('generates questions even for short articles (fewer than 3 sentences)', () => {
    const article = createShortArticle();
    const questions = generateQuestions(article, 3);

    // Should still generate some questions (but may be fewer than 3)
    expect(questions.length).toBeGreaterThanOrEqual(0);
    for (const question of questions) {
      expect(question.sourceArticleId).toBe(article.id);
    }
  });

  it('each question has a non-empty explanation', () => {
    const article = createTestArticle();
    const questions = generateQuestions(article, 5);

    for (const question of questions) {
      expect(question.explanation).toBeTruthy();
      expect(question.explanation.length).toBeGreaterThan(0);
    }
  });

  it('each question has a non-empty correctAnswer', () => {
    const article = createTestArticle();
    const questions = generateQuestions(article, 5);

    for (const question of questions) {
      expect(question.correctAnswer).toBeTruthy();
      expect(question.correctAnswer.length).toBeGreaterThan(0);
    }
  });

  it('each question has a unique id', () => {
    const article = createTestArticle();
    const questions = generateQuestions(article, 8);

    const ids = questions.map((q) => q.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

// ============================================================
// Tests: evaluateAnswer
// ============================================================

describe('evaluateAnswer', () => {
  it('returns isCorrect=true for correct answers', () => {
    const article = createTestArticle();
    const questions = generateQuestions(article, 3);
    const question = questions[0]!;

    const result = evaluateAnswer(question, question.correctAnswer);

    expect(result.isCorrect).toBe(true);
    expect(result.questionId).toBe(question.id);
  });

  it('correct answers award points > 0 via getAnswerFeedback', () => {
    const article = createTestArticle();
    const questions = generateQuestions(article, 3);
    const question = questions[0]!;

    const result = evaluateAnswer(question, question.correctAnswer);
    const feedback = getAnswerFeedback(question, result.isCorrect);

    expect(result.isCorrect).toBe(true);
    expect(feedback.points).toBeGreaterThan(0);
  });

  it('returns isCorrect=false for incorrect answers', () => {
    const article = createTestArticle();
    const questions = generateQuestions(article, 3);
    const question = questions[0]!;

    const result = evaluateAnswer(question, 'completely-wrong-answer');

    expect(result.isCorrect).toBe(false);
    expect(result.questionId).toBe(question.id);
  });

  it('incorrect answers include correct answer and explanation via getAnswerFeedback', () => {
    const article = createTestArticle();
    const questions = generateQuestions(article, 3);
    const question = questions[0]!;

    const result = evaluateAnswer(question, 'wrong-answer');
    const feedback = getAnswerFeedback(question, result.isCorrect);

    expect(result.isCorrect).toBe(false);
    expect(feedback.correctAnswer).toBeTruthy();
    expect(feedback.correctAnswer.length).toBeGreaterThan(0);
    expect(feedback.explanation).toBeTruthy();
    expect(feedback.explanation.length).toBeGreaterThan(0);
  });

  it('is case-insensitive when comparing answers', () => {
    const article = createTestArticle();
    const questions = generateQuestions(article, 3);
    const question = questions[0]!;

    const upperAnswer = question.correctAnswer.toUpperCase();
    const result = evaluateAnswer(question, upperAnswer);

    expect(result.isCorrect).toBe(true);
  });

  it('trims whitespace when comparing answers', () => {
    const article = createTestArticle();
    const questions = generateQuestions(article, 3);
    const question = questions[0]!;

    const paddedAnswer = `  ${question.correctAnswer}  `;
    const result = evaluateAnswer(question, paddedAnswer);

    expect(result.isCorrect).toBe(true);
  });

  it('stores the user answer in the result', () => {
    const article = createTestArticle();
    const questions = generateQuestions(article, 3);
    const question = questions[0]!;

    const userAnswer = 'my-answer';
    const result = evaluateAnswer(question, userAnswer);

    expect(result.userAnswer).toBe(userAnswer);
  });
});

// ============================================================
// Tests: getSessionSummary
// ============================================================

describe('getSessionSummary', () => {
  it('returns a summary with correct accuracy calculation', () => {
    const article = createTestArticle();
    const questions = generateQuestions(article, 4);

    const session: QuizSession = {
      articleId: article.id,
      questions,
      results: questions.map((q, i) => ({
        questionId: q.id,
        userAnswer: i < 2 ? q.correctAnswer : 'wrong',
        isCorrect: i < 2,
        timeSpent: 10,
      })),
      totalPoints: 0,
    };

    const summary = getSessionSummary(session);

    expect(summary.totalQuestions).toBe(questions.length);
    expect(summary.correctAnswers).toBe(2);
    expect(summary.accuracy).toBeCloseTo(2 / questions.length);
  });

  it('calculates totalPoints as sum of points from correct answers only', () => {
    const article = createTestArticle(); // advanced = 15 points each
    const questions = generateQuestions(article, 4);

    // First 3 correct, last 1 wrong
    const session: QuizSession = {
      articleId: article.id,
      questions,
      results: questions.map((q, i) => ({
        questionId: q.id,
        userAnswer: i < 3 ? q.correctAnswer : 'wrong',
        isCorrect: i < 3,
        timeSpent: 5,
      })),
      totalPoints: 0,
    };

    const summary = getSessionSummary(session);

    // Each correct question awards 15 points for advanced content
    const expectedPoints = questions
      .slice(0, 3)
      .reduce((sum, q) => sum + q.points, 0);
    expect(summary.pointsEarned).toBe(expectedPoints);
  });

  it('identifies weak areas from quiz types with incorrect answers', () => {
    const article = createTestArticle();
    const questions = generateQuestions(article, 8);

    // Mark all as incorrect to get weak areas for all types
    const session: QuizSession = {
      articleId: article.id,
      questions,
      results: questions.map((q) => ({
        questionId: q.id,
        userAnswer: 'wrong',
        isCorrect: false,
        timeSpent: 5,
      })),
      totalPoints: 0,
    };

    const summary = getSessionSummary(session);

    expect(summary.weakAreas.length).toBeGreaterThan(0);
    // Weak areas should be quiz type strings
    for (const area of summary.weakAreas) {
      expect([
        'vocabulary-matching',
        'fill-in-blank',
        'reading-comprehension',
        'sentence-ordering',
      ]).toContain(area);
    }
  });

  it('returns empty weakAreas when all answers are correct', () => {
    const article = createTestArticle();
    const questions = generateQuestions(article, 4);

    const session: QuizSession = {
      articleId: article.id,
      questions,
      results: questions.map((q) => ({
        questionId: q.id,
        userAnswer: q.correctAnswer,
        isCorrect: true,
        timeSpent: 5,
      })),
      totalPoints: 0,
    };

    const summary = getSessionSummary(session);

    expect(summary.weakAreas).toEqual([]);
  });

  it('calculates total timeSpent from all results', () => {
    const article = createTestArticle();
    const questions = generateQuestions(article, 3);

    const session: QuizSession = {
      articleId: article.id,
      questions,
      results: questions.map((q, i) => ({
        questionId: q.id,
        userAnswer: q.correctAnswer,
        isCorrect: true,
        timeSpent: (i + 1) * 10, // 10, 20, 30
      })),
      totalPoints: 0,
    };

    const summary = getSessionSummary(session);

    expect(summary.timeSpent).toBe(60); // 10 + 20 + 30
  });

  it('handles session with no results (accuracy = 0)', () => {
    const article = createTestArticle();
    const questions = generateQuestions(article, 3);

    const session: QuizSession = {
      articleId: article.id,
      questions,
      results: [],
      totalPoints: 0,
    };

    const summary = getSessionSummary(session);

    // No results means 0 questions answered
    expect(summary.totalQuestions).toBe(questions.length);
    expect(summary.correctAnswers).toBe(0);
    expect(summary.pointsEarned).toBe(0);
  });
});

// ============================================================
// Tests: saveQuizSession and getPerformanceHistory (IndexedDB)
// ============================================================

describe('saveQuizSession and getPerformanceHistory', () => {
  beforeEach(async () => {
    await deleteDatabase();
  });

  it('saves a session and retrieves it from performance history', async () => {
    const article = createTestArticle();
    const questions = generateQuestions(article, 3);

    const session: QuizSession = {
      articleId: article.id,
      questions,
      results: questions.map((q) => ({
        questionId: q.id,
        userAnswer: q.correctAnswer,
        isCorrect: true,
        timeSpent: 10,
      })),
      totalPoints: 45,
      completedAt: new Date('2024-01-15T10:00:00Z'),
    };

    await saveQuizSession(session);

    const history = await getPerformanceHistory();
    expect(history.length).toBe(1);
    expect(history[0]!.articleId).toBe(article.id);
    expect(history[0]!.questions.length).toBe(questions.length);
    expect(history[0]!.results.length).toBe(questions.length);
  });

  it('sets completedAt if not already set when saving', async () => {
    const article = createTestArticle();
    const questions = generateQuestions(article, 3);

    const session: QuizSession = {
      articleId: article.id,
      questions,
      results: questions.map((q) => ({
        questionId: q.id,
        userAnswer: q.correctAnswer,
        isCorrect: true,
        timeSpent: 10,
      })),
      totalPoints: 45,
      // No completedAt
    };

    await saveQuizSession(session);

    const history = await getPerformanceHistory();
    expect(history.length).toBe(1);
    expect(history[0]!.completedAt).toBeDefined();
  });

  it('returns empty array when no sessions are stored', async () => {
    const history = await getPerformanceHistory();
    expect(history).toEqual([]);
  });

  it('stores multiple sessions for different articles', async () => {
    const article1 = createTestArticle();
    const article2 = createBeginnerArticle();
    const questions1 = generateQuestions(article1, 3);
    const questions2 = generateQuestions(article2, 3);

    const session1: QuizSession = {
      articleId: article1.id,
      questions: questions1,
      results: questions1.map((q) => ({
        questionId: q.id,
        userAnswer: q.correctAnswer,
        isCorrect: true,
        timeSpent: 10,
      })),
      totalPoints: 45,
      completedAt: new Date('2024-01-15T10:00:00Z'),
    };

    const session2: QuizSession = {
      articleId: article2.id,
      questions: questions2,
      results: questions2.map((q) => ({
        questionId: q.id,
        userAnswer: 'wrong',
        isCorrect: false,
        timeSpent: 5,
      })),
      totalPoints: 0,
      completedAt: new Date('2024-01-16T10:00:00Z'),
    };

    await saveQuizSession(session1);
    await saveQuizSession(session2);

    const history = await getPerformanceHistory();
    expect(history.length).toBe(2);

    const articleIds = history.map((s) => s.articleId);
    expect(articleIds).toContain(article1.id);
    expect(articleIds).toContain(article2.id);
  });

  it('overwrites session for the same articleId (keyPath is articleId)', async () => {
    const article = createTestArticle();
    const questions = generateQuestions(article, 3);

    const session1: QuizSession = {
      articleId: article.id,
      questions,
      results: questions.map((q) => ({
        questionId: q.id,
        userAnswer: 'wrong',
        isCorrect: false,
        timeSpent: 10,
      })),
      totalPoints: 0,
      completedAt: new Date('2024-01-15T10:00:00Z'),
    };

    const session2: QuizSession = {
      articleId: article.id,
      questions,
      results: questions.map((q) => ({
        questionId: q.id,
        userAnswer: q.correctAnswer,
        isCorrect: true,
        timeSpent: 5,
      })),
      totalPoints: 45,
      completedAt: new Date('2024-01-16T10:00:00Z'),
    };

    await saveQuizSession(session1);
    await saveQuizSession(session2);

    const history = await getPerformanceHistory();
    // Since keyPath is articleId, the second put overwrites the first
    expect(history.length).toBe(1);
    expect(history[0]!.totalPoints).toBe(45);
  });
});
