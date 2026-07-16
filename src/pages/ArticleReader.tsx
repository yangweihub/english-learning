/**
 * ArticleReader Page
 *
 * Displays a full article with paragraph-level formatting, sentence-level
 * Chinese translation toggle, vocabulary highlighting, word popup with
 * pronunciation/definition/examples, and long-press dictionary lookup.
 *
 * Requirements: 1.6, 1.9, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.5
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { NewsArticle, VocabularyWord, KnowledgePoint, DifficultyLevel } from '../types';
import { SOURCE_DIFFICULTY_MAP } from '../types';
import { getArticleById } from '../services/newsFetcher';
import { translationService } from '../services/translationService';
import {
  identifyKeyWords,
  getWordDetails,
  addToWordBank,
} from '../services/vocabularyModule';
import { identifyKnowledgePoints } from '../services/knowledgeExpander';
import { KnowledgePointTag } from '../components/KnowledgePointTag';
import { useProgressStore } from '../stores/progressStore';

// ============================================================
// Props
// ============================================================

export interface ArticleReaderProps {
  articleId: string;
}

// ============================================================
// Word Popup State
// ============================================================

interface WordPopupState {
  word: VocabularyWord | null;
  visible: boolean;
  x: number;
  y: number;
}

// ============================================================
// Component
// ============================================================

export const ArticleReader: React.FC<ArticleReaderProps> = ({ articleId }) => {
  // --- State ---
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Progress tracking
  const addArticleRead = useProgressStore((s) => s.addArticleRead);
  const addWordsLearned = useProgressStore((s) => s.addWordsLearned);

  // Translation state
  const [sentenceTranslations, setSentenceTranslations] = useState<
    Record<string, string>
  >({});
  const [visibleTranslations, setVisibleTranslations] = useState<Set<string>>(
    new Set()
  );
  const [fullTranslationMode, setFullTranslationMode] = useState(false);
  const [titleTranslation, setTitleTranslation] = useState<string | null>(null);
  const [summaryTranslation, setSummaryTranslation] = useState<string | null>(null);

  // Vocabulary state
  const [keyWords, setKeyWords] = useState<VocabularyWord[]>([]);
  const [highlightedWordsSet, setHighlightedWordsSet] = useState<Set<string>>(
    new Set()
  );

  // Knowledge points state
  const [knowledgePointsBySentence, setKnowledgePointsBySentence] = useState<
    Record<string, KnowledgePoint[]>
  >({});

  // Word popup state
  const [popup, setPopup] = useState<WordPopupState>({
    word: null,
    visible: false,
    x: 0,
    y: 0,
  });
  const [addedToBank, setAddedToBank] = useState<Set<string>>(new Set());

  // ============================================================
  // Load article
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    async function loadArticle() {
      setLoading(true);
      setError(null);

      try {
        const fetched = await getArticleById(articleId);
        if (cancelled) return;

        if (!fetched) {
          setError('文章加载失败，请稍后重试');
          setLoading(false);
          return;
        }

        setArticle(fetched);

        // Track article read in progress
        addArticleRead(fetched.id);

        // Identify key vocabulary based on content source difficulty
        const difficultyLevel: DifficultyLevel =
          SOURCE_DIFFICULTY_MAP[fetched.contentSource];
        const words = identifyKeyWords(fetched, difficultyLevel);
        setKeyWords(words);
        setHighlightedWordsSet(
          new Set(words.map((w) => w.word.toLowerCase()))
        );

        // Identify knowledge points (grammar, idioms, cultural references)
        const points = identifyKnowledgePoints(fetched);

        // Map knowledge points to their source sentences
        const pointsBySentence: Record<string, KnowledgePoint[]> = {};
        for (const point of points) {
          for (const sentence of fetched.sentences) {
            if (sentence.text === point.sourceSentence) {
              if (!pointsBySentence[sentence.id]) {
                pointsBySentence[sentence.id] = [];
              }
              pointsBySentence[sentence.id]!.push(point);
              break;
            }
          }
        }
        setKnowledgePointsBySentence(pointsBySentence);
      } catch {
        if (!cancelled) {
          setError('文章加载失败，请检查网络连接');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadArticle();
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  // ============================================================
  // Translation handlers
  // ============================================================

  const translateSentence = useCallback(
    async (sentenceId: string, text: string) => {
      if (sentenceTranslations[sentenceId]) {
        // Toggle visibility
        setVisibleTranslations((prev) => {
          const next = new Set(prev);
          if (next.has(sentenceId)) {
            next.delete(sentenceId);
          } else {
            next.add(sentenceId);
          }
          return next;
        });
        return;
      }

      // Fetch translation
      const translation = await translationService.translateSentence(text);
      setSentenceTranslations((prev) => ({
        ...prev,
        [sentenceId]: translation,
      }));
      setVisibleTranslations((prev) => new Set(prev).add(sentenceId));
    },
    [sentenceTranslations]
  );

  const toggleFullTranslation = useCallback(async () => {
    if (!article) return;

    if (fullTranslationMode) {
      // Turn off full translation mode
      setFullTranslationMode(false);
      setVisibleTranslations(new Set());
      return;
    }

    // Enable full translation mode - translate all sentences
    setFullTranslationMode(true);

    const sentences = article.sentences;
    const textsToTranslate = sentences
      .filter((s) => !sentenceTranslations[s.id])
      .map((s) => s.text);

    if (textsToTranslate.length > 0) {
      const translations =
        await translationService.translateBatch(textsToTranslate);
      const newTranslations: Record<string, string> = {};
      let idx = 0;
      for (const s of sentences) {
        if (!sentenceTranslations[s.id]) {
          newTranslations[s.id] = translations[idx] ?? '';
          idx++;
        }
      }
      setSentenceTranslations((prev) => ({ ...prev, ...newTranslations }));
    }

    // Make all translations visible
    setVisibleTranslations(new Set(sentences.map((s) => s.id)));
  }, [article, fullTranslationMode, sentenceTranslations]);

  // ============================================================
  // Word click handler - shows detailed popup for ANY word
  // ============================================================

  const handleWordClick = useCallback(
    async (cleanWord: string, originalToken: string, event: React.MouseEvent) => {
      event.stopPropagation();
      if (!cleanWord) return;

      // Show popup immediately with basic info (no delay)
      const instantWord: VocabularyWord = {
        id: `loading-${cleanWord}`,
        word: cleanWord,
        pronunciation: '',
        partOfSpeech: '',
        definitions: [{ english: '', chinese: '加载中...' }],
        exampleSentences: [],
        difficulty: 'intermediate',
        sourceArticleId: article?.id ?? '',
        sourceSentence: '',
      };
      setPopup({ word: instantWord, visible: true, x: event.clientX, y: event.clientY });

      // Then lazy-load full details from API
      try {
        const details = await getWordDetails(cleanWord);
        setPopup((prev) => prev.visible ? { ...prev, word: details } : prev);
      } catch {
        // Keep the loading state but update message
        setPopup((prev) => prev.visible ? {
          ...prev,
          word: { ...instantWord, definitions: [{ english: cleanWord, chinese: '(暂无翻译)' }] }
        } : prev);
      }
    },
    [article]
  );

  const handleAddToWordBank = useCallback(async () => {
    if (!popup.word) return;
    try {
      await addToWordBank(popup.word);
      setAddedToBank((prev) => new Set(prev).add(popup.word!.id));
      addWordsLearned(1);
    } catch {
      // Word bank save failed silently
    }
  }, [popup.word, addWordsLearned]);

  // Add phrase to phrase bank (localStorage + Supabase cloud)
  const handleAddPhrase = useCallback((phrase: string) => {
    try {
      const stored = localStorage.getItem('phrase-bank');
      const bank: string[] = stored ? JSON.parse(stored) : [];
      if (!bank.includes(phrase)) {
        bank.push(phrase);
        localStorage.setItem('phrase-bank', JSON.stringify(bank));
      }
      // Sync to Supabase
      import('../utils/supabase').then(({ supabase }) => {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            supabase.from('phrase_bank').insert({
              user_id: user.id,
              phrase,
            }).then(() => {});
          }
        });
      });
    } catch {
      // silent
    }
  }, []);

  const closePopup = useCallback(() => {
    setPopup({ word: null, visible: false, x: 0, y: 0 });
  }, []);

  // Close popup when clicking outside
  useEffect(() => {
    if (!popup.visible) return;

    const handleClick = () => closePopup();
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClick);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClick);
    };
  }, [popup.visible, closePopup]);

  // ============================================================
  // Render helpers
  // ============================================================

  /**
   * Renders a sentence with all words clickable (no style distinction).
   * Any word can be tapped to show detailed popup.
   */
  const renderSentenceText = (text: string) => {
    // Split text into words while preserving whitespace and punctuation
    const tokens = text.split(/(\s+)/);

    return tokens.map((token, idx) => {
      // If it's whitespace, render as-is
      if (/^\s+$/.test(token)) {
        return <span key={idx}>{token}</span>;
      }

      // Extract the core word (strip punctuation for matching)
      const cleanWord = token.replace(/[^a-zA-Z'-]/g, '').toLowerCase();

      // All words are clickable, no style distinction
      if (cleanWord.length > 0) {
        return (
          <span
            key={idx}
            className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded px-0.5 transition-colors"
            role="button"
            tabIndex={0}
            onClick={(e) => handleWordClick(cleanWord, token, e)}
          >
            {token}
          </span>
        );
      }

      // Punctuation only
      return <span key={idx}>{token}</span>;
    });
  };

  // ============================================================
  // Render: Loading state
  // ============================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" role="status">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-600 dark:text-gray-300">
          加载文章中...
        </span>
      </div>
    );
  }

  // ============================================================
  // Render: Error state
  // ============================================================

  if (error || !article) {
    return (
      <div className="p-6 text-center" role="alert">
        <p className="text-red-600 dark:text-red-400 text-lg">
          {error || '文章不存在'}
        </p>
      </div>
    );
  }

  // ============================================================
  // Render: Article
  // ============================================================

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6" data-testid="article-reader">
      {/* Article Header */}
      <header className="mb-6">
        {/* Title - click to translate */}
        <h1
          className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 cursor-pointer hover:text-primary-700 dark:hover:text-primary-400 transition-colors"
          onClick={async () => {
            if (titleTranslation) { setTitleTranslation(null); return; }
            const t = await translationService.translateSentence(article.title);
            setTitleTranslation(t);
          }}
          title="点击翻译标题"
        >
          {article.title}
        </h1>
        {titleTranslation && (
          <p className="text-base text-blue-700 dark:text-blue-300 italic mb-2 pl-3 border-l-2 border-blue-300 dark:border-blue-600">
            {titleTranslation}
          </p>
        )}
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span>{article.source}</span>
          <span>•</span>
          <time dateTime={article.publishedAt.toISOString?.() ?? ''}>
            {new Date(article.publishedAt).toLocaleDateString('zh-CN')}
          </time>
          <span>•</span>
          <span className="capitalize">{article.difficulty}</span>
        </div>
        {/* Summary - click to translate */}
        <p
          className="mt-3 text-gray-600 dark:text-gray-300 italic cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          onClick={async () => {
            if (summaryTranslation) { setSummaryTranslation(null); return; }
            const t = await translationService.translateSentence(article.summary);
            setSummaryTranslation(t);
          }}
          title="点击翻译概述"
        >
          {article.summary}
        </p>
        {summaryTranslation && (
          <p className="mt-1 text-sm text-blue-700 dark:text-blue-300 italic pl-3 border-l-2 border-blue-300 dark:border-blue-600">
            {summaryTranslation}
          </p>
        )}
      </header>

      {/* Translation Controls */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <button
          onClick={toggleFullTranslation}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            fullTranslationMode
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
          aria-pressed={fullTranslationMode}
        >
          {fullTranslationMode ? '关闭全文翻译' : '开启全文翻译'}
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          点击句子可查看单句翻译
        </span>
      </div>

      {/* Article Content - Paragraph-level formatting */}
      <article className="prose dark:prose-invert max-w-none">
        {article.sentences.map((sentence) => (
          <div key={sentence.id} className="mb-3">
            {/* English text */}
            <p
              className="text-base md:text-lg leading-relaxed text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded px-1 -mx-1 transition-colors"
              onClick={() => translateSentence(sentence.id, sentence.text)}
              role="button"
              tabIndex={0}
              aria-label={`Sentence: ${sentence.text}. Tap to toggle translation.`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  translateSentence(sentence.id, sentence.text);
                }
              }}
            >
              {renderSentenceText(sentence.text)}
            </p>

            {/* Knowledge Point Tags for this sentence */}
            {knowledgePointsBySentence[sentence.id] &&
              knowledgePointsBySentence[sentence.id]!.length > 0 && (
                <div
                  className="flex flex-wrap gap-1.5 mt-1 ml-1"
                  data-testid={`knowledge-tags-${sentence.id}`}
                >
                  {knowledgePointsBySentence[sentence.id]!.map((point) => (
                    <KnowledgePointTag
                      key={point.id}
                      point={point}
                      onNavigateToRelated={(related) => {
                        // Scroll to the sentence containing the related point
                        const targetSentenceId = article.sentences.find(
                          (s) => s.text === related.sourceSentence
                        )?.id;
                        if (targetSentenceId) {
                          const el = document.querySelector(
                            `[data-testid="knowledge-tags-${targetSentenceId}"]`
                          );
                          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                    />
                  ))}
                </div>
              )}

            {/* Chinese translation (shown/hidden per sentence) */}
            {visibleTranslations.has(sentence.id) &&
              sentenceTranslations[sentence.id] && (
                <p
                  className="mt-1 text-sm md:text-base text-blue-700 dark:text-blue-300 italic pl-3 border-l-2 border-blue-300 dark:border-blue-600"
                  lang="zh-CN"
                  data-testid={`translation-${sentence.id}`}
                >
                  {sentenceTranslations[sentence.id]}
                </p>
              )}
          </div>
        ))}
      </article>

      {/* Word Popup - Centered modal with scrollable content */}
      {popup.visible && popup.word && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 dark:bg-black/40"
          onClick={closePopup}
        >
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-full max-w-sm max-h-[80vh] overflow-y-auto"
          role="dialog"
          aria-label={`Word details: ${popup.word.word}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Word Header + Pronunciation */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {popup.word.word}
              </h3>
              {/* Play pronunciation button */}
              <button
                onClick={() => {
                  const utterance = new SpeechSynthesisUtterance(popup.word!.word);
                  utterance.lang = 'en-US';
                  utterance.rate = 0.8;
                  speechSynthesis.speak(utterance);
                }}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="播放发音"
                title="点击播放发音"
              >
                🔊
              </button>
            </div>
            <button
              onClick={closePopup}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
              aria-label="Close popup"
            >
              ×
            </button>
          </div>

          {/* Pronunciation text */}
          {popup.word.pronunciation && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {popup.word.pronunciation}
            </p>
          )}

          {/* Part of Speech */}
          {popup.word.partOfSpeech && (
            <span className="inline-block text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded mb-2">
              {popup.word.partOfSpeech}
            </span>
          )}

          {/* Definitions / Translation - only show first 2, avoid duplicates */}
          <div className="mb-2">
            {popup.word.definitions
              .filter((def, idx, arr) => {
                // Remove duplicates where chinese === english
                if (def.chinese === def.english) return idx === 0;
                return true;
              })
              .slice(0, 2)
              .map((def, idx) => (
              <div key={idx} className="mb-1">
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  {def.chinese && def.chinese !== def.english ? def.chinese : ''}
                </p>
                <ClickToTranslate text={def.english} />
              </div>
            ))}
          </div>

          {/* Word Forms: based on part of speech */}
          <WordFormsSection word={popup.word.word} partOfSpeech={popup.word.partOfSpeech} />

          {/* Common Phrases / Collocations - clickable to translate, with add to phrase bank */}
          <CommonPhrasesSection word={popup.word.word} articleContent={article?.content} onAddPhrase={handleAddPhrase} />

          {/* Example Sentences - clickable to translate */}
          {popup.word.exampleSentences.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                例句:
              </p>
              {popup.word.exampleSentences.slice(0, 2).map((ex, idx) => (
                <TranslatableText key={idx} text={ex} />
              ))}
            </div>
          )}

          {/* Related / Extended Words */}
          <RelatedWordsSection word={popup.word.word} partOfSpeech={popup.word.partOfSpeech} />

          {/* Add to Word Bank Button */}
          <button
            onClick={handleAddToWordBank}
            disabled={addedToBank.has(popup.word.id)}
            className={`w-full py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              addedToBank.has(popup.word.id)
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 cursor-default'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {addedToBank.has(popup.word.id) ? '✓ 已加入生词本' : '+ 加入生词本'}
          </button>
        </div>
        </div>
      )}

      {/* Action Buttons: Back to list & Start Quiz */}
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 border-t border-gray-200 dark:border-gray-700 pt-6">
        <button
          onClick={() => { window.location.hash = '#/'; }}
          className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          ← 返回文章列表
        </button>
        <button
          onClick={() => {
            if (article) {
              const startQuiz = (window as unknown as Record<string, unknown>).__startQuiz as ((a: NewsArticle) => void) | undefined;
              if (startQuiz) {
                startQuiz(article);
              }
            }
          }}
          className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          开始测验 →
        </button>
      </div>
    </div>
  );
};

// ============================================================
// TranslatableText - Click any text to see inline translation
// ============================================================

function TranslatableText({ text }: { text: string }) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (translation !== null) {
      setTranslation(null);
      return;
    }
    setLoading(true);
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.substring(0, 100))}&langpair=en|zh-CN`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        if (data?.responseData?.translatedText) {
          setTranslation(data.responseData.translatedText);
        } else {
          setTranslation('(翻译失败)');
        }
      } else {
        setTranslation('(翻译失败)');
      }
    } catch {
      setTranslation('(翻译失败)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-1">
      <p
        className="text-xs text-gray-600 dark:text-gray-400 italic cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        onClick={handleClick}
        title="点击翻译"
      >
        • {text} {loading && <span className="text-gray-400">⏳</span>}
      </p>
      {translation && (
        <p className="text-xs text-blue-600 dark:text-blue-400 pl-2 mt-0.5">
          → {translation}
        </p>
      )}
    </div>
  );
}

// ============================================================
// ClickToTranslate - English definition that can be clicked to translate
// ============================================================

function ClickToTranslate({ text }: { text: string }) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (translation !== null) { setTranslation(null); return; }
    setLoading(true);
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.substring(0, 100))}&langpair=en|zh-CN`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        if (data?.responseData?.translatedText) {
          setTranslation(data.responseData.translatedText);
        } else { setTranslation('(翻译失败)'); }
      } else { setTranslation('(翻译失败)'); }
    } catch { setTranslation('(翻译失败)'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <p
        className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        onClick={handleClick}
        title="点击翻译"
      >
        {text} {loading && <span className="text-gray-400">⏳</span>}
      </p>
      {translation && (
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
          → {translation}
        </p>
      )}
    </div>
  );
}

// ============================================================
// CommonPhrasesSection - Fetches collocations via Datamuse API
// Also detects phrasal verbs from the article context
// ============================================================

function CommonPhrasesSection({ word, articleContent, onAddPhrase }: { word: string; articleContent?: string; onAddPhrase?: (phrase: string) => void }) {
  const [phrases, setPhrases] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [addedPhrases, setAddedPhrases] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!word || word.length < 2) return;
    setLoaded(false);
    setPhrases([]);

    const fetchPhrases = async () => {
      try {
        const lower = word.toLowerCase();
        const results: string[] = [];

        // Particles that form phrasal verbs
        const particles = new Set([
          'up', 'out', 'off', 'in', 'on', 'down', 'over', 'away',
          'back', 'through', 'about', 'around', 'along', 'across',
          'ahead', 'apart', 'aside', 'together', 'forward',
        ]);

        // Strategy 0: Detect phrasal verbs from the actual article text
        if (articleContent) {
          const regex = new RegExp(`\\b${lower}\\s+(\\w+)`, 'gi');
          let match;
          while ((match = regex.exec(articleContent)) !== null) {
            const nextWord = match[1]?.toLowerCase();
            if (nextWord && particles.has(nextWord)) {
              const phrasal = `${lower} ${nextWord}`;
              if (!results.includes(phrasal)) results.push(phrasal);
            }
          }
        }

        // Strategy 1: Get words that frequently follow (rel_bga) → filter for phrasal verbs
        const resp1 = await fetch(`https://api.datamuse.com/words?rel_bga=${encodeURIComponent(lower)}&max=30`);
        if (resp1.ok) {
          const data = await resp1.json();
          for (const w of data) {
            if (w.word && particles.has(w.word)) {
              const phrasal = `${lower} ${w.word}`;
              if (!results.includes(phrasal)) results.push(phrasal);
            }
          }
        }

        // Strategy 2: Get adjectives that commonly describe this word (rel_jjb)
        const resp2 = await fetch(`https://api.datamuse.com/words?rel_jjb=${encodeURIComponent(lower)}&max=3`);
        if (resp2.ok) {
          const data = await resp2.json();
          for (const w of data.slice(0, 2)) {
            if (w.word && w.word.length > 2) results.push(`${w.word} ${lower}`);
          }
        }

        // Strategy 3: Get nouns this word commonly modifies (rel_jja)
        if (results.length < 4) {
          const resp3 = await fetch(`https://api.datamuse.com/words?rel_jja=${encodeURIComponent(lower)}&max=3`);
          if (resp3.ok) {
            const data = await resp3.json();
            for (const w of data.slice(0, 2)) {
              if (w.word && w.word.length > 2 && !results.some(r => r.includes(w.word))) {
                results.push(`${lower} ${w.word}`);
              }
            }
          }
        }

        setPhrases(results.slice(0, 4));
      } catch {
        // Silent fail
      } finally {
        setLoaded(true);
      }
    };

    fetchPhrases();
  }, [word]);

  if (!loaded || phrases.length === 0) return null;

  const handleTranslatePhrase = async (phrase: string) => {
    if (translations[phrase]) {
      setTranslations((prev) => { const n = { ...prev }; delete n[phrase]; return n; });
      return;
    }
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(phrase)}&langpair=en|zh-CN`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        if (data?.responseData?.translatedText) {
          setTranslations((prev) => ({ ...prev, [phrase]: data.responseData.translatedText }));
          return;
        }
      }
      setTranslations((prev) => ({ ...prev, [phrase]: '(翻译失败)' }));
    } catch {
      setTranslations((prev) => ({ ...prev, [phrase]: '(翻译失败)' }));
    }
  };

  const handleAdd = (phrase: string) => {
    if (onAddPhrase) onAddPhrase(phrase);
    setAddedPhrases((prev) => new Set(prev).add(phrase));
  };

  return (
    <div className="mb-2">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        常见词组:
      </p>
      <div className="space-y-1">
        {phrases.map((phrase, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <span
              className="text-xs px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors"
              onClick={() => handleTranslatePhrase(phrase)}
              title="点击翻译"
            >
              {phrase}
            </span>
            {translations[phrase] && (
              <span className="text-xs text-blue-600 dark:text-blue-400">
                {translations[phrase]}
              </span>
            )}
            {!addedPhrases.has(phrase) ? (
              <button
                onClick={() => handleAdd(phrase)}
                className="text-xs text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                title="加入词组本"
              >
                +
              </button>
            ) : (
              <span className="text-xs text-green-500">✓</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// RelatedWordsSection - Fetches related/derived words via Datamuse API
// Clickable to translate, with add-to-wordbank button
// ============================================================

function RelatedWordsSection({ word, partOfSpeech }: { word: string; partOfSpeech: string }) {
  const [related, setRelated] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [addedWords, setAddedWords] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!word || word.length < 3 || !partOfSpeech) return;
    setLoaded(false);
    setRelated([]);
    setTranslations({});

    const fetchRelated = async () => {
      try {
        const resp = await fetch(`https://api.datamuse.com/words?rel_trg=${encodeURIComponent(word.toLowerCase())}&max=6`);
        const data = resp.ok ? await resp.json() : [];

        const words: string[] = [];
        for (const w of data) {
          if (w.word && w.word !== word.toLowerCase() && !w.word.includes(' ')) {
            words.push(w.word);
          }
        }

        setRelated(words.slice(0, 5));
      } catch {
        // Silent fail
      } finally {
        setLoaded(true);
      }
    };

    fetchRelated();
  }, [word, partOfSpeech]);

  const handleTranslate = async (w: string) => {
    if (translations[w]) {
      setTranslations((prev) => { const n = { ...prev }; delete n[w]; return n; });
      return;
    }
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(w)}&langpair=en|zh-CN`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        if (data?.responseData?.translatedText) {
          setTranslations((prev) => ({ ...prev, [w]: data.responseData.translatedText }));
          return;
        }
      }
      setTranslations((prev) => ({ ...prev, [w]: '(翻译失败)' }));
    } catch {
      setTranslations((prev) => ({ ...prev, [w]: '(翻译失败)' }));
    }
  };

  const handleAddWord = (w: string) => {
    try {
      const stored = localStorage.getItem('extended-word-bank');
      const bank: string[] = stored ? JSON.parse(stored) : [];
      if (!bank.includes(w)) {
        bank.push(w);
        localStorage.setItem('extended-word-bank', JSON.stringify(bank));
      }
      setAddedWords((prev) => new Set(prev).add(w));
    } catch {
      // silent
    }
  };

  if (!loaded || related.length === 0) return null;

  return (
    <div className="mb-2">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        延伸词汇:
      </p>
      <div className="space-y-1">
        {related.map((w, idx) => (
          <div key={idx} className="flex items-center gap-1 flex-wrap">
            <span
              className="text-xs px-1.5 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded cursor-pointer hover:bg-green-100 dark:hover:bg-green-800/40 transition-colors"
              onClick={() => handleTranslate(w)}
              title="点击翻译"
            >
              {w}
            </span>
            {translations[w] && (
              <span className="text-xs text-green-600 dark:text-green-400">
                {translations[w]}
              </span>
            )}
            {!addedWords.has(w) ? (
              <button
                onClick={() => handleAddWord(w)}
                className="text-xs text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                title="加入生词本"
              >
                +
              </button>
            ) : (
              <span className="text-xs text-green-500">✓</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// WordFormsSection - Shows forms based on actual part of speech
// ============================================================

// Words that should NOT show any word forms
const SKIP_FORM_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'must', 'not', 'no', 'yes',
  'and', 'or', 'but', 'if', 'then', 'than', 'that', 'this', 'these',
  'those', 'it', 'its', 'i', 'you', 'he', 'she', 'we', 'they', 'me',
  'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their',
  'what', 'which', 'who', 'whom', 'where', 'when', 'how', 'why',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up',
  'about', 'into', 'over', 'after', 'very', 'also', 'just', 'more',
]);

function WordFormsSection({ word, partOfSpeech }: { word: string; partOfSpeech: string }) {
  const lower = word.toLowerCase();

  // Skip common words that don't need forms
  if (SKIP_FORM_WORDS.has(lower) || lower.length < 3) return null;

  const forms: { label: string; value: string }[] = [];
  const pos = partOfSpeech.toLowerCase();

  // Determine what to show based on part of speech
  const isNoun = pos.includes('noun');
  const isVerb = pos.includes('verb');
  const isAdjective = pos.includes('adjective') || pos.includes('adverb');

  // Nouns: show plural
  if (isNoun && !isVerb) {
    if (lower.endsWith('s') && !lower.endsWith('ss')) {
      const singular = lower.endsWith('ies')
        ? lower.slice(0, -3) + 'y'
        : lower.endsWith('es')
        ? lower.slice(0, -2)
        : lower.slice(0, -1);
      forms.push({ label: '单数', value: singular });
      forms.push({ label: '复数', value: lower });
    } else {
      const plural = lower.endsWith('y') && !/[aeiou]y$/.test(lower)
        ? lower.slice(0, -1) + 'ies'
        : lower.endsWith('s') || lower.endsWith('sh') || lower.endsWith('ch') || lower.endsWith('x') || lower.endsWith('z')
        ? lower + 'es'
        : lower + 's';
      forms.push({ label: '复数', value: plural });
    }
  }

  // Verbs: show tense forms
  if (isVerb) {
    const base = lower.endsWith('ing')
      ? (lower.endsWith('ting') && lower.length > 5 ? lower.slice(0, -4) : lower.slice(0, -3))
      : lower.endsWith('ed')
      ? lower.endsWith('ied')
        ? lower.slice(0, -3) + 'y'
        : lower.slice(0, -2) || lower.slice(0, -1)
      : lower;

    if (base.length >= 2) {
      const ing = base.endsWith('e') ? base.slice(0, -1) + 'ing' : base + 'ing';
      const ed = base.endsWith('e') ? base + 'd' : base + 'ed';
      const thirdPerson = base.endsWith('y') && !/[aeiou]y$/.test(base)
        ? base.slice(0, -1) + 'ies'
        : base + 's';

      forms.push({ label: '原形', value: base });
      forms.push({ label: '过去式', value: ed });
      forms.push({ label: '进行时', value: ing });
      forms.push({ label: '三单', value: thirdPerson });
    }
  }

  // Adjectives: show comparative/superlative
  if (isAdjective && lower.length <= 8) {
    if (lower.endsWith('e')) {
      forms.push({ label: '比较级', value: lower + 'r' });
      forms.push({ label: '最高级', value: lower + 'st' });
    } else if (lower.endsWith('y') && !/[aeiou]y$/.test(lower)) {
      forms.push({ label: '比较级', value: lower.slice(0, -1) + 'ier' });
      forms.push({ label: '最高级', value: lower.slice(0, -1) + 'iest' });
    } else if (lower.length <= 6) {
      forms.push({ label: '比较级', value: lower + 'er' });
      forms.push({ label: '最高级', value: lower + 'est' });
    }
  }

  if (forms.length === 0) return null;

  return (
    <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        词形变化:
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {forms.map((form, idx) => (
          <span key={idx} className="text-xs text-gray-600 dark:text-gray-300">
            <span className="text-gray-400 dark:text-gray-500">{form.label}: </span>
            {form.value}
          </span>
        ))}
      </div>
    </div>
  );
}

export default ArticleReader;
