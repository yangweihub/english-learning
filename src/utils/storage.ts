import type { ContentSource, UserProgress, UserSettings, LearningSession } from '../types';
import { DEFAULT_CONTENT_SOURCE } from '../types';

// ============================================================
// LocalStorage Schema Type Map
// ============================================================

/**
 * Defines the shape of all keys stored in LocalStorage.
 * Each key maps to a specific type for type-safe read/write.
 */
interface LocalStorageSchema {
  'user-progress': UserProgress;
  'user-settings': UserSettings;
  'daily-session': LearningSession;
  'selected-content-source': ContentSource;
}

// ============================================================
// Generic LocalStorage Utilities
// ============================================================

/**
 * Read a value from LocalStorage with type safety.
 * Returns `null` if the key doesn't exist or the stored value is invalid JSON.
 */
export function storageGet<K extends keyof LocalStorageSchema>(
  key: K
): LocalStorageSchema[K] | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as LocalStorageSchema[K];
  } catch {
    return null;
  }
}

/**
 * Write a value to LocalStorage with type safety.
 * Serializes the value as JSON.
 */
export function storageSet<K extends keyof LocalStorageSchema>(
  key: K,
  value: LocalStorageSchema[K]
): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable - fail silently
    console.warn(`[storage] Failed to write key "${key}" to LocalStorage.`);
  }
}

/**
 * Remove a key from LocalStorage.
 */
export function storageRemove<K extends keyof LocalStorageSchema>(key: K): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Fail silently
  }
}

// ============================================================
// ContentSourcePersistence Interface Implementation
// ============================================================

/**
 * Default content source used when no selection is stored.
 */
export const DEFAULT_SOURCE: ContentSource = DEFAULT_CONTENT_SOURCE;

/**
 * Save the user's selected content source to LocalStorage.
 * Stored under the key 'selected-content-source' for quick access.
 */
export function saveSelectedSource(source: ContentSource): void {
  storageSet('selected-content-source', source);
}

/**
 * Load the user's previously selected content source from LocalStorage.
 * Returns DEFAULT_SOURCE ('current-affairs') if no stored value is found.
 */
export function loadSelectedSource(): ContentSource {
  const stored = storageGet('selected-content-source');
  if (stored === null) return DEFAULT_SOURCE;
  return stored;
}

/**
 * ContentSourcePersistence object grouping all persistence operations.
 */
export const ContentSourcePersistence = {
  saveSelectedSource,
  loadSelectedSource,
  DEFAULT_SOURCE,
} as const;
