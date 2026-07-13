/**
 * Vocabulary Module Service
 *
 * Implements the VocabularyModule interface for vocabulary identification,
 * word details retrieval, and difficulty categorization.
 *
 * Uses SOURCE_DIFFICULTY_MAP to map ContentSource to vocabulary difficulty thresholds.
 * When the data source switches, vocabulary highlighting adjusts based on the new
 * source's difficulty level.
 *
 * Currently uses a mock dictionary layer with built-in vocabulary data.
 * The real Dictionary API can be plugged in later by replacing the mockDictionaryLookup function.
 *
 * Requirements: 1.9, 3.1, 3.2, 3.4, 10.7
 */

import type {
  NewsArticle,
  DifficultyLevel,
  VocabularyWord,
  Definition,
  WordBankEntry,
  VocabExercise,
  ContentSource,
} from '../types';
import { SOURCE_DIFFICULTY_MAP } from '../types';
import { put, getAll, getByKey, STORE_NAMES } from '../utils/db';

// ============================================================
// VocabularyModule Interface
// ============================================================

export interface VocabularyModule {
  identifyKeyWords(article: NewsArticle, userLevel: DifficultyLevel): VocabularyWord[];
  getWordDetails(word: string): Promise<VocabularyWord>;
  addToWordBank(word: VocabularyWord): Promise<void>;
  getWordBank(): Promise<WordBankEntry[]>;
  generateTrainingExercises(words: WordBankEntry[]): VocabExercise[];
  updateMastery(wordId: string, correct: boolean): Promise<void>;
  categorizeByDifficulty(words: string[]): Map<DifficultyLevel, string[]>;
  organizeWordBank(entries: WordBankEntry[], sortBy: WordBankSortCriteria): WordBankEntry[];
}

// ============================================================
// Word Bank Sort Criteria
// ============================================================

export type WordBankSortCriteria = 'recency' | 'difficulty' | 'mastery';

// ============================================================
// Difficulty Threshold Configuration
// ============================================================

/**
 * Determines which difficulty levels of words to highlight based on source difficulty.
 * - beginner source: highlight beginner words only
 * - intermediate source: highlight beginner + intermediate words
 * - advanced source: highlight all difficulty levels
 */
function getDifficultyThreshold(sourceLevel: DifficultyLevel): DifficultyLevel[] {
  switch (sourceLevel) {
    case 'beginner':
      return ['beginner'];
    case 'intermediate':
      return ['beginner', 'intermediate'];
    case 'advanced':
      return ['beginner', 'intermediate', 'advanced'];
  }
}

/**
 * Returns the vocabulary difficulty threshold for a given ContentSource.
 * Uses SOURCE_DIFFICULTY_MAP to resolve the source to its difficulty level.
 */
export function getVocabularyDifficultyForSource(source: ContentSource): DifficultyLevel {
  return SOURCE_DIFFICULTY_MAP[source];
}

// ============================================================
// Built-in Vocabulary Database (Mock Dictionary Layer)
// ============================================================

interface DictionaryEntry {
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  definitions: Definition[];
  exampleSentences: string[];
  difficulty: DifficultyLevel;
}

/**
 * Built-in vocabulary categorized by difficulty level.
 * This serves as a mock dictionary that can be replaced with a real API later.
 */
const VOCABULARY_DATABASE: DictionaryEntry[] = [
  // === Beginner Words ===
  { word: 'family', pronunciation: '/ˈfæm.əl.i/', partOfSpeech: 'noun', definitions: [{ english: 'a group of people related to each other', chinese: '家庭' }], exampleSentences: ['My family has five members.'], difficulty: 'beginner' },
  { word: 'color', pronunciation: '/ˈkʌl.ər/', partOfSpeech: 'noun', definitions: [{ english: 'the property of producing different sensations on the eye', chinese: '颜色' }], exampleSentences: ['What color is your shirt?'], difficulty: 'beginner' },
  { word: 'animal', pronunciation: '/ˈæn.ɪ.məl/', partOfSpeech: 'noun', definitions: [{ english: 'a living creature that can move', chinese: '动物' }], exampleSentences: ['The dog is a friendly animal.'], difficulty: 'beginner' },
  { word: 'school', pronunciation: '/skuːl/', partOfSpeech: 'noun', definitions: [{ english: 'a place where children go to learn', chinese: '学校' }], exampleSentences: ['I go to school every day.'], difficulty: 'beginner' },
  { word: 'water', pronunciation: '/ˈwɔː.tər/', partOfSpeech: 'noun', definitions: [{ english: 'a clear liquid that falls as rain', chinese: '水' }], exampleSentences: ['Please drink more water.'], difficulty: 'beginner' },
  { word: 'fruit', pronunciation: '/fruːt/', partOfSpeech: 'noun', definitions: [{ english: 'the sweet product of a plant that contains seeds', chinese: '水果' }], exampleSentences: ['Apples are my favorite fruit.'], difficulty: 'beginner' },
  { word: 'happy', pronunciation: '/ˈhæp.i/', partOfSpeech: 'adjective', definitions: [{ english: 'feeling pleasure and enjoyment', chinese: '快乐的' }], exampleSentences: ['She feels happy today.'], difficulty: 'beginner' },
  { word: 'beautiful', pronunciation: '/ˈbjuː.tɪ.fəl/', partOfSpeech: 'adjective', definitions: [{ english: 'very attractive or pleasing', chinese: '美丽的' }], exampleSentences: ['The sunset is beautiful.'], difficulty: 'beginner' },
  { word: 'important', pronunciation: '/ɪmˈpɔːr.tənt/', partOfSpeech: 'adjective', definitions: [{ english: 'having great value or significance', chinese: '重要的' }], exampleSentences: ['Education is very important.'], difficulty: 'beginner' },
  { word: 'different', pronunciation: '/ˈdɪf.ər.ənt/', partOfSpeech: 'adjective', definitions: [{ english: 'not the same as another', chinese: '不同的' }], exampleSentences: ['Each person is different.'], difficulty: 'beginner' },
  { word: 'strong', pronunciation: '/strɒŋ/', partOfSpeech: 'adjective', definitions: [{ english: 'having great physical power', chinese: '强壮的' }], exampleSentences: ['The horse is very strong.'], difficulty: 'beginner' },
  { word: 'energy', pronunciation: '/ˈen.ər.dʒi/', partOfSpeech: 'noun', definitions: [{ english: 'the power to do work or be active', chinese: '能量' }], exampleSentences: ['Children have a lot of energy.'], difficulty: 'beginner' },
  { word: 'discover', pronunciation: '/dɪˈskʌv.ər/', partOfSpeech: 'verb', definitions: [{ english: 'to find something for the first time', chinese: '发现' }], exampleSentences: ['Scientists discover new things every day.'], difficulty: 'beginner' },

  // === Intermediate Words ===
  { word: 'communicate', pronunciation: '/kəˈmjuː.nɪ.keɪt/', partOfSpeech: 'verb', definitions: [{ english: 'to share information or feelings with others', chinese: '交流' }], exampleSentences: ['People communicate through language.'], difficulty: 'intermediate' },
  { word: 'environment', pronunciation: '/ɪnˈvaɪ.rən.mənt/', partOfSpeech: 'noun', definitions: [{ english: 'the natural world around us', chinese: '环境' }], exampleSentences: ['We must protect the environment.'], difficulty: 'intermediate' },
  { word: 'technology', pronunciation: '/tekˈnɒl.ə.dʒi/', partOfSpeech: 'noun', definitions: [{ english: 'the application of scientific knowledge for practical purposes', chinese: '技术' }], exampleSentences: ['Technology is changing rapidly.'], difficulty: 'intermediate' },
  { word: 'conservation', pronunciation: '/ˌkɒn.sɜːˈveɪ.ʃən/', partOfSpeech: 'noun', definitions: [{ english: 'the protection of natural resources', chinese: '保护' }], exampleSentences: ['Wildlife conservation is crucial.'], difficulty: 'intermediate' },
  { word: 'cooperation', pronunciation: '/kəʊˌɒp.ərˈeɪ.ʃən/', partOfSpeech: 'noun', definitions: [{ english: 'the act of working together toward a common goal', chinese: '合作' }], exampleSentences: ['International cooperation is essential.'], difficulty: 'intermediate' },
  { word: 'significant', pronunciation: '/sɪɡˈnɪf.ɪ.kənt/', partOfSpeech: 'adjective', definitions: [{ english: 'important or large enough to have an effect', chinese: '重要的；显著的' }], exampleSentences: ['This is a significant achievement.'], difficulty: 'intermediate' },
  { word: 'precipitation', pronunciation: '/prɪˌsɪp.ɪˈteɪ.ʃən/', partOfSpeech: 'noun', definitions: [{ english: 'rain, snow, or other forms of water falling from the sky', chinese: '降水' }], exampleSentences: ['Heavy precipitation is expected tomorrow.'], difficulty: 'intermediate' },
  { word: 'efficiency', pronunciation: '/ɪˈfɪʃ.ən.si/', partOfSpeech: 'noun', definitions: [{ english: 'the quality of doing something well with no waste', chinese: '效率' }], exampleSentences: ['We need to improve energy efficiency.'], difficulty: 'intermediate' },
  { word: 'phenomenon', pronunciation: '/fɪˈnɒm.ɪ.nən/', partOfSpeech: 'noun', definitions: [{ english: 'a fact or event that can be observed', chinese: '现象' }], exampleSentences: ['This is a natural phenomenon.'], difficulty: 'intermediate' },
  { word: 'perseverance', pronunciation: '/ˌpɜː.sɪˈvɪə.rəns/', partOfSpeech: 'noun', definitions: [{ english: 'continued effort despite difficulties', chinese: '坚持不懈' }], exampleSentences: ['Success requires perseverance.'], difficulty: 'intermediate' },
  { word: 'concentrate', pronunciation: '/ˈkɒn.sən.treɪt/', partOfSpeech: 'verb', definitions: [{ english: 'to focus attention or mental effort', chinese: '集中注意力' }], exampleSentences: ['Please concentrate on your work.'], difficulty: 'intermediate' },
  { word: 'perspective', pronunciation: '/pəˈspek.tɪv/', partOfSpeech: 'noun', definitions: [{ english: 'a particular way of thinking about something', chinese: '视角；观点' }], exampleSentences: ['Consider this from a different perspective.'], difficulty: 'intermediate' },
  { word: 'essential', pronunciation: '/ɪˈsen.ʃəl/', partOfSpeech: 'adjective', definitions: [{ english: 'absolutely necessary or extremely important', chinese: '必要的；本质的' }], exampleSentences: ['Water is essential for life.'], difficulty: 'intermediate' },
  { word: 'community', pronunciation: '/kəˈmjuː.nə.ti/', partOfSpeech: 'noun', definitions: [{ english: 'a group of people living in the same place or sharing interests', chinese: '社区；社群' }], exampleSentences: ['We should help our community.'], difficulty: 'intermediate' },

  // === Advanced Words ===
  { word: 'comprehensive', pronunciation: '/ˌkɒm.prɪˈhen.sɪv/', partOfSpeech: 'adjective', definitions: [{ english: 'including everything that is needed; complete', chinese: '全面的；综合的' }], exampleSentences: ['We need a comprehensive analysis.'], difficulty: 'advanced' },
  { word: 'infrastructure', pronunciation: '/ˈɪn.frəˌstrʌk.tʃər/', partOfSpeech: 'noun', definitions: [{ english: 'the basic systems and services of a country or organization', chinese: '基础设施' }], exampleSentences: ['The country needs better infrastructure.'], difficulty: 'advanced' },
  { word: 'unprecedented', pronunciation: '/ʌnˈpres.ɪ.den.tɪd/', partOfSpeech: 'adjective', definitions: [{ english: 'never having happened or existed before', chinese: '史无前例的' }], exampleSentences: ['This is an unprecedented event.'], difficulty: 'advanced' },
  { word: 'implementation', pronunciation: '/ˌɪm.plɪ.menˈteɪ.ʃən/', partOfSpeech: 'noun', definitions: [{ english: 'the process of putting a plan into effect', chinese: '实施；执行' }], exampleSentences: ['The implementation of the plan took months.'], difficulty: 'advanced' },
  { word: 'disproportionate', pronunciation: '/ˌdɪs.prəˈpɔː.ʃən.ət/', partOfSpeech: 'adjective', definitions: [{ english: 'too large or too small in comparison', chinese: '不成比例的' }], exampleSentences: ['The impact was disproportionate to the cause.'], difficulty: 'advanced' },
  { word: 'algorithmic', pronunciation: '/ˌæl.ɡəˈrɪð.mɪk/', partOfSpeech: 'adjective', definitions: [{ english: 'relating to a step-by-step procedure for calculation', chinese: '算法的' }], exampleSentences: ['Algorithmic trading is common in finance.'], difficulty: 'advanced' },
  { word: 'intermittency', pronunciation: '/ˌɪn.tərˈmɪ.tən.si/', partOfSpeech: 'noun', definitions: [{ english: 'the quality of stopping and starting repeatedly', chinese: '间歇性' }], exampleSentences: ['Intermittency is a challenge for solar power.'], difficulty: 'advanced' },
  { word: 'sophistication', pronunciation: '/səˌfɪs.tɪˈkeɪ.ʃən/', partOfSpeech: 'noun', definitions: [{ english: 'the quality of being complex or refined', chinese: '复杂性；精密' }], exampleSentences: ['The sophistication of modern AI is remarkable.'], difficulty: 'advanced' },
  { word: 'regulatory', pronunciation: '/ˈreɡ.jə.lə.tɔːr.i/', partOfSpeech: 'adjective', definitions: [{ english: 'relating to official rules or laws', chinese: '监管的；调控的' }], exampleSentences: ['The regulatory framework needs updating.'], difficulty: 'advanced' },
  { word: 'transparency', pronunciation: '/trænsˈpær.ən.si/', partOfSpeech: 'noun', definitions: [{ english: 'the quality of being open and honest', chinese: '透明度' }], exampleSentences: ['We demand greater transparency from the government.'], difficulty: 'advanced' },
  { word: 'biodiversity', pronunciation: '/ˌbaɪ.əʊ.daɪˈvɜː.sə.ti/', partOfSpeech: 'noun', definitions: [{ english: 'the variety of plant and animal life in an area', chinese: '生物多样性' }], exampleSentences: ['Biodiversity loss threatens ecosystems.'], difficulty: 'advanced' },
  { word: 'consolidate', pronunciation: '/kənˈsɒl.ɪ.deɪt/', partOfSpeech: 'verb', definitions: [{ english: 'to make stronger or more solid', chinese: '巩固' }], exampleSentences: ['We need to consolidate our position.'], difficulty: 'advanced' },
  { word: 'deployment', pronunciation: '/dɪˈplɔɪ.mənt/', partOfSpeech: 'noun', definitions: [{ english: 'the act of putting something into use', chinese: '部署；配置' }], exampleSentences: ['The deployment of new technology was successful.'], difficulty: 'advanced' },
];

// ============================================================
// Common/Stop Words (excluded from key word identification)
// ============================================================

const STOP_WORDS = new Set([
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
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you',
  'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his',
  'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself',
  'they', 'them', 'their', 'theirs', 'themselves', 'also', 'about',
  'up', 'there', 'here', 'while', 'although', 'since', 'until',
]);

// ============================================================
// Helper Functions
// ============================================================

/**
 * Extracts unique words from text content, filtering out stop words and short words.
 */
function extractWords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  // Remove duplicates preserving order
  return [...new Set(words)];
}

/**
 * Checks if a word exists within the article text content (case-insensitive).
 */
function wordExistsInArticle(word: string, articleContent: string): boolean {
  const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
  return regex.test(articleContent);
}

/**
 * Escapes special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Finds the first sentence in an article that contains the given word.
 */
function findSourceSentence(word: string, article: NewsArticle): string {
  const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
  const sentence = article.sentences.find((s) => regex.test(s.text));
  return sentence?.text || article.sentences[0]?.text || '';
}

/**
 * Looks up a word in the built-in vocabulary database.
 */
function lookupInDatabase(word: string): DictionaryEntry | undefined {
  return VOCABULARY_DATABASE.find(
    (entry) => entry.word.toLowerCase() === word.toLowerCase()
  );
}

/**
 * Assigns a difficulty level to a word based on common heuristics.
 * Words not in the database are assigned difficulty based on word length and complexity.
 */
function assignDifficulty(word: string): DifficultyLevel {
  // Check database first
  const entry = lookupInDatabase(word);
  if (entry) return entry.difficulty;

  // Heuristic-based assignment for unknown words
  const length = word.length;
  if (length <= 5) return 'beginner';
  if (length <= 9) return 'intermediate';
  return 'advanced';
}

// ============================================================
// Mock Dictionary API Layer
// ============================================================

/**
 * Simulates a Dictionary API call.
 * In production, this would call an external API like Oxford/Cambridge Dictionary API.
 * Returns word details including pronunciation, definitions, examples, and part of speech.
 */
async function mockDictionaryLookup(word: string): Promise<DictionaryEntry> {
  // Check built-in database first
  const entry = lookupInDatabase(word);
  if (entry) return entry;

  // Try the Free Dictionary API for real word data
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const firstEntry = data[0];
        const phonetic = firstEntry.phonetic || firstEntry.phonetics?.[0]?.text || `/${word}/`;
        
        // Extract meanings
        const meanings = firstEntry.meanings || [];
        const partOfSpeech = meanings[0]?.partOfSpeech || 'word';
        
        // Build definitions
        const definitions: { english: string; chinese: string }[] = [];
        const exampleSentences: string[] = [];
        
        for (const meaning of meanings.slice(0, 2)) {
          for (const def of (meaning.definitions || []).slice(0, 2)) {
            definitions.push({
              english: def.definition || '',
              chinese: '', // Will be filled by translation below
            });
            if (def.example) {
              exampleSentences.push(def.example);
            }
          }
        }

        // Try to get Chinese translation for definitions
        if (definitions.length > 0) {
          try {
            // Translate all definitions (batch the first 2)
            const textsToTranslate = definitions.slice(0, 2).map(d => d.english.substring(0, 100));
            const translationPromises = textsToTranslate.map(async (text) => {
              const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-CN`;
              const resp = await fetch(url);
              if (resp.ok) {
                const data = await resp.json();
                if (data?.responseData?.translatedText && data.responseData.translatedText !== text) {
                  return data.responseData.translatedText as string;
                }
              }
              return '';
            });
            const translations = await Promise.all(translationPromises);
            for (let i = 0; i < translations.length && i < definitions.length; i++) {
              if (translations[i] && definitions[i]) {
                definitions[i]!.chinese = translations[i]!;
              }
            }
          } catch {
            // Translation failed, leave chinese empty
          }
        }

        // If still no Chinese, provide placeholder
        for (const def of definitions) {
          if (!def.chinese) {
            def.chinese = def.english; // fallback to English definition
          }
        }

        const difficulty = assignDifficulty(word);
        return {
          word: word.toLowerCase(),
          pronunciation: phonetic,
          partOfSpeech,
          definitions: definitions.length > 0 ? definitions : [{ english: `Definition of ${word}`, chinese: word }],
          exampleSentences: exampleSentences.slice(0, 3),
          difficulty,
        };
      }
    }
  } catch {
    // API call failed, fall through to default
  }

  // Fallback for unknown words
  const difficulty = assignDifficulty(word);
  return {
    word: word.toLowerCase(),
    pronunciation: `/${word.toLowerCase()}/`,
    partOfSpeech: 'word',
    definitions: [
      {
        english: word,
        chinese: '(点击发音按钮听读音)',
      },
    ],
    exampleSentences: [],
    difficulty,
  };
}

// ============================================================
// Core Implementation
// ============================================================

/**
 * Identifies key vocabulary words in an article based on the user's difficulty level.
 * Uses SOURCE_DIFFICULTY_MAP to determine which difficulty levels to highlight.
 * Every identified word must exist within the article's text content.
 */
export function identifyKeyWords(
  article: NewsArticle,
  userLevel: DifficultyLevel
): VocabularyWord[] {
  const allowedDifficulties = getDifficultyThreshold(userLevel);
  const contentWords = extractWords(article.content);

  const keyWords: VocabularyWord[] = [];

  for (const word of contentWords) {
    // Ensure the word actually exists in the article text
    if (!wordExistsInArticle(word, article.content)) continue;

    const difficulty = assignDifficulty(word);

    // Only include words within the allowed difficulty range
    if (!allowedDifficulties.includes(difficulty)) continue;

    const dbEntry = lookupInDatabase(word);
    const sourceSentence = findSourceSentence(word, article);

    keyWords.push({
      id: `${article.id}-${word}`,
      word,
      pronunciation: dbEntry?.pronunciation || `/${word}/`,
      partOfSpeech: dbEntry?.partOfSpeech || '',
      definitions: dbEntry?.definitions || [
        { english: `Meaning of ${word}`, chinese: '' },
      ],
      exampleSentences: dbEntry?.exampleSentences || [],
      difficulty,
      sourceArticleId: article.id,
      sourceSentence,
    });
  }

  return keyWords;
}

/**
 * Retrieves detailed word information from the Dictionary API (mock).
 * Returns pronunciation, definitions, examples, and part of speech.
 */
export async function getWordDetails(word: string): Promise<VocabularyWord> {
  const entry = await mockDictionaryLookup(word);

  return {
    id: `dict-${word.toLowerCase()}`,
    word: entry.word,
    pronunciation: entry.pronunciation,
    partOfSpeech: entry.partOfSpeech,
    definitions: entry.definitions,
    exampleSentences: entry.exampleSentences,
    difficulty: entry.difficulty,
    sourceArticleId: '',
    sourceSentence: '',
  };
}

/**
 * Categorizes a list of words into beginner, intermediate, and advanced groups.
 */
export function categorizeByDifficulty(
  words: string[]
): Map<DifficultyLevel, string[]> {
  const categories = new Map<DifficultyLevel, string[]>([
    ['beginner', []],
    ['intermediate', []],
    ['advanced', []],
  ]);

  for (const word of words) {
    const difficulty = assignDifficulty(word);
    categories.get(difficulty)!.push(word);
  }

  return categories;
}

// ============================================================
// Word Bank Persistence & Management (Task 5.5)
// ============================================================

/**
 * Difficulty level numeric mapping for sorting purposes.
 */
const DIFFICULTY_ORDER: Record<DifficultyLevel, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

/**
 * Adds a word to the user's word bank with its context sentence.
 * Saves the word entry to IndexedDB wordBank store with initial mastery data.
 * Requirements: 3.5
 */
export async function addToWordBank(word: VocabularyWord): Promise<void> {
  const entry: WordBankEntry = {
    word,
    addedAt: new Date(),
    masteryLevel: 0,
    reviewCount: 0,
    lastReviewedAt: undefined,
  };
  // Save to local IndexedDB
  await put(STORE_NAMES.wordBank, entry);

  // Sync to Supabase cloud
  try {
    const { supabase } = await import('../utils/supabase');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { addWordToBank } = await import('./cloudSync');
      await addWordToBank(user.id, entry);
    }
  } catch {
    // Cloud sync failed silently — local copy is preserved
  }
}

/**
 * Retrieves all saved words from the word bank with mastery data.
 * Returns entries from IndexedDB wordBank store.
 * Requirements: 3.5, 6.5
 */
export async function getWordBank(): Promise<WordBankEntry[]> {
  const entries = await getAll(STORE_NAMES.wordBank);

  // If local is empty, try loading from cloud
  if (entries.length === 0) {
    try {
      const { supabase } = await import('../utils/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { getWordBank: getCloudWordBank } = await import('./cloudSync');
        const cloudEntries = await getCloudWordBank(user.id);
        if (cloudEntries.length > 0) {
          // Convert cloud entries to local format and cache
          const localEntries: WordBankEntry[] = cloudEntries.map(e => ({
            word: e.word_data as unknown as import('../types').VocabularyWord,
            addedAt: new Date(e.added_at),
            masteryLevel: e.mastery_level,
            reviewCount: e.review_count,
            lastReviewedAt: e.last_reviewed_at ? new Date(e.last_reviewed_at) : undefined,
          }));
          // Cache to IndexedDB
          for (const entry of localEntries) {
            await put(STORE_NAMES.wordBank, entry);
          }
          return localEntries;
        }
      }
    } catch {
      // Cloud fetch failed, return empty
    }
  }

  return entries;
}

/**
 * Updates mastery level for a word based on training results.
 * Correct answers increase mastery; incorrect answers decrease it.
 * Mastery is clamped to the 0-100 range.
 * Requirements: 3.5
 */
export async function updateMastery(wordId: string, correct: boolean): Promise<void> {
  const entry = await getByKey(STORE_NAMES.wordBank, wordId);
  if (!entry) return;

  const masteryDelta = correct ? 10 : -5;
  const newMastery = Math.max(0, Math.min(100, entry.masteryLevel + masteryDelta));

  const updated: WordBankEntry = {
    ...entry,
    masteryLevel: newMastery,
    reviewCount: entry.reviewCount + 1,
    lastReviewedAt: new Date(),
  };

  await put(STORE_NAMES.wordBank, updated);

  // Sync mastery update to cloud
  try {
    const { supabase } = await import('../utils/supabase');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { updateWordMastery } = await import('./cloudSync');
      await updateWordMastery(user.id, entry.word.word, newMastery, updated.reviewCount);
    }
  } catch {
    // Cloud sync failed silently
  }
}

/**
 * Organizes word bank entries by the specified sort criteria.
 * - recency: most recently added first
 * - difficulty: advanced first, then intermediate, then beginner
 * - mastery: lowest mastery first (words needing most practice)
 * Requirements: 6.5
 */
export function organizeWordBank(
  entries: WordBankEntry[],
  sortBy: WordBankSortCriteria
): WordBankEntry[] {
  const sorted = [...entries];

  switch (sortBy) {
    case 'recency':
      sorted.sort((a, b) => {
        const dateA = a.addedAt instanceof Date ? a.addedAt.getTime() : new Date(a.addedAt).getTime();
        const dateB = b.addedAt instanceof Date ? b.addedAt.getTime() : new Date(b.addedAt).getTime();
        return dateB - dateA; // Most recent first
      });
      break;
    case 'difficulty':
      sorted.sort((a, b) => {
        return DIFFICULTY_ORDER[b.word.difficulty] - DIFFICULTY_ORDER[a.word.difficulty]; // Advanced first
      });
      break;
    case 'mastery':
      sorted.sort((a, b) => {
        return a.masteryLevel - b.masteryLevel; // Lowest mastery first
      });
      break;
  }

  return sorted;
}

/**
 * Generates training exercises from word bank entries.
 * Creates spelling, definition-matching, and context-fill exercises.
 * Each exercise includes the source article title and source sentence.
 * When given 3+ words, guarantees at least one exercise of each type.
 * Requirements: 6.2, 6.3
 */
export function generateTrainingExercises(words: WordBankEntry[]): VocabExercise[] {
  if (words.length === 0) return [];

  const exercises: VocabExercise[] = [];
  const exerciseTypes: Array<'spelling' | 'definition-matching' | 'context-fill'> = [
    'spelling',
    'definition-matching',
    'context-fill',
  ];

  // For 3+ words, guarantee at least one of each type by assigning types round-robin
  // For fewer words, cycle through types for variety
  for (let i = 0; i < words.length; i++) {
    const entry = words[i];
    if (!entry) continue;
    const type = exerciseTypes[i % exerciseTypes.length]!;
    const exercise = createExercise(entry, type, words, i);
    exercises.push(exercise);
  }

  return exercises;
}

/**
 * Creates a single exercise of the specified type from a word bank entry.
 */
function createExercise(
  entry: WordBankEntry,
  type: 'spelling' | 'definition-matching' | 'context-fill',
  allWords: WordBankEntry[],
  index: number
): VocabExercise {
  const { word } = entry;
  const sourceArticleTitle = getSourceArticleTitle(word);
  const sourceSentence = word.sourceSentence || '';

  switch (type) {
    case 'spelling':
      return createSpellingExercise(word, sourceArticleTitle, sourceSentence, index);
    case 'definition-matching':
      return createDefinitionMatchingExercise(word, sourceArticleTitle, sourceSentence, allWords, index);
    case 'context-fill':
      return createContextFillExercise(word, sourceArticleTitle, sourceSentence, index);
  }
}

/**
 * Creates a spelling exercise where the user must spell the word from its definition.
 */
function createSpellingExercise(
  word: VocabularyWord,
  sourceArticleTitle: string,
  sourceSentence: string,
  index: number
): VocabExercise {
  const definition = word.definitions[0]?.chinese || word.definitions[0]?.english || word.word;
  return {
    id: `spelling-${word.id}-${index}`,
    type: 'spelling',
    word,
    question: `Spell the word that means: "${definition}"`,
    correctAnswer: word.word,
    sourceArticleTitle,
    sourceSentence,
  };
}

/**
 * Creates a definition-matching exercise where the user picks the correct definition.
 */
function createDefinitionMatchingExercise(
  word: VocabularyWord,
  sourceArticleTitle: string,
  sourceSentence: string,
  allWords: WordBankEntry[],
  index: number
): VocabExercise {
  const correctDef = word.definitions[0]?.chinese || word.definitions[0]?.english || 'Unknown';

  // Generate distractor options from other words in the bank
  const distractors: string[] = [];
  for (const other of allWords) {
    if (other.word.id === word.id) continue;
    const otherDef = other.word.definitions[0]?.chinese || other.word.definitions[0]?.english;
    if (otherDef && !distractors.includes(otherDef) && otherDef !== correctDef) {
      distractors.push(otherDef);
    }
    if (distractors.length >= 3) break;
  }

  // If not enough distractors from the word bank, add generic ones
  const genericDistractors = ['未知含义', '其他释义', '不相关的词'];
  while (distractors.length < 3) {
    const generic = genericDistractors[distractors.length];
    if (generic && !distractors.includes(generic) && generic !== correctDef) {
      distractors.push(generic);
    } else {
      break;
    }
  }

  // Shuffle options: insert correct answer at a deterministic position
  const options = [...distractors];
  const insertPos = index % (options.length + 1);
  options.splice(insertPos, 0, correctDef);

  return {
    id: `defmatch-${word.id}-${index}`,
    type: 'definition-matching',
    word,
    question: `Choose the correct definition for "${word.word}":`,
    options,
    correctAnswer: correctDef,
    sourceArticleTitle,
    sourceSentence,
  };
}

/**
 * Creates a context-fill exercise where the user fills in the blank in a sentence.
 */
function createContextFillExercise(
  word: VocabularyWord,
  sourceArticleTitle: string,
  sourceSentence: string,
  index: number
): VocabExercise {
  // Use the source sentence to create a fill-in-the-blank question
  let blankSentence: string;
  const regex = new RegExp(`\\b${escapeRegex(word.word)}\\b`, 'i');

  if (sourceSentence && regex.test(sourceSentence)) {
    blankSentence = sourceSentence.replace(regex, '______');
  } else if (word.exampleSentences.length > 0) {
    // Fallback to example sentences
    const example = word.exampleSentences[0]!;
    blankSentence = example.replace(regex, '______');
    if (!blankSentence.includes('______')) {
      blankSentence = `The word "______" appears in context: ${example}`;
    }
  } else {
    blankSentence = `Fill in the blank: ______ (${word.definitions[0]?.chinese || word.definitions[0]?.english || ''})`;
  }

  return {
    id: `ctxfill-${word.id}-${index}`,
    type: 'context-fill',
    word,
    question: `Fill in the blank: ${blankSentence}`,
    correctAnswer: word.word,
    sourceArticleTitle,
    sourceSentence,
  };
}

/**
 * Extracts the source article title from a vocabulary word.
 * Uses the sourceArticleId to derive a title string.
 */
function getSourceArticleTitle(word: VocabularyWord): string {
  // The word's sourceArticleId contains a reference to the article
  // In real usage, this would look up the article title from a cache
  // For now, derive a meaningful title from the available data
  if (word.sourceArticleId) {
    return `Article: ${word.sourceArticleId}`;
  }
  return 'Unknown Article';
}

// ============================================================
// Export VocabularyModule object (convenience grouping)
// ============================================================

export const vocabularyModule: VocabularyModule = {
  identifyKeyWords,
  getWordDetails,
  addToWordBank,
  getWordBank,
  generateTrainingExercises,
  updateMastery,
  categorizeByDifficulty,
  organizeWordBank,
};

export default vocabularyModule;
