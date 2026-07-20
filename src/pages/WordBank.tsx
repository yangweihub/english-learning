/**
 * Word Bank Page - 生词本
 * Shows saved words + flashcard training mode.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getWordBank, addToWordBank, getWordDetails } from '../services/vocabularyModule';
import type { WordBankEntry } from '../types';

type ViewMode = 'list' | 'train';

export function WordBank() {
  const [words, setWords] = useState<WordBankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>('list');

  useEffect(() => {
    async function load() {
      try {
        const bank = await getWordBank();
        setWords(bank);
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  // Extended words from localStorage
  const [extendedWords, setExtendedWords] = useState<string[]>([]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('extended-word-bank');
      if (stored) setExtendedWords(JSON.parse(stored));
    } catch { /* silent */ }
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-gray-500 dark:text-gray-400">加载中...</div>;
  }

  const allWords = words;
  const isEmpty = allWords.length === 0 && extendedWords.length === 0;

  return (
    <div className="min-h-full p-4 md:p-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">📚 生词本</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              共 {allWords.length + extendedWords.length} 个单词
            </p>
          </div>
          {!isEmpty && (
            <button
              onClick={() => setMode(mode === 'list' ? 'train' : 'list')}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            >
              {mode === 'list' ? '🎯 开始训练' : '📋 查看列表'}
            </button>
          )}
        </div>

        {/* Import Section */}
        <WordImporter onImported={async () => {
          const bank = await getWordBank();
          setWords(bank);
        }} />

        {isEmpty ? (
          <div className="text-center py-12">
            <p className="text-5xl mb-4">📖</p>
            <p className="text-gray-500 dark:text-gray-400">还没有生词，阅读文章时点击单词加入吧</p>
          </div>
        ) : mode === 'train' ? (
          <FlashcardTrainer words={allWords} />
        ) : (
          <WordList words={allWords} extendedWords={extendedWords} />
        )}
      </div>
    </div>
  );
}

// ============================================================
// Flashcard Trainer - 单词训练
// ============================================================

function FlashcardTrainer({ words }: { words: WordBankEntry[] }) {
  // Training queue: wrong words get re-added to the end
  const [queue, setQueue] = useState<WordBankEntry[]>(() => [...words]);
  const [revealedSet, setRevealedSet] = useState<Set<number>>(new Set());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [finished, setFinished] = useState(false);

  // Auto-scroll active item into view
  useEffect(() => {
    const el = document.querySelector(`[data-train-idx="${currentIdx}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentIdx]);

  const handleRevealAndMark = useCallback((idx: number, correct: boolean) => {
    // If not yet revealed, reveal it first
    if (!revealedSet.has(idx)) {
      setRevealedSet(prev => new Set(prev).add(idx));
      return;
    }

    // Already revealed — mark and move to next
    setStats(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      wrong: prev.wrong + (correct ? 0 : 1),
    }));

    // If wrong, re-add to end of queue
    if (!correct) {
      const item = queue[idx];
      if (item) setQueue(prev => [...prev, item]);
    }

    setCurrentIdx(idx + 1);
  }, [revealedSet]);

  const handleRestart = useCallback(() => {
    setQueue([...words]);
    setRevealedSet(new Set());
    setCurrentIdx(0);
    setStats({ correct: 0, wrong: 0 });
    setFinished(false);
  }, [words]);

  // Check if finished
  useEffect(() => {
    if (currentIdx >= queue.length && queue.length > 0) {
      setFinished(true);
    }
  }, [currentIdx, queue.length]);

  if (finished) {
    const total = stats.correct + stats.wrong;
    const accuracy = total > 0 ? Math.round((stats.correct / total) * 100) : 0;
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-5xl mb-4">🎉</p>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">训练完成！</h2>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{stats.correct}</p>
            <p className="text-xs text-gray-500">认识</p>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{stats.wrong}</p>
            <p className="text-xs text-gray-500">不认识</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{accuracy}%</p>
            <p className="text-xs text-gray-500">正确率</p>
          </div>
        </div>
        <button onClick={handleRestart} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          再练一轮
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Stats bar */}
      <div className="flex items-center justify-between mb-4 text-xs text-gray-500 dark:text-gray-400">
        <span>进度: {currentIdx}/{queue.length}</span>
        <span>✓ {stats.correct} · ✗ {stats.wrong}</span>
      </div>

      {/* Word list - scrollable */}
      <div className="space-y-1">
        {queue.map((entry, idx) => {
          const isActive = idx === currentIdx;
          const isRevealed = revealedSet.has(idx);
          const isPast = idx < currentIdx;
          const translation = (() => {
            const chinese = entry.word.definitions.map(d => d.chinese).filter(Boolean).join('；');
            if (chinese && chinese.length > 20) return chinese.split(/[；;，,。]/)[0] || chinese.substring(0, 15);
            return chinese || entry.word.definitions.map(d => d.english.split('.')[0]).slice(0, 2).join('; ');
          })();

          return (
            <div
              key={`${entry.word.id}-${idx}`}
              data-train-idx={idx}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                isActive
                  ? 'border-primary-400 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                  : isPast
                  ? 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              {/* Left: Word */}
              <div className="flex-shrink-0 w-28">
                <span className={`font-bold ${isActive ? 'text-primary-700 dark:text-primary-300' : 'text-gray-800 dark:text-gray-200'}`}>
                  {entry.word.word}
                </span>
              </div>

              {/* Middle: Translation (hidden until revealed) */}
              <div className="flex-1 min-w-0">
                {isRevealed || isPast ? (
                  <span className="text-sm text-blue-700 dark:text-blue-300">{translation}</span>
                ) : isActive ? (
                  <span className="text-sm text-gray-300 dark:text-gray-600">点击右侧按钮</span>
                ) : (
                  <span className="text-sm text-gray-200 dark:text-gray-700">···</span>
                )}
              </div>

              {/* Right: ✗ ✓ buttons (only for active item) */}
              {isActive && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleRevealAndMark(idx, false)}
                    className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                  >
                    ✗
                  </button>
                  <button
                    onClick={() => handleRevealAndMark(idx, true)}
                    className="w-9 h-9 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center justify-center text-green-600 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                  >
                    ✓
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Word List View
// ============================================================

function WordList({ words, extendedWords }: { words: WordBankEntry[]; extendedWords: string[] }) {
  return (
    <div className="space-y-3">
      {words.map((entry) => (
        <div
          key={entry.word.id}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 dark:text-white">{entry.word.word}</span>
              <span className="text-xs text-gray-400">{entry.word.pronunciation}</span>
              <button
                onClick={() => {
                  const u = new SpeechSynthesisUtterance(entry.word.word);
                  u.lang = 'en-US'; u.rate = 0.8;
                  speechSynthesis.speak(u);
                }}
                className="text-xs text-gray-400 hover:text-blue-500"
              >
                🔊
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{entry.word.partOfSpeech}</span>
              <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${entry.masteryLevel}%` }} />
              </div>
            </div>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {(() => {
              const chinese = entry.word.definitions.map(d => d.chinese).filter(Boolean).join('；');
              // If Chinese translation is too long, show only first short segment
              if (chinese && chinese.length > 20) {
                const short = chinese.split(/[；;，,。]/)[0] || chinese.substring(0, 15);
                return short;
              }
              return chinese || entry.word.definitions.map(d => d.english.split('.')[0]).slice(0, 2).join('; ');
            })()}
          </p>
          {entry.word.sourceSentence && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">
              "{entry.word.sourceSentence}"
            </p>
          )}
        </div>
      ))}

      {extendedWords.length > 0 && (
        <>
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-6 mb-2">
            延伸词汇 ({extendedWords.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {extendedWords.map((w, idx) => (
              <span key={idx} className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm">
                {w}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// Word Importer - 一键导入生词（OCR图片/文本粘贴）
// ============================================================

function WordImporter({ onImported }: { onImported: () => void }) {
  const [showImport, setShowImport] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importWords = useCallback(async (text: string) => {
    // Extract words: split by comma, space, newline, semicolon
    const rawWords = text
      .split(/[,;，；\n\r\s]+/)
      .map(w => w.trim().toLowerCase().replace(/[^a-z'-]/g, ''))
      .filter(w => w.length >= 2 && w.length <= 30);

    // Deduplicate
    const uniqueWords = [...new Set(rawWords)];
    if (uniqueWords.length === 0) {
      setResult({ success: 0, failed: 0 });
      return;
    }

    setImporting(true);
    let success = 0;
    let failed = 0;

    for (const word of uniqueWords) {
      try {
        const details = await getWordDetails(word);
        await addToWordBank(details);
        success++;
      } catch {
        failed++;
      }
      // Brief delay to avoid API rate limits
      if (success + failed < uniqueWords.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    setResult({ success, failed });
    setImporting(false);
    setTextInput('');
    if (success > 0) onImported();
  }, [onImported]);

  const handleOCR = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'true');
      formData.append('OCREngine', '1');
      formData.append('scale', 'true');
      formData.append('isTable', 'true');

      const resp = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: { 'apikey': 'helloworld' },
        body: formData,
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data?.ParsedResults?.[0]?.ParsedText) {
          const rawText = data.ParsedResults[0].ParsedText;
          // Extract English words from vocabulary list format
          // Match words at start of lines or after common patterns
          const words: string[] = [];
          const lines = rawText.split(/[\r\n]+/);
          for (const line of lines) {
            // Match pattern: word /phonetic/ or *word or just word at line start
            const match = line.match(/^\*?([a-zA-Z][a-zA-Z '-]{1,25})\b/);
            if (match) {
              const word = match[1].trim().toLowerCase();
              if (word.length >= 2 && !words.includes(word)) {
                words.push(word);
              }
            }
            // Also try to find standalone English words in the line
            const allWords = line.match(/\b[a-zA-Z][a-zA-Z'-]{2,20}\b/g);
            if (allWords) {
              for (const w of allWords) {
                const lower = w.toLowerCase();
                // Skip phonetic symbols and common non-words
                if (lower.length >= 3 && !words.includes(lower) && 
                    !['adj','adv','prep','conj','pron','the','and','for','but','not','you','all','can','had','her','was','one','our'].includes(lower) &&
                    !/^[aeiou]{3,}/.test(lower)) {
                  words.push(lower);
                }
              }
            }
          }
          // Deduplicate and set as text input (one per line for review)
          const uniqueWords = [...new Set(words)];
          setTextInput(uniqueWords.join('\n'));
        }
      }
    } catch { /* silent */ }
    finally {
      setOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  if (!showImport) {
    return (
      <div className="mb-4">
        <button
          onClick={() => setShowImport(true)}
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
        >
          📥 批量导入生词
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">📥 批量导入生词</h3>
        <button onClick={() => { setShowImport(false); setResult(null); }} className="text-xs text-gray-400 hover:text-gray-600">关闭</button>
      </div>

      {/* OCR Button */}
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={ocrLoading || importing}
          className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          {ocrLoading ? '识别中...' : '📷 从图片识别'}
        </button>
        <span className="text-xs text-gray-400">或在下方粘贴单词列表</span>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleOCR} className="hidden" />

      {/* Text Input */}
      <textarea
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        placeholder="每行一个单词，或用逗号/空格分隔，如：apple, banana, orange"
        rows={4}
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y mb-3"
      />

      {/* Import Button */}
      <button
        onClick={() => importWords(textInput)}
        disabled={importing || !textInput.trim()}
        className="w-full py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {importing ? '导入中...' : '开始导入'}
      </button>

      {/* Result */}
      {result && (
        <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
          ✅ 成功导入 {result.success} 个单词{result.failed > 0 ? `，${result.failed} 个失败` : ''}
        </p>
      )}
    </div>
  );
}

export default WordBank;
