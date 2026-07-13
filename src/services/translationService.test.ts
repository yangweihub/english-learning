/**
 * Unit tests for TranslationService.
 *
 * Tests cover:
 * - Single sentence translation (Requirement 2.1, 2.2)
 * - Batch translation for full translation mode (Requirement 2.3)
 * - IndexedDB caching for offline use
 * - Graceful error handling with "翻译暂不可用" fallback
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTranslationService,
  createTranslationServiceWithAPI,
  TRANSLATION_UNAVAILABLE,
  type TranslationService,
} from './translationService';
import { deleteDatabase } from '../utils/db';

describe('TranslationService', () => {
  let service: TranslationService;

  beforeEach(async () => {
    // Reset database between tests
    await deleteDatabase();
    service = createTranslationService();
  });

  describe('translateSentence', () => {
    it('translates a sentence from the mock dictionary', async () => {
      const result = await service.translateSentence('Hello, world!');
      expect(result).toBe('你好，世界！');
    });

    it('returns a translation for unknown sentences (fallback when API unavailable)', async () => {
      // In test environment without network, the API call will fail and fallback is used
      const result = await service.translateSentence('This sentence is not in the dictionary.');
      // Should return either a real translation or the fallback format
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns empty string for empty input', async () => {
      const result = await service.translateSentence('');
      expect(result).toBe('');
    });

    it('returns empty string for whitespace-only input', async () => {
      const result = await service.translateSentence('   ');
      expect(result).toBe('');
    });

    it('caches successful translations for subsequent lookups', async () => {
      // First call should translate
      await service.translateSentence('Hello, world!');

      // Verify it's cached
      const cached = await service.getCachedTranslation('Hello, world!');
      expect(cached).toBe('你好，世界！');
    });
  });

  describe('translateBatch', () => {
    it('translates multiple sentences', async () => {
      const sentences = [
        'Hello, world!',
        'Practice makes perfect.',
        'Knowledge is power.',
      ];
      const results = await service.translateBatch(sentences);

      expect(results).toHaveLength(3);
      expect(results[0]).toBe('你好，世界！');
      expect(results[1]).toBe('熟能生巧。');
      expect(results[2]).toBe('知识就是力量。');
    });

    it('returns empty array for empty input', async () => {
      const results = await service.translateBatch([]);
      expect(results).toEqual([]);
    });

    it('handles empty strings within the batch', async () => {
      const sentences = ['Hello, world!', '', 'Knowledge is power.'];
      const results = await service.translateBatch(sentences);

      expect(results).toHaveLength(3);
      expect(results[0]).toBe('你好，世界！');
      expect(results[1]).toBe('');
      expect(results[2]).toBe('知识就是力量。');
    });

    it('uses cached translations when available', async () => {
      // Pre-cache a translation
      await service.translateSentence('Hello, world!');

      // Batch should use the cached version
      const results = await service.translateBatch(['Hello, world!']);
      expect(results[0]).toBe('你好，世界！');
    });

    it('caches all successful batch translations', async () => {
      await service.translateBatch(['Hello, world!', 'Practice makes perfect.']);

      const cached1 = await service.getCachedTranslation('Hello, world!');
      const cached2 = await service.getCachedTranslation('Practice makes perfect.');

      expect(cached1).toBe('你好，世界！');
      expect(cached2).toBe('熟能生巧。');
    });
  });

  describe('getCachedTranslation', () => {
    it('returns null when no cached translation exists', async () => {
      const result = await service.getCachedTranslation('Never translated before.');
      expect(result).toBeNull();
    });

    it('returns null for empty input', async () => {
      const result = await service.getCachedTranslation('');
      expect(result).toBeNull();
    });

    it('returns cached translation after a successful translate call', async () => {
      await service.translateSentence('The weather is nice today.');
      const cached = await service.getCachedTranslation('The weather is nice today.');
      expect(cached).toBe('今天天气很好。');
    });
  });

  describe('error handling', () => {
    it('returns "翻译暂不可用" when API call fails', async () => {
      // Use a service with a custom API function that throws
      const failingService = createTranslationServiceWithAPI(async () => {
        throw new Error('Network error');
      });

      const result = await failingService.translateSentence('Some sentence');
      expect(result).toBe(TRANSLATION_UNAVAILABLE);
    });

    it('returns "翻译暂不可用" for failed items in batch', async () => {
      const failingService = createTranslationServiceWithAPI(async () => {
        throw new Error('Network error');
      });

      const results = await failingService.translateBatch([
        'Sentence one.',
        'Sentence two.',
      ]);

      expect(results[0]).toBe(TRANSLATION_UNAVAILABLE);
      expect(results[1]).toBe(TRANSLATION_UNAVAILABLE);
    });
  });
});
