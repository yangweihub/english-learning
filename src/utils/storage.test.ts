import { describe, it, expect, beforeEach } from 'vitest';
import {
  storageGet,
  storageSet,
  storageRemove,
  saveSelectedSource,
  loadSelectedSource,
  ContentSourcePersistence,
  DEFAULT_SOURCE,
} from './storage';
import type { ContentSource } from '../types';

describe('storage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ----------------------------------------------------------
  // Generic storage helpers
  // ----------------------------------------------------------

  describe('storageGet / storageSet', () => {
    it('returns null for a key that does not exist', () => {
      expect(storageGet('user-settings')).toBeNull();
    });

    it('round-trips a value through set and get', () => {
      const source: ContentSource = 'junior-high';
      storageSet('selected-content-source', source);
      expect(storageGet('selected-content-source')).toBe(source);
    });

    it('returns null when stored value is invalid JSON', () => {
      localStorage.setItem('user-settings', '{not valid json');
      expect(storageGet('user-settings')).toBeNull();
    });
  });

  describe('storageRemove', () => {
    it('removes a previously stored key', () => {
      storageSet('selected-content-source', 'elementary');
      storageRemove('selected-content-source');
      expect(storageGet('selected-content-source')).toBeNull();
    });
  });

  // ----------------------------------------------------------
  // ContentSource persistence
  // ----------------------------------------------------------

  describe('ContentSource persistence', () => {
    it('DEFAULT_SOURCE is current-affairs', () => {
      expect(DEFAULT_SOURCE).toBe('current-affairs');
    });

    it('loadSelectedSource returns default when nothing is stored', () => {
      expect(loadSelectedSource()).toBe('current-affairs');
    });

    it('saveSelectedSource persists the value so loadSelectedSource retrieves it', () => {
      saveSelectedSource('senior-high');
      expect(loadSelectedSource()).toBe('senior-high');
    });

    it('round-trips all valid ContentSource values', () => {
      const sources: ContentSource[] = [
        'current-affairs',
        'senior-high',
        'junior-high',
        'junior-senior-mixed',
        'elementary',
      ];
      for (const source of sources) {
        saveSelectedSource(source);
        expect(loadSelectedSource()).toBe(source);
      }
    });

    it('ContentSourcePersistence object exposes consistent API', () => {
      expect(ContentSourcePersistence.DEFAULT_SOURCE).toBe('current-affairs');
      ContentSourcePersistence.saveSelectedSource('elementary');
      expect(ContentSourcePersistence.loadSelectedSource()).toBe('elementary');
    });
  });
});
