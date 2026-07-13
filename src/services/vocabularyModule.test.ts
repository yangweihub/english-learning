/**
 * Unit tests for Vocabulary Module Service
 *
 * Tests cover: identifyKeyWords, getWordDetails, categorizeByDifficulty,
 * getVocabularyDifficultyForSource, and source-based difficulty mapping.
 *
 * Requirements: 1.9, 3.1, 3.2, 3.4, 10.7
 */

import { describe, it, expect } from 'vitest';
import {
  identifyKeyWords,
  getWordDetails,
  categorizeByDifficulty,
  getVocabularyDifficultyForSource,
  generateTrainingExercises,
} from './vocabularyModule';
import type { NewsArticle, DifficultyLevel, ContentSource, WordBankEntry, VocabularyWord } from '../types';
import { SOURCE_DIFFICULTY_MAP } from '../types';

// ============================================================
// Helper: Create mock articles for testing
// ============================================================

function createMockArticle(
  content: string,
  contentSource: ContentSource = 'current-affairs',
  difficulty: DifficultyLevel = 'advanced'
): NewsArticle {
  const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
  let currentIndex = 0;

  return {
    id: `test-article-${Date.now()}`,
    title: 'Test Article',
    summary: 'A test article for vocabulary identification.',
    content,
    sentences: sentences.map((text, idx) => {
      const trimmed = text.trim();
      const startIndex = content.indexOf(trimmed, currentIndex);
      const endIndex = startIndex + trimmed.length;
      currentIndex = endIndex;
      return {
        id: `test-s${idx}`,
        text: trimmed,
        startIndex,
        endIndex,
      };
    }),
    publishedAt: new Date(),
    source: 'Test Source',
    contentSource,
    difficulty,
  };
}

// ============================================================
// Tests: identifyKeyWords
// ============================================================

describe('identifyKeyWords', () => {
  it('should identify vocabulary words from article content', () => {
    const article = createMockArticle(
      'The environment needs conservation and cooperation from the community. Technology and communication are essential for modern life.',
      'junior-high',
      'intermediate'
    );

    const words = identifyKeyWords(article, 'intermediate');

    expect(words.length).toBeGreaterThan(0);
  });

  it('should only identify words that exist in the article text', () => {
    const article = createMockArticle(
      'The environment needs conservation and cooperation from the community. Technology helps us communicate better.',
      'junior-high',
      'intermediate'
    );

    const words = identifyKeyWords(article, 'advanced');

    for (const vocabWord of words) {
      const regex = new RegExp(`\\b${vocabWord.word}\\b`, 'i');
      expect(regex.test(article.content)).toBe(true);
    }
  });

  it('should assign valid difficulty levels to all identified words', () => {
    const article = createMockArticle(
      'The comprehensive regulatory framework addresses infrastructure and biodiversity conservation challenges.',
      'current-affairs',
      'advanced'
    );

    const words = identifyKeyWords(article, 'advanced');
    const validLevels: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];

    for (const word of words) {
      expect(validLevels).toContain(word.difficulty);
    }
  });

  it('should respect user level when filtering words (beginner)', () => {
    const article = createMockArticle(
      'The animal is beautiful and different from others. The comprehensive infrastructure requires regulatory oversight.',
      'elementary',
      'beginner'
    );

    const words = identifyKeyWords(article, 'beginner');

    // With beginner level, only beginner words should be included
    for (const word of words) {
      expect(word.difficulty).toBe('beginner');
    }
  });

  it('should include beginner and intermediate words for intermediate level', () => {
    const article = createMockArticle(
      'The environment is important for our community. Conservation and technology are essential.',
      'junior-high',
      'intermediate'
    );

    const words = identifyKeyWords(article, 'intermediate');
    const allowedLevels: DifficultyLevel[] = ['beginner', 'intermediate'];

    for (const word of words) {
      expect(allowedLevels).toContain(word.difficulty);
    }
  });

  it('should include all difficulty levels for advanced level', () => {
    const article = createMockArticle(
      'The comprehensive regulatory framework addresses infrastructure and biodiversity conservation. The environment is important and the community needs cooperation.',
      'current-affairs',
      'advanced'
    );

    const words = identifyKeyWords(article, 'advanced');
    const allowedLevels: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];

    for (const word of words) {
      expect(allowedLevels).toContain(word.difficulty);
    }
  });

  it('should return empty array for empty article content', () => {
    const article = createMockArticle('', 'elementary', 'beginner');
    const words = identifyKeyWords(article, 'beginner');
    expect(words).toHaveLength(0);
  });

  it('should include sourceArticleId for each word', () => {
    const article = createMockArticle(
      'Technology and communication are essential for the community.',
      'junior-high',
      'intermediate'
    );

    const words = identifyKeyWords(article, 'intermediate');

    for (const word of words) {
      expect(word.sourceArticleId).toBe(article.id);
    }
  });

  it('should include a source sentence for each identified word', () => {
    const article = createMockArticle(
      'The environment needs conservation. Technology helps us communicate.',
      'junior-high',
      'intermediate'
    );

    const words = identifyKeyWords(article, 'intermediate');

    for (const word of words) {
      expect(word.sourceSentence).toBeTruthy();
    }
  });
});

// ============================================================
// Tests: getWordDetails
// ============================================================

describe('getWordDetails', () => {
  it('should return non-empty pronunciation for a known word', async () => {
    const details = await getWordDetails('environment');

    expect(details.pronunciation).toBeTruthy();
    expect(details.pronunciation.length).toBeGreaterThan(0);
  });

  it('should return at least one Chinese definition', async () => {
    const details = await getWordDetails('technology');

    expect(details.definitions.length).toBeGreaterThanOrEqual(1);
    expect(details.definitions[0]!.chinese).toBeTruthy();
  });

  it('should return at least one example sentence', async () => {
    const details = await getWordDetails('conservation');

    expect(details.exampleSentences.length).toBeGreaterThanOrEqual(1);
    expect(details.exampleSentences[0]).toBeTruthy();
  });

  it('should return a non-empty part of speech', async () => {
    const details = await getWordDetails('comprehensive');

    expect(details.partOfSpeech).toBeTruthy();
    expect(details.partOfSpeech.length).toBeGreaterThan(0);
  });

  it('should handle unknown words gracefully', async () => {
    const details = await getWordDetails('xylophone');

    expect(details.pronunciation).toBeTruthy();
    expect(details.definitions.length).toBeGreaterThanOrEqual(1);
    expect(details.partOfSpeech).toBeTruthy();
  });

  it('should return correct difficulty for known words', async () => {
    const beginnerWord = await getWordDetails('family');
    const intermediateWord = await getWordDetails('environment');
    const advancedWord = await getWordDetails('comprehensive');

    expect(beginnerWord.difficulty).toBe('beginner');
    expect(intermediateWord.difficulty).toBe('intermediate');
    expect(advancedWord.difficulty).toBe('advanced');
  });
});

// ============================================================
// Tests: categorizeByDifficulty
// ============================================================

describe('categorizeByDifficulty', () => {
  it('should categorize words into three difficulty levels', () => {
    const words = ['family', 'environment', 'comprehensive', 'water', 'technology', 'infrastructure'];
    const categories = categorizeByDifficulty(words);

    expect(categories.has('beginner')).toBe(true);
    expect(categories.has('intermediate')).toBe(true);
    expect(categories.has('advanced')).toBe(true);
  });

  it('should place known beginner words in beginner category', () => {
    const words = ['family', 'water', 'school', 'happy'];
    const categories = categorizeByDifficulty(words);

    expect(categories.get('beginner')).toContain('family');
    expect(categories.get('beginner')).toContain('water');
    expect(categories.get('beginner')).toContain('school');
  });

  it('should place known intermediate words in intermediate category', () => {
    const words = ['environment', 'technology', 'conservation'];
    const categories = categorizeByDifficulty(words);

    expect(categories.get('intermediate')).toContain('environment');
    expect(categories.get('intermediate')).toContain('technology');
    expect(categories.get('intermediate')).toContain('conservation');
  });

  it('should place known advanced words in advanced category', () => {
    const words = ['comprehensive', 'infrastructure', 'unprecedented'];
    const categories = categorizeByDifficulty(words);

    expect(categories.get('advanced')).toContain('comprehensive');
    expect(categories.get('advanced')).toContain('infrastructure');
    expect(categories.get('advanced')).toContain('unprecedented');
  });

  it('should handle empty word list', () => {
    const categories = categorizeByDifficulty([]);

    expect(categories.get('beginner')).toHaveLength(0);
    expect(categories.get('intermediate')).toHaveLength(0);
    expect(categories.get('advanced')).toHaveLength(0);
  });

  it('should ensure each word appears in exactly one category', () => {
    const words = ['family', 'environment', 'comprehensive', 'water'];
    const categories = categorizeByDifficulty(words);

    const allCategorized = [
      ...categories.get('beginner')!,
      ...categories.get('intermediate')!,
      ...categories.get('advanced')!,
    ];

    expect(allCategorized.length).toBe(words.length);
    for (const word of words) {
      expect(allCategorized).toContain(word);
    }
  });
});

// ============================================================
// Tests: getVocabularyDifficultyForSource (SOURCE_DIFFICULTY_MAP)
// ============================================================

describe('getVocabularyDifficultyForSource', () => {
  it('should map current-affairs to advanced', () => {
    expect(getVocabularyDifficultyForSource('current-affairs')).toBe('advanced');
  });

  it('should map senior-high to advanced', () => {
    expect(getVocabularyDifficultyForSource('senior-high')).toBe('advanced');
  });

  it('should map junior-high to intermediate', () => {
    expect(getVocabularyDifficultyForSource('junior-high')).toBe('intermediate');
  });

  it('should map junior-senior-mixed to intermediate', () => {
    expect(getVocabularyDifficultyForSource('junior-senior-mixed')).toBe('intermediate');
  });

  it('should map elementary to beginner', () => {
    expect(getVocabularyDifficultyForSource('elementary')).toBe('beginner');
  });

  it('should match SOURCE_DIFFICULTY_MAP for all sources', () => {
    const allSources: ContentSource[] = [
      'current-affairs',
      'senior-high',
      'junior-high',
      'junior-senior-mixed',
      'elementary',
    ];

    for (const source of allSources) {
      expect(getVocabularyDifficultyForSource(source)).toBe(SOURCE_DIFFICULTY_MAP[source]);
    }
  });
});

// ============================================================
// Tests: Source-based difficulty adjustment (Requirement 10.7)
// ============================================================

describe('source-based difficulty adjustment', () => {
  const articleContent = 'The environment is important for our community. Conservation of biodiversity and comprehensive regulatory infrastructure are essential topics for advanced study. The animal family discovered a beautiful different water source.';

  it('should highlight fewer words for elementary source (beginner level)', () => {
    const article = createMockArticle(articleContent, 'elementary', 'beginner');
    const beginnerWords = identifyKeyWords(article, 'beginner');

    const article2 = createMockArticle(articleContent, 'current-affairs', 'advanced');
    const advancedWords = identifyKeyWords(article2, 'advanced');

    // Beginner level should highlight fewer words than advanced
    expect(beginnerWords.length).toBeLessThanOrEqual(advancedWords.length);
  });

  it('should adjust vocabulary based on ContentSource difficulty mapping', () => {
    const article = createMockArticle(
      'The comprehensive regulatory framework addresses infrastructure and biodiversity conservation. The environment and technology are essential.',
      'elementary',
      'beginner'
    );

    // When source is elementary, only beginner-level words should be highlighted
    const sourceLevel = getVocabularyDifficultyForSource('elementary');
    const words = identifyKeyWords(article, sourceLevel);

    for (const word of words) {
      expect(word.difficulty).toBe('beginner');
    }
  });

  it('should expand vocabulary range when switching to advanced source', () => {
    const article = createMockArticle(
      'The comprehensive regulatory framework addresses infrastructure and biodiversity conservation. The environment and technology are essential.',
      'current-affairs',
      'advanced'
    );

    const sourceLevel = getVocabularyDifficultyForSource('current-affairs');
    const words = identifyKeyWords(article, sourceLevel);

    // Advanced source should include words of all difficulty levels
    const difficulties = new Set(words.map((w) => w.difficulty));
    // At minimum, if there are advanced words in the text, they should be included
    const hasAdvancedOrIntermediate =
      difficulties.has('advanced') || difficulties.has('intermediate');
    expect(hasAdvancedOrIntermediate || words.length === 0).toBe(true);
  });
});


// ============================================================
// Helper: Create mock WordBankEntry for testing
// ============================================================

function createMockWordBankEntry(
  word: string,
  difficulty: DifficultyLevel = 'intermediate',
  overrides: Partial<VocabularyWord> = {}
): WordBankEntry {
  const vocabWord: VocabularyWord = {
    id: `word-${word}`,
    word,
    pronunciation: `/${word}/`,
    partOfSpeech: 'noun',
    definitions: [{ english: `Meaning of ${word}`, chinese: `${word}的中文释义` }],
    exampleSentences: [`The word "${word}" is used in this sentence.`],
    difficulty,
    sourceArticleId: `article-${word}`,
    sourceSentence: `This sentence contains the word ${word} for learning.`,
    ...overrides,
  };

  return {
    word: vocabWord,
    addedAt: new Date(),
    masteryLevel: 30,
    reviewCount: 2,
    lastReviewedAt: new Date(),
  };
}

// ============================================================
// Tests: generateTrainingExercises
// ============================================================

describe('generateTrainingExercises', () => {
  it('should return empty array for empty word list', () => {
    const exercises = generateTrainingExercises([]);
    expect(exercises).toHaveLength(0);
  });

  it('should generate exercises for a single word', () => {
    const words = [createMockWordBankEntry('environment')];
    const exercises = generateTrainingExercises(words);

    expect(exercises.length).toBeGreaterThan(0);
  });

  it('should include sourceArticleTitle for each exercise', () => {
    const words = [
      createMockWordBankEntry('environment'),
      createMockWordBankEntry('technology'),
    ];
    const exercises = generateTrainingExercises(words);

    for (const exercise of exercises) {
      expect(exercise.sourceArticleTitle).toBeTruthy();
      expect(exercise.sourceArticleTitle.length).toBeGreaterThan(0);
    }
  });

  it('should include sourceSentence for each exercise', () => {
    const words = [
      createMockWordBankEntry('environment'),
      createMockWordBankEntry('conservation'),
    ];
    const exercises = generateTrainingExercises(words);

    for (const exercise of exercises) {
      expect(exercise.sourceSentence).toBeDefined();
      expect(typeof exercise.sourceSentence).toBe('string');
    }
  });

  it('should produce at least one exercise of each type when given 3+ words', () => {
    const words = [
      createMockWordBankEntry('environment'),
      createMockWordBankEntry('technology'),
      createMockWordBankEntry('conservation'),
    ];
    const exercises = generateTrainingExercises(words);

    const types = exercises.map((e) => e.type);
    expect(types).toContain('spelling');
    expect(types).toContain('definition-matching');
    expect(types).toContain('context-fill');
  });

  it('should produce at least one exercise of each type when given more than 3 words', () => {
    const words = [
      createMockWordBankEntry('environment'),
      createMockWordBankEntry('technology'),
      createMockWordBankEntry('conservation'),
      createMockWordBankEntry('community'),
      createMockWordBankEntry('comprehensive'),
    ];
    const exercises = generateTrainingExercises(words);

    const types = exercises.map((e) => e.type);
    expect(types).toContain('spelling');
    expect(types).toContain('definition-matching');
    expect(types).toContain('context-fill');
  });

  it('should generate exercises with valid exercise types only', () => {
    const words = [
      createMockWordBankEntry('family'),
      createMockWordBankEntry('school'),
      createMockWordBankEntry('water'),
    ];
    const exercises = generateTrainingExercises(words);

    const validTypes = ['spelling', 'definition-matching', 'context-fill'];
    for (const exercise of exercises) {
      expect(validTypes).toContain(exercise.type);
    }
  });

  it('should include the word reference in each exercise', () => {
    const words = [
      createMockWordBankEntry('environment'),
      createMockWordBankEntry('technology'),
    ];
    const exercises = generateTrainingExercises(words);

    for (const exercise of exercises) {
      expect(exercise.word).toBeDefined();
      expect(exercise.word.word).toBeTruthy();
    }
  });

  it('should include a non-empty question for each exercise', () => {
    const words = [
      createMockWordBankEntry('environment'),
      createMockWordBankEntry('technology'),
      createMockWordBankEntry('conservation'),
    ];
    const exercises = generateTrainingExercises(words);

    for (const exercise of exercises) {
      expect(exercise.question).toBeTruthy();
      expect(exercise.question.length).toBeGreaterThan(0);
    }
  });

  it('should include a correctAnswer for each exercise', () => {
    const words = [
      createMockWordBankEntry('environment'),
      createMockWordBankEntry('technology'),
      createMockWordBankEntry('conservation'),
    ];
    const exercises = generateTrainingExercises(words);

    for (const exercise of exercises) {
      expect(exercise.correctAnswer).toBeTruthy();
      expect(exercise.correctAnswer.length).toBeGreaterThan(0);
    }
  });

  it('should generate definition-matching exercises with options', () => {
    const words = [
      createMockWordBankEntry('environment', 'intermediate', {
        definitions: [{ english: 'the natural world', chinese: '环境' }],
      }),
      createMockWordBankEntry('technology', 'intermediate', {
        definitions: [{ english: 'application of science', chinese: '技术' }],
      }),
      createMockWordBankEntry('conservation', 'intermediate', {
        definitions: [{ english: 'protection of resources', chinese: '保护' }],
      }),
    ];
    const exercises = generateTrainingExercises(words);

    const defMatchExercises = exercises.filter((e) => e.type === 'definition-matching');
    expect(defMatchExercises.length).toBeGreaterThan(0);

    for (const exercise of defMatchExercises) {
      expect(exercise.options).toBeDefined();
      expect(exercise.options!.length).toBeGreaterThanOrEqual(2);
      expect(exercise.options).toContain(exercise.correctAnswer);
    }
  });

  it('should generate context-fill exercises with blanks in the question', () => {
    const words = [
      createMockWordBankEntry('environment'),
      createMockWordBankEntry('technology'),
      createMockWordBankEntry('conservation'),
    ];
    const exercises = generateTrainingExercises(words);

    const contextFillExercises = exercises.filter((e) => e.type === 'context-fill');
    expect(contextFillExercises.length).toBeGreaterThan(0);

    for (const exercise of contextFillExercises) {
      expect(exercise.question).toContain('______');
    }
  });

  it('should generate unique exercise IDs', () => {
    const words = [
      createMockWordBankEntry('environment'),
      createMockWordBankEntry('technology'),
      createMockWordBankEntry('conservation'),
      createMockWordBankEntry('community'),
    ];
    const exercises = generateTrainingExercises(words);

    const ids = exercises.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should handle words without sourceSentence gracefully', () => {
    const words = [
      createMockWordBankEntry('environment', 'intermediate', { sourceSentence: '' }),
      createMockWordBankEntry('technology', 'intermediate', { sourceSentence: '' }),
      createMockWordBankEntry('conservation', 'intermediate', { sourceSentence: '' }),
    ];
    const exercises = generateTrainingExercises(words);

    expect(exercises.length).toBeGreaterThan(0);
    for (const exercise of exercises) {
      expect(exercise.question).toBeTruthy();
    }
  });
});
