/**
 * Unit tests for Word Bank Persistence & Management (Task 5.5)
 *
 * Tests cover: addToWordBank, getWordBank, updateMastery, organizeWordBank
 *
 * Requirements: 3.5, 6.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  addToWordBank,
  getWordBank,
  updateMastery,
  organizeWordBank,
} from './vocabularyModule';
import type { VocabularyWord, WordBankEntry } from '../types';
import { deleteDatabase } from '../utils/db';

// ============================================================
// Helper: Create mock VocabularyWord
// ============================================================

function createMockWord(overrides: Partial<VocabularyWord> = {}): VocabularyWord {
  const id = overrides.id || `word-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    word: 'environment',
    pronunciation: '/ɪnˈvaɪ.rən.mənt/',
    partOfSpeech: 'noun',
    definitions: [{ english: 'the natural world around us', chinese: '环境' }],
    exampleSentences: ['We must protect the environment.'],
    difficulty: 'intermediate',
    sourceArticleId: 'article-1',
    sourceSentence: 'We must protect the environment for future generations.',
    ...overrides,
  };
}

// ============================================================
// Setup: Clean database before each test
// ============================================================

beforeEach(async () => {
  await deleteDatabase();
});

// ============================================================
// Tests: addToWordBank
// ============================================================

describe('addToWordBank', () => {
  it('should save a word to the word bank', async () => {
    const word = createMockWord({ id: 'test-word-1', word: 'technology' });
    await addToWordBank(word);

    const bank = await getWordBank();
    expect(bank).toHaveLength(1);
    expect(bank[0]!.word.word).toBe('technology');
  });

  it('should preserve the word text and definitions unchanged', async () => {
    const word = createMockWord({
      id: 'test-word-2',
      word: 'conservation',
      definitions: [
        { english: 'the protection of natural resources', chinese: '保护' },
      ],
    });
    await addToWordBank(word);

    const bank = await getWordBank();
    expect(bank[0]!.word.word).toBe('conservation');
    expect(bank[0]!.word.definitions).toEqual(word.definitions);
  });

  it('should preserve the context sentence', async () => {
    const sentence = 'Wildlife conservation is crucial for biodiversity.';
    const word = createMockWord({
      id: 'test-word-3',
      word: 'conservation',
      sourceSentence: sentence,
    });
    await addToWordBank(word);

    const bank = await getWordBank();
    expect(bank[0]!.word.sourceSentence).toBe(sentence);
  });

  it('should initialize mastery at 0', async () => {
    const word = createMockWord({ id: 'test-word-4' });
    await addToWordBank(word);

    const bank = await getWordBank();
    expect(bank[0]!.masteryLevel).toBe(0);
  });

  it('should initialize reviewCount at 0', async () => {
    const word = createMockWord({ id: 'test-word-5' });
    await addToWordBank(word);

    const bank = await getWordBank();
    expect(bank[0]!.reviewCount).toBe(0);
  });

  it('should set addedAt to a valid date', async () => {
    const before = new Date();
    const word = createMockWord({ id: 'test-word-6' });
    await addToWordBank(word);
    const after = new Date();

    const bank = await getWordBank();
    const addedAt = new Date(bank[0]!.addedAt);
    expect(addedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(addedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should save multiple words independently', async () => {
    const word1 = createMockWord({ id: 'test-word-7', word: 'environment' });
    const word2 = createMockWord({ id: 'test-word-8', word: 'technology' });
    const word3 = createMockWord({ id: 'test-word-9', word: 'infrastructure' });

    await addToWordBank(word1);
    await addToWordBank(word2);
    await addToWordBank(word3);

    const bank = await getWordBank();
    expect(bank).toHaveLength(3);
  });
});

// ============================================================
// Tests: getWordBank
// ============================================================

describe('getWordBank', () => {
  it('should return empty array when word bank is empty', async () => {
    const bank = await getWordBank();
    expect(bank).toEqual([]);
  });

  it('should return all saved words with mastery data', async () => {
    const word1 = createMockWord({ id: 'get-test-1', word: 'family' });
    const word2 = createMockWord({ id: 'get-test-2', word: 'school' });

    await addToWordBank(word1);
    await addToWordBank(word2);

    const bank = await getWordBank();
    expect(bank).toHaveLength(2);
    expect(bank.every((e) => typeof e.masteryLevel === 'number')).toBe(true);
    expect(bank.every((e) => typeof e.reviewCount === 'number')).toBe(true);
  });
});

// ============================================================
// Tests: updateMastery
// ============================================================

describe('updateMastery', () => {
  it('should increase mastery on correct answer', async () => {
    const word = createMockWord({ id: 'mastery-1' });
    await addToWordBank(word);

    await updateMastery('mastery-1', true);

    const bank = await getWordBank();
    expect(bank[0]!.masteryLevel).toBe(10);
  });

  it('should decrease mastery on incorrect answer', async () => {
    const word = createMockWord({ id: 'mastery-2' });
    await addToWordBank(word);

    // First increase so we can decrease
    await updateMastery('mastery-2', true);
    await updateMastery('mastery-2', true);
    await updateMastery('mastery-2', false);

    const bank = await getWordBank();
    // 0 + 10 + 10 - 5 = 15
    expect(bank[0]!.masteryLevel).toBe(15);
  });

  it('should not decrease mastery below 0', async () => {
    const word = createMockWord({ id: 'mastery-3' });
    await addToWordBank(word);

    await updateMastery('mastery-3', false);

    const bank = await getWordBank();
    expect(bank[0]!.masteryLevel).toBe(0);
  });

  it('should not increase mastery above 100', async () => {
    const word = createMockWord({ id: 'mastery-4' });
    await addToWordBank(word);

    // Add 10 * 11 = 110, should cap at 100
    for (let i = 0; i < 11; i++) {
      await updateMastery('mastery-4', true);
    }

    const bank = await getWordBank();
    expect(bank[0]!.masteryLevel).toBe(100);
  });

  it('should increment reviewCount on each update', async () => {
    const word = createMockWord({ id: 'mastery-5' });
    await addToWordBank(word);

    await updateMastery('mastery-5', true);
    await updateMastery('mastery-5', false);
    await updateMastery('mastery-5', true);

    const bank = await getWordBank();
    expect(bank[0]!.reviewCount).toBe(3);
  });

  it('should set lastReviewedAt after update', async () => {
    const word = createMockWord({ id: 'mastery-6' });
    await addToWordBank(word);

    const before = new Date();
    await updateMastery('mastery-6', true);
    const after = new Date();

    const bank = await getWordBank();
    const lastReviewed = new Date(bank[0]!.lastReviewedAt!);
    expect(lastReviewed.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(lastReviewed.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should not throw for non-existent word ID', async () => {
    await expect(updateMastery('nonexistent-id', true)).resolves.not.toThrow();
  });
});

// ============================================================
// Tests: organizeWordBank
// ============================================================

describe('organizeWordBank', () => {
  function createEntry(overrides: {
    word?: string;
    addedAt?: Date;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    masteryLevel?: number;
  }): WordBankEntry {
    return {
      word: createMockWord({
        id: `org-${Math.random().toString(36).slice(2)}`,
        word: overrides.word || 'test',
        difficulty: overrides.difficulty || 'intermediate',
      }),
      addedAt: overrides.addedAt || new Date(),
      masteryLevel: overrides.masteryLevel ?? 50,
      reviewCount: 0,
    };
  }

  it('should sort by recency (most recent first)', () => {
    const entries: WordBankEntry[] = [
      createEntry({ word: 'old', addedAt: new Date('2024-01-01') }),
      createEntry({ word: 'new', addedAt: new Date('2024-06-01') }),
      createEntry({ word: 'mid', addedAt: new Date('2024-03-01') }),
    ];

    const sorted = organizeWordBank(entries, 'recency');
    expect(sorted[0]!.word.word).toBe('new');
    expect(sorted[1]!.word.word).toBe('mid');
    expect(sorted[2]!.word.word).toBe('old');
  });

  it('should sort by difficulty (advanced first)', () => {
    const entries: WordBankEntry[] = [
      createEntry({ word: 'easy', difficulty: 'beginner' }),
      createEntry({ word: 'hard', difficulty: 'advanced' }),
      createEntry({ word: 'medium', difficulty: 'intermediate' }),
    ];

    const sorted = organizeWordBank(entries, 'difficulty');
    expect(sorted[0]!.word.difficulty).toBe('advanced');
    expect(sorted[1]!.word.difficulty).toBe('intermediate');
    expect(sorted[2]!.word.difficulty).toBe('beginner');
  });

  it('should sort by mastery (lowest first)', () => {
    const entries: WordBankEntry[] = [
      createEntry({ word: 'high', masteryLevel: 80 }),
      createEntry({ word: 'low', masteryLevel: 10 }),
      createEntry({ word: 'mid', masteryLevel: 50 }),
    ];

    const sorted = organizeWordBank(entries, 'mastery');
    expect(sorted[0]!.masteryLevel).toBe(10);
    expect(sorted[1]!.masteryLevel).toBe(50);
    expect(sorted[2]!.masteryLevel).toBe(80);
  });

  it('should not mutate the original array', () => {
    const entries: WordBankEntry[] = [
      createEntry({ word: 'b', addedAt: new Date('2024-01-01') }),
      createEntry({ word: 'a', addedAt: new Date('2024-06-01') }),
    ];

    const original = [...entries];
    organizeWordBank(entries, 'recency');

    expect(entries[0]!.word.word).toBe(original[0]!.word.word);
    expect(entries[1]!.word.word).toBe(original[1]!.word.word);
  });

  it('should handle empty array', () => {
    const sorted = organizeWordBank([], 'recency');
    expect(sorted).toEqual([]);
  });

  it('should handle single entry', () => {
    const entries = [createEntry({ word: 'solo' })];
    const sorted = organizeWordBank(entries, 'difficulty');
    expect(sorted).toHaveLength(1);
    expect(sorted[0]!.word.word).toBe('solo');
  });
});
