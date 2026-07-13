/**
 * IndexedDB database schema and helper utilities for English Learning News.
 *
 * Database: EnglishLearningNews
 * Object Stores:
 *   - articles: Article content cache (indexes: publishedAt, contentSource, difficulty)
 *   - wordBank: User vocabulary bank (indexes: addedAt, masteryLevel, difficulty)
 *   - knowledgePoints: Knowledge points store (indexes: type, grammarTopic, difficulty)
 *   - translations: Translation cache (no additional indexes)
 *   - quizHistory: Quiz session history (indexes: articleId, completedAt)
 */

import type {
  NewsArticle,
  WordBankEntry,
  KnowledgePoint,
  QuizSession,
} from '../types';

// ============================================================
// Database Constants
// ============================================================

export const DB_NAME = 'EnglishLearningNews';
export const DB_VERSION = 1;

export const STORE_NAMES = {
  articles: 'articles',
  wordBank: 'wordBank',
  knowledgePoints: 'knowledgePoints',
  translations: 'translations',
  quizHistory: 'quizHistory',
} as const;

export type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES];

// ============================================================
// Store Value Types
// ============================================================

export interface CachedArticle extends NewsArticle {
  cachedAt: Date;
}

export interface CachedTranslation {
  original: string;
  translation: string;
  cachedAt: Date;
}

export interface StoredKnowledgePoint extends KnowledgePoint {
  mastery: number;
  reviewCount: number;
}

/**
 * Maps store names to their value types for type-safe CRUD operations.
 */
export interface StoreValueMap {
  articles: CachedArticle;
  wordBank: WordBankEntry;
  knowledgePoints: StoredKnowledgePoint;
  translations: CachedTranslation;
  quizHistory: QuizSession;
}

// ============================================================
// Database Initialization
// ============================================================

let dbInstance: IDBDatabase | null = null;

/**
 * Opens (or creates) the EnglishLearningNews IndexedDB database.
 * Creates all object stores and their indexes on first run or version upgrade.
 */
export function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // articles store
      if (!db.objectStoreNames.contains(STORE_NAMES.articles)) {
        const articlesStore = db.createObjectStore(STORE_NAMES.articles, {
          keyPath: 'id',
        });
        articlesStore.createIndex('publishedAt', 'publishedAt', { unique: false });
        articlesStore.createIndex('contentSource', 'contentSource', { unique: false });
        articlesStore.createIndex('difficulty', 'difficulty', { unique: false });
      }

      // wordBank store
      if (!db.objectStoreNames.contains(STORE_NAMES.wordBank)) {
        const wordBankStore = db.createObjectStore(STORE_NAMES.wordBank, {
          keyPath: 'word.id',
        });
        wordBankStore.createIndex('addedAt', 'addedAt', { unique: false });
        wordBankStore.createIndex('masteryLevel', 'masteryLevel', { unique: false });
        wordBankStore.createIndex('difficulty', 'word.difficulty', { unique: false });
      }

      // knowledgePoints store
      if (!db.objectStoreNames.contains(STORE_NAMES.knowledgePoints)) {
        const knowledgeStore = db.createObjectStore(STORE_NAMES.knowledgePoints, {
          keyPath: 'id',
        });
        knowledgeStore.createIndex('type', 'type', { unique: false });
        knowledgeStore.createIndex('grammarTopic', 'grammarTopic', { unique: false });
        knowledgeStore.createIndex('difficulty', 'difficulty', { unique: false });
      }

      // translations store
      if (!db.objectStoreNames.contains(STORE_NAMES.translations)) {
        db.createObjectStore(STORE_NAMES.translations, {
          keyPath: 'original',
        });
      }

      // quizHistory store
      if (!db.objectStoreNames.contains(STORE_NAMES.quizHistory)) {
        const quizStore = db.createObjectStore(STORE_NAMES.quizHistory, {
          keyPath: 'articleId',
        });
        quizStore.createIndex('articleId', 'articleId', { unique: false });
        quizStore.createIndex('completedAt', 'completedAt', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(
        new Error(
          `Failed to open IndexedDB: ${(event.target as IDBOpenDBRequest).error?.message}`
        )
      );
    };
  });
}

/**
 * Closes the database connection and resets the cached instance.
 * Useful for testing or cleanup.
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Deletes the entire database. Use with caution — primarily for testing.
 */
export function deleteDatabase(): Promise<void> {
  closeDatabase();
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = (event) =>
      reject(
        new Error(
          `Failed to delete database: ${(event.target as IDBOpenDBRequest).error?.message}`
        )
      );
  });
}

// ============================================================
// Generic CRUD Helpers
// ============================================================

/**
 * Adds or updates a record in the specified object store.
 */
export async function put<S extends StoreName>(
  storeName: S,
  value: StoreValueMap[S]
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(value);
    request.onsuccess = () => resolve();
    request.onerror = (event) =>
      reject(
        new Error(
          `Put failed on ${storeName}: ${(event.target as IDBRequest).error?.message}`
        )
      );
  });
}

/**
 * Retrieves a single record by its key from the specified object store.
 */
export async function getByKey<S extends StoreName>(
  storeName: S,
  key: IDBValidKey
): Promise<StoreValueMap[S] | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result as StoreValueMap[S] | undefined);
    request.onerror = (event) =>
      reject(
        new Error(
          `Get failed on ${storeName}: ${(event.target as IDBRequest).error?.message}`
        )
      );
  });
}

/**
 * Retrieves all records from the specified object store.
 */
export async function getAll<S extends StoreName>(
  storeName: S
): Promise<StoreValueMap[S][]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as StoreValueMap[S][]);
    request.onerror = (event) =>
      reject(
        new Error(
          `GetAll failed on ${storeName}: ${(event.target as IDBRequest).error?.message}`
        )
      );
  });
}

/**
 * Retrieves all records matching a key on the specified index.
 */
export async function getAllByIndex<S extends StoreName>(
  storeName: S,
  indexName: string,
  key: IDBValidKey
): Promise<StoreValueMap[S][]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(key);
    request.onsuccess = () => resolve(request.result as StoreValueMap[S][]);
    request.onerror = (event) =>
      reject(
        new Error(
          `GetAllByIndex failed on ${storeName}.${indexName}: ${(event.target as IDBRequest).error?.message}`
        )
      );
  });
}

/**
 * Deletes a record by its key from the specified object store.
 */
export async function deleteByKey<S extends StoreName>(
  storeName: S,
  key: IDBValidKey
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = (event) =>
      reject(
        new Error(
          `Delete failed on ${storeName}: ${(event.target as IDBRequest).error?.message}`
        )
      );
  });
}

/**
 * Clears all records in the specified object store.
 */
export async function clearStore<S extends StoreName>(storeName: S): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = (event) =>
      reject(
        new Error(
          `Clear failed on ${storeName}: ${(event.target as IDBRequest).error?.message}`
        )
      );
  });
}

/**
 * Counts records in the specified object store.
 */
export async function countRecords<S extends StoreName>(storeName: S): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) =>
      reject(
        new Error(
          `Count failed on ${storeName}: ${(event.target as IDBRequest).error?.message}`
        )
      );
  });
}

/**
 * Adds multiple records to the specified object store in a single transaction.
 */
export async function putMany<S extends StoreName>(
  storeName: S,
  values: StoreValueMap[S][]
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    for (const value of values) {
      store.put(value);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = (event) =>
      reject(
        new Error(
          `PutMany failed on ${storeName}: ${(event.target as IDBTransaction).error?.message}`
        )
      );
  });
}
