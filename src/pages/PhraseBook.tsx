/**
 * Phrase Book Page - 词组本
 * Shows saved phrases + training mode.
 */

import { useState, useEffect, useCallback } from 'react';

type ViewMode = 'list' | 'train';

export function PhraseBook() {
  const [phrases, setPhrases] = useState<string[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<ViewMode>('list');

  useEffect(() => {
    // Load from Supabase first, fallback to localStorage
    (async () => {
      try {
        const { supabase } = await import('../utils/supabase');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('phrase_bank')
            .select('phrase, translation')
            .eq('user_id', user.id)
            .order('added_at', { ascending: false });
          if (data && data.length > 0) {
            const cloudPhrases = data.map((r: { phrase: string }) => r.phrase);
            setPhrases(cloudPhrases);
            localStorage.setItem('phrase-bank', JSON.stringify(cloudPhrases));
            // Load cached translations
            const trans: Record<string, string> = {};
            for (const r of data as Array<{ phrase: string; translation: string | null }>) {
              if (r.translation) trans[r.phrase] = r.translation;
            }
            if (Object.keys(trans).length > 0) setTranslations(trans);
            return;
          }
        }
      } catch { /* fallback to localStorage */ }

      // Fallback: load from localStorage
      try {
        const stored = localStorage.getItem('phrase-bank');
        if (stored) setPhrases(JSON.parse(stored));
      } catch { /* silent */ }
    })();
  }, []);

  const handleRemove = useCallback((phrase: string) => {
    const updated = phrases.filter(p => p !== phrase);
    setPhrases(updated);
    localStorage.setItem('phrase-bank', JSON.stringify(updated));
    // Remove from Supabase
    import('../utils/supabase').then(({ supabase }) => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase.from('phrase_bank').delete()
            .eq('user_id', user.id).eq('phrase', phrase).then(() => {});
        }
      });
    });
  }, [phrases]);

  const fetchTranslation = useCallback(async (phrase: string): Promise<string> => {
    if (translations[phrase]) return translations[phrase];
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(phrase)}&langpair=en|zh-CN`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        if (data?.responseData?.translatedText) {
          const t = data.responseData.translatedText;
          setTranslations(prev => ({ ...prev, [phrase]: t }));
          return t;
        }
      }
    } catch { /* silent */ }
    return '(翻译失败)';
  }, [translations]);

  return (
    <div className="min-h-full p-4 md:p-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">📝 词组本</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">共 {phrases.length} 个词组</p>
          </div>
          {phrases.length > 0 && (
            <button
              onClick={() => setMode(mode === 'list' ? 'train' : 'list')}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            >
              {mode === 'list' ? '🎯 开始训练' : '📋 查看列表'}
            </button>
          )}
        </div>

        {phrases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-5xl mb-4">💬</p>
            <p className="text-gray-500 dark:text-gray-400">还没有词组，阅读文章时点击单词弹窗中的 "+" 加入</p>
          </div>
        ) : mode === 'train' ? (
          <PhraseTrainer phrases={phrases} fetchTranslation={fetchTranslation} />
        ) : (
          <PhraseList phrases={phrases} translations={translations} onTranslate={fetchTranslation} onRemove={handleRemove} />
        )}
      </div>
    </div>
  );
}

// ============================================================
// Phrase Trainer - list-based training
// ============================================================

function PhraseTrainer({ phrases, fetchTranslation }: { phrases: string[]; fetchTranslation: (p: string) => Promise<string> }) {
  const [queue, setQueue] = useState<string[]>(() => [...phrases]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [revealedSet, setRevealedSet] = useState<Set<number>>(new Set());
  const [translationCache, setTranslationCache] = useState<Record<number, string>>({});
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [finished, setFinished] = useState(false);

  // Auto-scroll active item
  useEffect(() => {
    const el = document.querySelector(`[data-phrase-idx="${currentIdx}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentIdx]);

  // Check if finished
  useEffect(() => {
    if (currentIdx >= queue.length && queue.length > 0) setFinished(true);
  }, [currentIdx, queue.length]);

  const handleMark = useCallback(async (idx: number, correct: boolean) => {
    // First click: reveal translation
    if (!revealedSet.has(idx)) {
      setRevealedSet(prev => new Set(prev).add(idx));
      // Fetch translation
      const phrase = queue[idx];
      if (phrase) {
        const t = await fetchTranslation(phrase);
        setTranslationCache(prev => ({ ...prev, [idx]: t }));
      }
      return;
    }

    // Second click: mark and advance
    setStats(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      wrong: prev.wrong + (correct ? 0 : 1),
    }));

    if (!correct) {
      const item = queue[idx];
      if (item) setQueue(prev => [...prev, item]);
    }

    setCurrentIdx(idx + 1);
  }, [revealedSet, queue, fetchTranslation]);

  const handleRestart = useCallback(() => {
    setQueue([...phrases]);
    setCurrentIdx(0);
    setRevealedSet(new Set());
    setTranslationCache({});
    setStats({ correct: 0, wrong: 0 });
    setFinished(false);
  }, [phrases]);

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
      <div className="flex items-center justify-between mb-4 text-xs text-gray-500 dark:text-gray-400">
        <span>进度: {currentIdx}/{queue.length}</span>
        <span>✓ {stats.correct} · ✗ {stats.wrong}</span>
      </div>

      <div className="space-y-1">
        {queue.map((phrase, idx) => {
          const isActive = idx === currentIdx;
          const isRevealed = revealedSet.has(idx);
          const isPast = idx < currentIdx;

          return (
            <div
              key={`${phrase}-${idx}`}
              data-phrase-idx={idx}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                isActive
                  ? 'border-primary-400 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                  : isPast
                  ? 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              {/* Left: Phrase */}
              <div className="flex-shrink-0 min-w-[100px]">
                <span className={`font-bold text-sm ${isActive ? 'text-primary-700 dark:text-primary-300' : 'text-gray-800 dark:text-gray-200'}`}>
                  {phrase}
                </span>
              </div>

              {/* Middle: Translation */}
              <div className="flex-1 min-w-0">
                {isRevealed || isPast ? (
                  <span className="text-sm text-blue-700 dark:text-blue-300">{translationCache[idx] || '...'}</span>
                ) : isActive ? (
                  <span className="text-sm text-gray-300 dark:text-gray-600">点击右侧按钮</span>
                ) : (
                  <span className="text-sm text-gray-200 dark:text-gray-700">···</span>
                )}
              </div>

              {/* Right: buttons */}
              {isActive && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleMark(idx, false)}
                    className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                  >
                    ✗
                  </button>
                  <button
                    onClick={() => handleMark(idx, true)}
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
// Phrase List View
// ============================================================

function PhraseList({ phrases, translations, onTranslate, onRemove }: {
  phrases: string[];
  translations: Record<string, string>;
  onTranslate: (p: string) => Promise<string>;
  onRemove: (p: string) => void;
}) {
  return (
    <div className="space-y-3">
      {phrases.map((phrase, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-start justify-between gap-3"
        >
          <div className="flex-1">
            <p
              className="font-medium text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              onClick={() => onTranslate(phrase)}
              title="点击翻译"
            >
              {phrase}
            </p>
            {translations[phrase] && (
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">{translations[phrase]}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { const u = new SpeechSynthesisUtterance(phrase); u.lang = 'en-US'; u.rate = 0.8; speechSynthesis.speak(u); }}
              className="text-gray-400 hover:text-blue-500 transition-colors"
              title="播放发音"
            >
              🔊
            </button>
            <button
              onClick={() => onRemove(phrase)}
              className="text-gray-400 hover:text-red-500 transition-colors text-sm"
              title="删除"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default PhraseBook;
