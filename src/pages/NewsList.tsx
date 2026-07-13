import { useState, useEffect, useCallback, useRef } from 'react';
import type { ContentSource, NewsArticle } from '../types';
import { CONTENT_SOURCE_LABELS } from '../types';
import { ContentSelector } from '../components/ContentSelector';
import { useSettingsStore } from '../stores/settingsStore';
import { fetchArticles, getAvailableSources } from '../services/newsFetcher';
import type { FetchResult } from '../services/newsFetcher';

// ============================================================
// Constants
// ============================================================

const PAGE_SIZE = 5;

// ============================================================
// Article Card Component
// ============================================================

interface ArticleCardProps {
  article: NewsArticle;
  onClick?: (article: NewsArticle) => void;
  onEdit?: (article: NewsArticle) => void;
  onDelete?: (article: NewsArticle) => void;
  isOwn?: boolean;
}

function ArticleCard({ article, onClick, onEdit, onDelete, isOwn }: ArticleCardProps) {
  const formattedDate = new Date(article.publishedAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <article
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 transition-all duration-200 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 cursor-pointer"
      onClick={() => onClick?.(article)}
      role="button"
      tabIndex={0}
      aria-label={`阅读文章: ${article.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(article);
        }
      }}
    >
      <div className="flex flex-col gap-2">
        {/* Header: badge + date + edit/delete */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300">
            {CONTENT_SOURCE_LABELS[article.contentSource]}
          </span>
          <div className="flex items-center gap-2">
            {isOwn && onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(article); }}
                className="text-xs px-2 py-0.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
              >
                编辑
              </button>
            )}
            {isOwn && onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(article); }}
                className="text-xs px-2 py-0.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              >
                删除
              </button>
            )}
            <time
              className="text-xs text-gray-500 dark:text-gray-400"
              dateTime={new Date(article.publishedAt).toISOString()}
            >
              {formattedDate}
            </time>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 leading-snug">
          {article.title}
        </h3>

        {/* Summary */}
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3">
          {article.summary}
        </p>

        {/* Footer: source */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {article.source}
          </span>
        </div>
      </div>
    </article>
  );
}

// ============================================================
// Loading Skeleton
// ============================================================

function ArticleCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 animate-pulse">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
}

// ============================================================
// Empty State Component
// ============================================================

interface EmptyStateProps {
  source: ContentSource;
  onSwitchSource: () => void;
}

function EmptyState({ source, onSwitchSource }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-gray-400 dark:text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        暂无可用内容
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-xs">
        「{CONTENT_SOURCE_LABELS[source]}」当前没有可用的文章，请尝试切换到其他数据源
      </p>
      <button
        onClick={onSwitchSource}
        className="px-4 py-2 text-sm font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        切换数据源
      </button>
    </div>
  );
}

// ============================================================
// Error State Component
// ============================================================

interface ErrorStateProps {
  message: string;
  hasCachedArticles: boolean;
}

function ErrorState({ message, hasCachedArticles }: ErrorStateProps) {
  return (
    <div
      className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
      role="alert"
    >
      <svg
        className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          {message}
        </p>
        {hasCachedArticles && (
          <p className="text-xs text-amber-600 dark:text-amber-300 mt-0.5">
            以下为缓存内容，可能不是最新的
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Pull-to-Refresh Indicator
// ============================================================

function RefreshIndicator({ isRefreshing }: { isRefreshing: boolean }) {
  if (!isRefreshing) return null;

  return (
    <div className="flex items-center justify-center py-3" aria-live="polite">
      <svg
        className="animate-spin h-5 w-5 text-primary-500 mr-2"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      <span className="text-sm text-gray-500 dark:text-gray-400">刷新中...</span>
    </div>
  );
}

// ============================================================
// NewsList Page Component
// ============================================================

export function NewsList() {
  const { settings, setSelectedSource } = useSettingsStore();
  const currentSource = settings.selectedSource;
  const availableSources = getAvailableSources();

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [fromCache, setFromCache] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Track touch start for pull-to-refresh
  const touchStartY = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Load articles for the current source and page
  const loadArticles = useCallback(
    async (source: ContentSource, pageNum: number, append = false) => {
      const count = pageNum * PAGE_SIZE;
      const result: FetchResult = await fetchArticles(source, count);

      if (append) {
        // For pagination, append only new articles
        setArticles((prev) => {
          const existingIds = new Set(prev.map((a) => a.id));
          const newArticles = result.articles.filter((a) => !existingIds.has(a.id));
          return [...prev, ...newArticles];
        });
        // If we got fewer new articles than expected, no more to load
        if (result.articles.length < count) {
          setHasMore(false);
        }
      } else {
        setArticles(result.articles);
        setHasMore(result.articles.length >= PAGE_SIZE);
      }

      setFromCache(result.fromCache);
      setError(result.error);
    },
    []
  );

  // Initial load and source change
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(undefined);
      setArticles([]);
      setPage(1);
      setHasMore(true);

      try {
        await loadArticles(currentSource, 1);
      } catch {
        if (!cancelled) {
          setError('加载失败，请稍后重试');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [currentSource, loadArticles]);

  // Handle source change from ContentSelector
  const handleSourceChange = useCallback(
    (source: ContentSource) => {
      if (source === currentSource) return;
      // Clear current articles and load new source
      setArticles([]);
      setError(undefined);
      setSelectedSource(source);
    },
    [currentSource, setSelectedSource]
  );

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setError(undefined);

    try {
      await loadArticles(currentSource, 1);
      setPage(1);
      setHasMore(true);
    } catch {
      setError('刷新失败，请稍后重试');
    } finally {
      setIsRefreshing(false);
    }
  }, [currentSource, isRefreshing, loadArticles]);

  // Load more (pagination)
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    const nextPage = page + 1;
    try {
      await loadArticles(currentSource, nextPage, true);
      setPage(nextPage);
    } catch {
      // Silently fail on load-more
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentSource, hasMore, isLoadingMore, loadArticles, page]);

  // Touch handlers for pull-to-refresh
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? 0;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const touchEndY = e.changedTouches[0]?.clientY ?? 0;
      const diff = touchEndY - touchStartY.current;
      const listEl = listRef.current;

      // Only trigger pull-to-refresh if scrolled to top and pulled down significantly
      if (diff > 80 && listEl && listEl.scrollTop <= 0) {
        handleRefresh();
      }
    },
    [handleRefresh]
  );

  // Scroll to top when suggesting source switch
  const handleSwitchSourceSuggestion = useCallback(() => {
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Article click handler - navigate to article reader
  const handleArticleClick = useCallback((article: NewsArticle) => {
    window.location.hash = `#/article/${article.id}`;
  }, []);

  // Edit own article - pass data via window and navigate
  const handleEditArticle = useCallback((article: NewsArticle) => {
    (window as unknown as Record<string, unknown>).__editArticle = {
      id: article.id,
      title: article.title,
      content: article.content,
    };
    window.location.hash = `#/add-article?edit=${article.id}`;
  }, []);

  // Delete own article
  const handleDeleteArticle = useCallback(async (article: NewsArticle) => {
    if (!confirm('确定要删除这篇文章吗？')) return;
    try {
      const { supabase } = await import('../utils/supabase');
      const { deleteByKey, STORE_NAMES } = await import('../utils/db');
      await supabase.from('user_articles').delete().eq('id', article.id);
      // Remove from local state
      setArticles(prev => prev.filter(a => a.id !== article.id));
      // Remove from IndexedDB cache
      try { await deleteByKey(STORE_NAMES.articles, article.id); } catch { /* ignore */ }
    } catch { /* silent */ }
  }, []);

  return (
    <div
      ref={listRef}
      className="flex flex-col h-full overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Page Header */}
      <header className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          英语学习
        </h1>
        {/* Content Selector */}
        <ContentSelector
          currentSource={currentSource}
          onSourceChange={handleSourceChange}
          availableSources={availableSources}
        />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-4 space-y-4">
        {/* Refresh Indicator */}
        <RefreshIndicator isRefreshing={isRefreshing} />

        {/* Error Banner */}
        {error && (
          <ErrorState message={error} hasCachedArticles={fromCache && articles.length > 0} />
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4" aria-label="加载中">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && articles.length === 0 && !error && (
          <EmptyState source={currentSource} onSwitchSource={handleSwitchSourceSuggestion} />
        )}

        {/* Article List */}
        {!isLoading && articles.length > 0 && (
          <div className="space-y-4" role="list" aria-label="文章列表">
            {articles.map((article) => (
              <div key={article.id} role="listitem">
                <ArticleCard
                  article={article}
                  onClick={handleArticleClick}
                  isOwn={article.source === '我的文章' || article.source === '手动添加'}
                  onEdit={handleEditArticle}
                  onDelete={handleDeleteArticle}
                />
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {!isLoading && hasMore && articles.length > 0 && (
          <div className="flex justify-center py-4">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="px-6 py-2.5 text-sm font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingMore ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  加载中...
                </span>
              ) : (
                '加载更多'
              )}
            </button>
          </div>
        )}

        {/* No More Content */}
        {!isLoading && !hasMore && articles.length > 0 && (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">
            已加载全部内容
          </p>
        )}

        {/* Manual Refresh Button (alternative to pull-to-refresh for desktop) */}
        {!isLoading && articles.length > 0 && (
          <div className="flex justify-center pb-4">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-primary-500 dark:hover:text-primary-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded disabled:opacity-50"
            >
              ↻ 刷新内容
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default NewsList;
