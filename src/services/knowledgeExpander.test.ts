/**
 * Unit tests for Knowledge Expander Service
 *
 * Tests knowledge point identification (grammar, idioms, cultural references),
 * detail retrieval, related resources, and next point suggestion.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { NewsArticle } from '../types';
import {
  identifyKnowledgePoints,
  getKnowledgePointDetails,
  getRelatedResources,
  suggestNextPoint,
  generateGrammarExercises,
  trackGrammarMastery,
  getGrammarProgress,
  getGrammarRecommendations,
  getGrammarExplanation,
  clearKnowledgePointRegistry,
  clearGrammarMasteryStore,
  getPointMastery,
  GRAMMAR_MASTERY_THRESHOLD,
} from './knowledgeExpander';

// ============================================================
// Test Fixtures
// ============================================================

function createTestArticle(overrides: Partial<NewsArticle> = {}): NewsArticle {
  const content =
    'The bridge was built in 1990 by a famous engineer. ' +
    'She has lived in London for five years. ' +
    'If it rains tomorrow, we will stay inside. ' +
    'They must finish the project by Friday. ' +
    'The man who lives next door is very friendly.';

  return {
    id: 'article-1',
    title: 'Test Article',
    summary: 'A test article with various grammar patterns.',
    content,
    sentences: [
      { id: 's1', text: 'The bridge was built in 1990 by a famous engineer.', startIndex: 0, endIndex: 52 },
      { id: 's2', text: 'She has lived in London for five years.', startIndex: 53, endIndex: 91 },
      { id: 's3', text: 'If it rains tomorrow, we will stay inside.', startIndex: 92, endIndex: 134 },
      { id: 's4', text: 'They must finish the project by Friday.', startIndex: 135, endIndex: 174 },
      { id: 's5', text: 'The man who lives next door is very friendly.', startIndex: 175, endIndex: 221 },
    ],
    publishedAt: new Date('2024-01-15'),
    source: 'test-source',
    contentSource: 'current-affairs',
    difficulty: 'intermediate',
    ...overrides,
  };
}

function createIdiomArticle(): NewsArticle {
  const content =
    'The meeting was tense, so he told a joke to break the ice. ' +
    'In the long run, this strategy will pay off. ' +
    'At the end of the day, teamwork matters most.';

  return {
    id: 'article-idiom',
    title: 'Idiom Article',
    summary: 'An article containing idioms.',
    content,
    sentences: [
      { id: 'si1', text: 'The meeting was tense, so he told a joke to break the ice.', startIndex: 0, endIndex: 59 },
      { id: 'si2', text: 'In the long run, this strategy will pay off.', startIndex: 60, endIndex: 104 },
      { id: 'si3', text: 'At the end of the day, teamwork matters most.', startIndex: 105, endIndex: 151 },
    ],
    publishedAt: new Date('2024-02-01'),
    source: 'test-source',
    contentSource: 'senior-high',
    difficulty: 'advanced',
  };
}

function createCulturalArticle(): NewsArticle {
  const content =
    'Wall Street reacted positively to the latest economic data. ' +
    'Many startups in Silicon Valley are disrupting traditional industries. ' +
    'Families across America prepare for Thanksgiving celebrations.';

  return {
    id: 'article-cultural',
    title: 'Cultural Reference Article',
    summary: 'An article with cultural references.',
    content,
    sentences: [
      { id: 'sc1', text: 'Wall Street reacted positively to the latest economic data.', startIndex: 0, endIndex: 59 },
      { id: 'sc2', text: 'Many startups in Silicon Valley are disrupting traditional industries.', startIndex: 60, endIndex: 130 },
      { id: 'sc3', text: 'Families across America prepare for Thanksgiving celebrations.', startIndex: 131, endIndex: 193 },
    ],
    publishedAt: new Date('2024-03-01'),
    source: 'test-source',
    contentSource: 'current-affairs',
    difficulty: 'advanced',
  };
}

// ============================================================
// Tests: identifyKnowledgePoints
// ============================================================

describe('identifyKnowledgePoints', () => {
  beforeEach(() => {
    clearKnowledgePointRegistry();
  });

  it('should identify grammar points in article sentences', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);

    const grammarPoints = points.filter((p) => p.type === 'grammar');
    expect(grammarPoints.length).toBeGreaterThan(0);
  });

  it('should identify passive voice pattern', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);

    const passiveVoice = points.find((p) => p.title === 'Passive Voice');
    expect(passiveVoice).toBeDefined();
    expect(passiveVoice!.type).toBe('grammar');
    expect(passiveVoice!.grammarTopic).toBe('passive-voice');
  });

  it('should identify present perfect tense pattern', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);

    const presentPerfect = points.find((p) => p.title === 'Present Perfect Tense');
    expect(presentPerfect).toBeDefined();
    expect(presentPerfect!.type).toBe('grammar');
    expect(presentPerfect!.grammarTopic).toBe('tenses');
  });

  it('should identify conditional patterns', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);

    const conditional = points.find((p) => p.title === 'First Conditional');
    expect(conditional).toBeDefined();
    expect(conditional!.grammarTopic).toBe('conditionals');
  });

  it('should identify modal verbs', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);

    const modals = points.find((p) => p.title === 'Modal Verbs');
    expect(modals).toBeDefined();
    expect(modals!.grammarTopic).toBe('modals');
  });

  it('should identify relative clauses', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);

    const clauses = points.find((p) => p.title === 'Relative Clauses');
    expect(clauses).toBeDefined();
    expect(clauses!.grammarTopic).toBe('clauses');
  });

  it('should identify idioms in article sentences', () => {
    const article = createIdiomArticle();
    const points = identifyKnowledgePoints(article);

    const idiomPoints = points.filter((p) => p.type === 'idiom');
    expect(idiomPoints.length).toBeGreaterThan(0);
  });

  it('should identify "break the ice" idiom', () => {
    const article = createIdiomArticle();
    const points = identifyKnowledgePoints(article);

    const breakIce = points.find((p) => p.title === 'break the ice');
    expect(breakIce).toBeDefined();
    expect(breakIce!.type).toBe('idiom');
  });

  it('should identify cultural references', () => {
    const article = createCulturalArticle();
    const points = identifyKnowledgePoints(article);

    const culturalPoints = points.filter((p) => p.type === 'cultural-reference');
    expect(culturalPoints.length).toBeGreaterThan(0);
  });

  it('should identify Wall Street cultural reference', () => {
    const article = createCulturalArticle();
    const points = identifyKnowledgePoints(article);

    const wallStreet = points.find((p) => p.title === 'Wall Street');
    expect(wallStreet).toBeDefined();
    expect(wallStreet!.type).toBe('cultural-reference');
  });

  it('each knowledge point should have a valid type', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);

    const validTypes: string[] = ['grammar', 'idiom', 'cultural-reference'];
    for (const point of points) {
      expect(validTypes).toContain(point.type);
    }
  });

  it('each knowledge point sourceSentence should be substring of article content', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);

    for (const point of points) {
      expect(article.content).toContain(point.sourceSentence);
    }
  });

  it('sourceSentence should be substring of article content for idiom article', () => {
    const article = createIdiomArticle();
    const points = identifyKnowledgePoints(article);

    for (const point of points) {
      expect(article.content).toContain(point.sourceSentence);
    }
  });

  it('sourceSentence should be substring of article content for cultural article', () => {
    const article = createCulturalArticle();
    const points = identifyKnowledgePoints(article);

    for (const point of points) {
      expect(article.content).toContain(point.sourceSentence);
    }
  });

  it('should assign correct sourceArticleId to each point', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);

    for (const point of points) {
      expect(point.sourceArticleId).toBe(article.id);
    }
  });

  it('each grammar point should have a valid grammarTopic', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);

    const validTopics = ['tenses', 'clauses', 'prepositions', 'articles', 'conditionals', 'passive-voice', 'modals', 'other'];
    const grammarPoints = points.filter((p) => p.type === 'grammar');
    for (const point of grammarPoints) {
      expect(validTopics).toContain(point.grammarTopic);
    }
  });

  it('should return empty array for article with no matching patterns', () => {
    const article: NewsArticle = {
      id: 'article-empty',
      title: 'Simple Article',
      summary: 'Very simple.',
      content: 'Hello. Goodbye.',
      sentences: [
        { id: 'se1', text: 'Hello.', startIndex: 0, endIndex: 6 },
        { id: 'se2', text: 'Goodbye.', startIndex: 7, endIndex: 15 },
      ],
      publishedAt: new Date('2024-01-01'),
      source: 'test',
      contentSource: 'elementary',
      difficulty: 'beginner',
    };
    const points = identifyKnowledgePoints(article);
    expect(points).toEqual([]);
  });

  it('each knowledge point should have non-empty explanation and examples', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);

    for (const point of points) {
      expect(point.explanation.length).toBeGreaterThan(0);
      expect(point.examples.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================
// Tests: getKnowledgePointDetails
// ============================================================

describe('getKnowledgePointDetails', () => {
  beforeEach(() => {
    clearKnowledgePointRegistry();
  });

  it('should return full details for an identified knowledge point', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);
    expect(points.length).toBeGreaterThan(0);

    const first = points[0]!;
    const details = getKnowledgePointDetails(first.id);

    expect(details.id).toBe(first.id);
    expect(details.explanation.length).toBeGreaterThan(0);
    expect(details.examples.length).toBeGreaterThanOrEqual(1);
  });

  it('should return non-empty explanation', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);

    for (const point of points) {
      const details = getKnowledgePointDetails(point.id);
      expect(details.explanation).toBeTruthy();
      expect(details.explanation.length).toBeGreaterThan(0);
    }
  });

  it('should return at least one example', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);

    for (const point of points) {
      const details = getKnowledgePointDetails(point.id);
      expect(details.examples.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('should return fallback for unknown ID', () => {
    const details = getKnowledgePointDetails('nonexistent-id');
    expect(details.id).toBe('nonexistent-id');
    expect(details.explanation.length).toBeGreaterThan(0);
    expect(details.examples.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// Tests: getRelatedResources
// ============================================================

describe('getRelatedResources', () => {
  beforeEach(() => {
    clearKnowledgePointRegistry();
  });

  it('should find related knowledge points with the same type', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);

    const grammarPoints = points.filter((p) => p.type === 'grammar');
    expect(grammarPoints.length).toBeGreaterThan(1);

    const first = grammarPoints[0]!;
    const related = getRelatedResources(first.id);

    // Should find at least one related grammar point
    expect(related.length).toBeGreaterThan(0);
    // Should not include the point itself
    expect(related.find((r) => r.id === first.id)).toBeUndefined();
  });

  it('should return empty array for unknown point ID', () => {
    const related = getRelatedResources('nonexistent-id');
    expect(related).toEqual([]);
  });

  it('related resources should not include the queried point itself', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);

    for (const point of points) {
      const related = getRelatedResources(point.id);
      const selfIncluded = related.find((r) => r.id === point.id);
      expect(selfIncluded).toBeUndefined();
    }
  });
});

// ============================================================
// Tests: suggestNextPoint
// ============================================================

describe('suggestNextPoint', () => {
  beforeEach(() => {
    clearKnowledgePointRegistry();
  });

  it('should suggest a point not in the completed set', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);
    expect(points.length).toBeGreaterThan(1);

    const completedIds = [points[0]!.id];
    const suggestion = suggestNextPoint(completedIds);

    expect(suggestion).not.toBeNull();
    expect(suggestion!.id).not.toBe(points[0]!.id);
    expect(completedIds).not.toContain(suggestion!.id);
  });

  it('should return null when all points are completed', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);

    const allIds = points.map((p) => p.id);
    const suggestion = suggestNextPoint(allIds);
    expect(suggestion).toBeNull();
  });

  it('should return null when registry is empty and completedIds is empty', () => {
    const suggestion = suggestNextPoint([]);
    expect(suggestion).toBeNull();
  });

  it('should prefer lower difficulty points first (progressive learning)', () => {
    // Create an article with both beginner and intermediate points
    const content =
      'They must finish the project by Friday. ' +
      'The bridge was built in 1990 by a famous engineer.';

    const article: NewsArticle = {
      id: 'article-mixed',
      title: 'Mixed Difficulty',
      summary: 'Mixed.',
      content,
      sentences: [
        { id: 'sm1', text: 'They must finish the project by Friday.', startIndex: 0, endIndex: 39 },
        { id: 'sm2', text: 'The bridge was built in 1990 by a famous engineer.', startIndex: 40, endIndex: 91 },
      ],
      publishedAt: new Date('2024-01-01'),
      source: 'test',
      contentSource: 'junior-high',
      difficulty: 'intermediate',
    };

    const points = identifyKnowledgePoints(article);
    expect(points.length).toBeGreaterThan(0);

    const suggestion = suggestNextPoint([]);
    expect(suggestion).not.toBeNull();

    // The first suggestion should be a beginner-level point if one exists
    const beginnerPoints = points.filter((p) => p.difficulty === 'beginner');
    if (beginnerPoints.length > 0) {
      expect(suggestion!.difficulty).toBe('beginner');
    }
  });

  it('suggested point should never be in the completed set', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);

    // Complete half the points
    const halfIds = points.slice(0, Math.floor(points.length / 2)).map((p) => p.id);
    const suggestion = suggestNextPoint(halfIds);

    if (suggestion) {
      expect(halfIds).not.toContain(suggestion.id);
    }
  });
});

// ============================================================
// Tests: generateGrammarExercises
// ============================================================

describe('generateGrammarExercises', () => {
  beforeEach(() => {
    clearKnowledgePointRegistry();
    clearGrammarMasteryStore();
  });

  it('should return empty array when given empty points', () => {
    const result = generateGrammarExercises([]);
    expect(result).toEqual([]);
  });

  it('should return empty array when given only non-grammar points', () => {
    const article = createIdiomArticle();
    const points = identifyKnowledgePoints(article);
    const idiomPoints = points.filter((p) => p.type === 'idiom');
    const result = generateGrammarExercises(idiomPoints);
    expect(result).toEqual([]);
  });

  it('should generate exercises from grammar points', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);
    const exercises = generateGrammarExercises(points);
    expect(exercises.length).toBeGreaterThan(0);
  });

  it('should produce at least one of each type when given 3+ grammar points', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);
    const grammarPoints = points.filter((p) => p.type === 'grammar');
    expect(grammarPoints.length).toBeGreaterThanOrEqual(3);

    const exercises = generateGrammarExercises(grammarPoints);
    const types = new Set(exercises.map((e) => e.type));
    expect(types.has('sentence-correction')).toBe(true);
    expect(types.has('structure-analysis')).toBe(true);
    expect(types.has('transformation')).toBe(true);
  });

  it('each exercise should include source article ID', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);
    const exercises = generateGrammarExercises(points);

    for (const exercise of exercises) {
      expect(exercise.sourceArticleId).toBe(article.id);
    }
  });

  it('each exercise should include source sentence', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);
    const exercises = generateGrammarExercises(points);

    for (const exercise of exercises) {
      expect(exercise.sourceSentence.length).toBeGreaterThan(0);
      expect(article.content).toContain(exercise.sourceSentence);
    }
  });

  it('each exercise should have a non-empty explanation', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);
    const exercises = generateGrammarExercises(points);

    for (const exercise of exercises) {
      expect(exercise.explanation.length).toBeGreaterThan(0);
    }
  });

  it('each exercise should reference a grammar point ID', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);
    const grammarPoints = points.filter((p) => p.type === 'grammar');
    const exercises = generateGrammarExercises(grammarPoints);

    const grammarPointIds = new Set(grammarPoints.map((p) => p.id));
    for (const exercise of exercises) {
      expect(grammarPointIds.has(exercise.grammarPointId)).toBe(true);
    }
  });

  it('should generate 1 exercise for 1 grammar point', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);
    const grammarPoints = points.filter((p) => p.type === 'grammar');
    const exercises = generateGrammarExercises([grammarPoints[0]!]);
    expect(exercises.length).toBe(1);
    expect(exercises[0]!.type).toBe('sentence-correction');
  });

  it('should generate 2 exercises for 2 grammar points', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);
    const grammarPoints = points.filter((p) => p.type === 'grammar');
    const exercises = generateGrammarExercises(grammarPoints.slice(0, 2));
    expect(exercises.length).toBe(2);
  });
});

// ============================================================
// Tests: trackGrammarMastery
// ============================================================

describe('trackGrammarMastery', () => {
  beforeEach(() => {
    clearKnowledgePointRegistry();
    clearGrammarMasteryStore();
  });

  it('should not throw when called with valid args', () => {
    expect(() => trackGrammarMastery('some-id', true)).not.toThrow();
  });

  it('should increase mastery on correct answer', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);
    const grammarPoint = points.find((p) => p.type === 'grammar')!;

    trackGrammarMastery(grammarPoint.id, true);
    const data = getPointMastery(grammarPoint.id);
    expect(data).toBeDefined();
    expect(data!.mastery).toBe(10);
    expect(data!.reviewCount).toBe(1);
  });

  it('should decrease mastery on incorrect answer', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);
    const grammarPoint = points.find((p) => p.type === 'grammar')!;

    // First get mastery up
    trackGrammarMastery(grammarPoint.id, true); // 10
    trackGrammarMastery(grammarPoint.id, true); // 20
    trackGrammarMastery(grammarPoint.id, false); // 20 - 15 = 5

    const data = getPointMastery(grammarPoint.id);
    expect(data!.mastery).toBe(5);
    expect(data!.reviewCount).toBe(3);
  });

  it('should not go below 0 mastery', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);
    const grammarPoint = points.find((p) => p.type === 'grammar')!;

    trackGrammarMastery(grammarPoint.id, false);
    const data = getPointMastery(grammarPoint.id);
    expect(data!.mastery).toBe(0);
  });

  it('should not exceed 100 mastery', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);
    const grammarPoint = points.find((p) => p.type === 'grammar')!;

    // 11 correct answers = 110 -> capped at 100
    for (let i = 0; i < 11; i++) {
      trackGrammarMastery(grammarPoint.id, true);
    }
    const data = getPointMastery(grammarPoint.id);
    expect(data!.mastery).toBe(100);
  });

  it('should increment review count on each call', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);
    const grammarPoint = points.find((p) => p.type === 'grammar')!;

    trackGrammarMastery(grammarPoint.id, true);
    trackGrammarMastery(grammarPoint.id, false);
    trackGrammarMastery(grammarPoint.id, true);

    const data = getPointMastery(grammarPoint.id);
    expect(data!.reviewCount).toBe(3);
  });
});

// ============================================================
// Tests: getGrammarProgress
// ============================================================

describe('getGrammarProgress', () => {
  beforeEach(() => {
    clearKnowledgePointRegistry();
    clearGrammarMasteryStore();
  });

  it('should return map with all topics at 0 when no mastery tracked', () => {
    const progress = getGrammarProgress();
    expect(progress.get('tenses')).toBe(0);
    expect(progress.get('clauses')).toBe(0);
    expect(progress.get('prepositions')).toBe(0);
    expect(progress.get('articles')).toBe(0);
    expect(progress.get('conditionals')).toBe(0);
    expect(progress.get('passive-voice')).toBe(0);
    expect(progress.get('modals')).toBe(0);
    expect(progress.get('other')).toBe(0);
  });

  it('should return correct mastery for tracked topics', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);
    const passivePoint = points.find((p) => p.grammarTopic === 'passive-voice')!;

    trackGrammarMastery(passivePoint.id, true); // 10
    trackGrammarMastery(passivePoint.id, true); // 20

    const progress = getGrammarProgress();
    expect(progress.get('passive-voice')).toBe(20);
  });

  it('should average mastery when multiple points share a topic', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);

    // Find tense-related points (present perfect and past perfect or future continuous)
    const tensePoints = points.filter((p) => p.grammarTopic === 'tenses');

    if (tensePoints.length >= 2) {
      // First point: mastery = 30
      trackGrammarMastery(tensePoints[0]!.id, true); // 10
      trackGrammarMastery(tensePoints[0]!.id, true); // 20
      trackGrammarMastery(tensePoints[0]!.id, true); // 30

      // Second point: mastery = 10
      trackGrammarMastery(tensePoints[1]!.id, true); // 10

      const progress = getGrammarProgress();
      // Average of 30 and 10 = 20
      expect(progress.get('tenses')).toBe(20);
    }
  });

  it('should return all 8 grammar topics', () => {
    const progress = getGrammarProgress();
    expect(progress.size).toBe(8);
  });
});

// ============================================================
// Tests: getGrammarRecommendations
// ============================================================

describe('getGrammarRecommendations', () => {
  beforeEach(() => {
    clearKnowledgePointRegistry();
    clearGrammarMasteryStore();
  });

  it('should recommend all grammar points when none have been practiced', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);
    const grammarPoints = points.filter((p) => p.type === 'grammar');

    const recommendations = getGrammarRecommendations();
    // All grammar points should be recommended (mastery = 0 < threshold)
    expect(recommendations.length).toBe(grammarPoints.length);
  });

  it('should not recommend points with mastery at or above threshold', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);
    const grammarPoint = points.find((p) => p.type === 'grammar')!;

    // Get mastery to threshold (70)
    for (let i = 0; i < 7; i++) {
      trackGrammarMastery(grammarPoint.id, true); // 10 each = 70
    }

    const recommendations = getGrammarRecommendations();
    const recommended = recommendations.find((r) => r.id === grammarPoint.id);
    expect(recommended).toBeUndefined();
  });

  it('should recommend points below threshold sorted by mastery ascending', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);
    const grammarPoints = points.filter((p) => p.type === 'grammar');

    if (grammarPoints.length >= 2) {
      // Give first point higher mastery
      trackGrammarMastery(grammarPoints[0]!.id, true); // 10
      trackGrammarMastery(grammarPoints[0]!.id, true); // 20

      // Give second point lower mastery
      trackGrammarMastery(grammarPoints[1]!.id, true); // 10

      const recommendations = getGrammarRecommendations();
      // Second point (mastery=10) should come before first (mastery=20) in recommendations
      const idx0 = recommendations.findIndex((r) => r.id === grammarPoints[0]!.id);
      const idx1 = recommendations.findIndex((r) => r.id === grammarPoints[1]!.id);

      // Points with 0 mastery come first, then 10, then 20
      if (idx0 !== -1 && idx1 !== -1) {
        expect(idx1).toBeLessThan(idx0);
      }
    }
  });
});

// ============================================================
// Tests: getGrammarExplanation
// ============================================================

describe('getGrammarExplanation', () => {
  beforeEach(() => {
    clearKnowledgePointRegistry();
    clearGrammarMasteryStore();
  });

  it('should return explanation and additional examples for an exercise', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);
    const exercises = generateGrammarExercises(points);
    expect(exercises.length).toBeGreaterThan(0);

    const result = getGrammarExplanation(exercises[0]!);
    expect(result.explanation.length).toBeGreaterThan(0);
    expect(result.additionalExamples.length).toBeGreaterThan(0);
  });

  it('should provide at least one additional example', () => {
    const article = createTestArticle();
    const points = identifyKnowledgePoints(article);
    const exercises = generateGrammarExercises(points);

    for (const exercise of exercises) {
      const result = getGrammarExplanation(exercise);
      expect(result.additionalExamples.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('should return fallback for unknown grammar point', () => {
    const fakeExercise = {
      id: 'fake-ex',
      type: 'sentence-correction' as const,
      question: 'Fake question',
      correctAnswer: 'Fake answer',
      explanation: 'Fallback explanation',
      grammarPointId: 'nonexistent-point',
      sourceArticleId: 'fake-article',
      sourceSentence: 'Fake sentence.',
    };

    const result = getGrammarExplanation(fakeExercise);
    expect(result.explanation).toBe('Fallback explanation');
    expect(result.additionalExamples.length).toBeGreaterThanOrEqual(1);
  });
});
