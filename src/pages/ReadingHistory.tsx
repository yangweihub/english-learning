/**
 * Reading History Page - 阅读记录
 * Shows articles the user has read.
 */

import { useProgressStore } from '../stores/progressStore';

export function ReadingHistory() {
  const { progress } = useProgressStore();
  const history = progress.readingHistory || [];

  return (
    <div className="min-h-full p-4 md:p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">📖 阅读记录</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          共阅读 {history.length} 篇文章
        </p>

        {history.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-5xl mb-4">📰</p>
            <p className="text-gray-500 dark:text-gray-400">还没有阅读记录，去阅读一篇文章吧</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((articleId, idx) => (
              <button
                key={idx}
                onClick={() => { window.location.hash = `#/article/${articleId}`; }}
                className="w-full text-left p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
              >
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  📄 {articleId}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReadingHistory;
