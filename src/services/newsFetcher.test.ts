/**
 * Unit tests for News Fetcher Service
 *
 * Tests cover: fetchArticles, filterBySource, getCachedArticles,
 * getArticleById, clearArticleCache, getAvailableSources
 */

import { describe, it, expect } from 'vitest';
import {
  fetchArticles,
  filterBySource,
  getAvailableSources,
  newsFetcher,
} from './newsFetcher';
import type { NewsArticle, ContentSource } from '../types';

// ============================================================
// Mock articles for filterBySource tests
// ============================================================

function createMockArticle(
  id: string,
  source: ContentSource
): NewsArticle {
  return {
    id,
    title: `Article ${id}`,
    summary: `Summary for article ${id}`,
    content: `Content of article ${id}. This is a test.`,
    sentences: [
      {
        id: `${id}-s0`,
        text: `Content of article ${id}.`,
        startIndex: 0,
        endIndex: 22,
      },
    ],
    publishedAt: new Date(),
    source: 'Test Source',
    contentSource: source,
    difficulty: 'intermediate',
  };
}

describe('newsFetcher', () => {
  describe('filterBySource', () => {
    it('should return only articles matching the specified source', () => {
      const articles: NewsArticle[] = [
        createMockArticle('1', 'current-affairs'),
        createMockArticle('2', 'junior-high'),
        createMockArticle('3', 'current-affairs'),
        createMockArticle('4', 'elementary'),
      ];

      const filtered = filterBySource(articles, 'current-affairs');

      expect(filtered).toHaveLength(2);
      expect(filtered.every((a) => a.contentSource === 'current-affairs')).toBe(true);
    });

    it('should return an empty array when no articles match the source', () => {
      const articles: NewsArticle[] = [
        createMockArticle('1', 'current-affairs'),
        createMockArticle('2', 'senior-high'),
      ];

      const filtered = filterBySource(articles, 'elementary');

      expect(filtered).toHaveLength(0);
    });

    it('should return an empty array when input is empty', () => {
      const filtered = filterBySource([], 'junior-high');

      expect(filtered).toHaveLength(0);
    });

    it('should return all articles when all match the source', () => {
      const articles: NewsArticle[] = [
        createMockArticle('1', 'senior-high'),
        createMockArticle('2', 'senior-high'),
        createMockArticle('3', 'senior-high'),
      ];

      const filtered = filterBySource(articles, 'senior-high');

      expect(filtered).toHaveLength(3);
    });
  });

  describe('getAvailableSources', () => {
    it('should return all five supported content sources', () => {
      const sources = getAvailableSources();

      expect(sources).toHaveLength(5);
      expect(sources).toContain('current-affairs');
      expect(sources).toContain('senior-high');
      expect(sources).toContain('junior-high');
      expect(sources).toContain('junior-senior-mixed');
      expect(sources).toContain('elementary');
    });

    it('should return a new array each time (not a reference)', () => {
      const sources1 = getAvailableSources();
      const sources2 = getAvailableSources();

      expect(sources1).not.toBe(sources2);
      expect(sources1).toEqual(sources2);
    });
  });

  describe('fetchArticles', () => {
    it('should return articles for the specified source', async () => {
      const result = await fetchArticles('current-affairs', 5);

      expect(result.articles.length).toBeGreaterThanOrEqual(1);
      expect(result.articles.every((a) => a.contentSource === 'current-affairs')).toBe(
        true
      );
      expect(result.fromCache).toBe(false);
    });

    it('should return articles with correct difficulty for source', async () => {
      const result = await fetchArticles('elementary', 3);

      expect(result.articles.every((a) => a.difficulty === 'beginner')).toBe(true);
    });

    it('should return articles with all required fields', async () => {
      const result = await fetchArticles('junior-high', 1);
      const article = result.articles[0]!;

      expect(article.id).toBeTruthy();
      expect(article.title).toBeTruthy();
      expect(article.summary).toBeTruthy();
      expect(article.content).toBeTruthy();
      expect(article.sentences.length).toBeGreaterThan(0);
      expect(article.publishedAt).toBeInstanceOf(Date);
      expect(article.source).toBeTruthy();
      expect(article.contentSource).toBe('junior-high');
    });

    it('should respect count parameter', async () => {
      const result = await fetchArticles('senior-high', 2);

      expect(result.articles).toHaveLength(2);
    });

    it('should generate sentences from article content', async () => {
      const result = await fetchArticles('current-affairs', 1);
      const article = result.articles[0]!;

      expect(article.sentences.length).toBeGreaterThan(0);
      article.sentences.forEach((sentence) => {
        expect(sentence.id).toBeTruthy();
        expect(sentence.text).toBeTruthy();
        expect(sentence.startIndex).toBeGreaterThanOrEqual(0);
        expect(sentence.endIndex).toBeGreaterThan(sentence.startIndex);
      });
    });
  });

  describe('newsFetcher object', () => {
    it('should expose all interface methods', () => {
      expect(typeof newsFetcher.fetchArticles).toBe('function');
      expect(typeof newsFetcher.filterBySource).toBe('function');
      expect(typeof newsFetcher.getCachedArticles).toBe('function');
      expect(typeof newsFetcher.getArticleById).toBe('function');
      expect(typeof newsFetcher.clearArticleCache).toBe('function');
      expect(typeof newsFetcher.getAvailableSources).toBe('function');
    });

    it('should fetch articles via the interface object', async () => {
      const articles = await newsFetcher.fetchArticles('junior-senior-mixed', 3);

      expect(articles.length).toBeGreaterThanOrEqual(1);
      expect(articles.every((a) => a.contentSource === 'junior-senior-mixed')).toBe(
        true
      );
    });
  });
});
