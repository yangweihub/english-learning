import { useState, useEffect, useCallback } from 'react';
import { useSettingsStore } from './stores/settingsStore';
import { useProgressStore } from './stores/progressStore';
import { useAuthStore } from './stores/authStore';
import NewsList from './pages/NewsList';
import { ArticleReader } from './pages/ArticleReader';
import { QuizPage } from './pages/QuizPage';
import VocabularyTraining from './pages/VocabularyTraining';
import GrammarTraining from './pages/GrammarTraining';
import Dashboard from './pages/Dashboard';
import AuthPage from './pages/AuthPage';
import WordBank from './pages/WordBank';
import PhraseBook from './pages/PhraseBook';
import ReadingHistory from './pages/ReadingHistory';
import AddArticle from './pages/AddArticle';
import type { NewsArticle } from './types';

// ============================================================
// Route Types
// ============================================================

type Route =
  | { page: 'news' }
  | { page: 'article'; articleId: string }
  | { page: 'quiz'; article: NewsArticle }
  | { page: 'vocabulary' }
  | { page: 'grammar' }
  | { page: 'dashboard' }
  | { page: 'wordbank' }
  | { page: 'phrasebook' }
  | { page: 'history' }
  | { page: 'add-article' };

// ============================================================
// Navigation Items
// ============================================================

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  hash: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'news',
    label: '阅读',
    hash: '#/',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    ),
  },
  {
    id: 'vocabulary',
    label: '词汇',
    hash: '#/vocabulary',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    id: 'grammar',
    label: '语法',
    hash: '#/grammar',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'dashboard',
    label: '看板',
    hash: '#/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'wordbank',
    label: '生词',
    hash: '#/wordbank',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    ),
  },
  {
    id: 'phrasebook',
    label: '词组',
    hash: '#/phrasebook',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    id: 'add-article',
    label: '添加',
    hash: '#/add-article',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
];

// ============================================================
// Hash Router Utility
// ============================================================

function parseHash(hash: string): Route {
  const cleaned = hash.replace(/^#/, '') || '/';

  if (cleaned === '/' || cleaned === '') {
    return { page: 'news' };
  }

  // Match /article/:id
  const articleMatch = cleaned.match(/^\/article\/(.+)$/);
  if (articleMatch && articleMatch[1]) {
    return { page: 'article', articleId: articleMatch[1] };
  }

  if (cleaned === '/vocabulary') {
    return { page: 'vocabulary' };
  }

  if (cleaned === '/grammar') {
    return { page: 'grammar' };
  }

  if (cleaned === '/dashboard') {
    return { page: 'dashboard' };
  }

  if (cleaned === '/wordbank') {
    return { page: 'wordbank' };
  }

  if (cleaned === '/phrasebook') {
    return { page: 'phrasebook' };
  }

  if (cleaned === '/history') {
    return { page: 'history' };
  }

  if (cleaned.startsWith('/add-article')) {
    return { page: 'add-article' };
  }

  // Default to news
  return { page: 'news' };
}

function getActiveNavId(route: Route): string {
  switch (route.page) {
    case 'news':
    case 'article':
    case 'quiz':
      return 'news';
    case 'vocabulary':
      return 'vocabulary';
    case 'grammar':
      return 'grammar';
    case 'dashboard':
      return 'dashboard';
    case 'wordbank':
      return 'wordbank';
    case 'phrasebook':
      return 'phrasebook';
    case 'history':
      return 'news';
    case 'add-article':
      return 'add-article';
  }
}

// ============================================================
// Theme Toggle Component
// ============================================================

function ThemeToggle() {
  const { settings, setTheme } = useSettingsStore();
  const isDark = settings.theme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
      title={isDark ? '切换到浅色模式' : '切换到深色模式'}
    >
      {isDark ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

// ============================================================
// UserNameDisplay Component (click to edit nickname)
// ============================================================

function UserNameDisplay() {
  const { user } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.displayName || '');

  const handleSave = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed || !user) {
      setEditing(false);
      return;
    }

    try {
      // Update in Supabase auth metadata
      const { supabase } = await import('./utils/supabase');
      await supabase.auth.updateUser({ data: { display_name: trimmed } });

      // Update in profiles table
      await supabase.from('profiles').update({ display_name: trimmed, updated_at: new Date().toISOString() }).eq('id', user.id);

      // Refresh local auth state
      useAuthStore.getState().initialize();
    } catch {
      // silent fail
    }
    setEditing(false);
  }, [name, user]);

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
          onBlur={handleSave}
          autoFocus
          className="text-sm font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5 border border-primary-400 focus:outline-none w-full"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => { setName(user?.displayName || ''); setEditing(true); }}
      className="text-sm font-bold text-gray-900 dark:text-white truncate hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer text-left w-full"
      title="点击修改昵称"
    >
      {user?.displayName || '设置昵称'}
    </button>
  );
}

// ============================================================
// App Component
// ============================================================

function App() {
  const { settings, loadSettings } = useSettingsStore();
  const loadProgress = useProgressStore((s) => s.loadProgress);
  const { user, loading: authLoading, initialize: initAuth } = useAuthStore();
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  // Store quiz article in state (since it can't be serialized in URL)
  const [quizArticle, setQuizArticle] = useState<NewsArticle | null>(null);

  // Initialize auth on mount
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Load settings and progress on mount
  useEffect(() => {
    loadSettings();
    loadProgress();
  }, [loadSettings, loadProgress]);

  // Apply dark mode class to document root
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Hash change listener
  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash(window.location.hash));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Clear article cache when user changes (prevents stale data from other accounts)
  // Also clear on first load after code update (cache version bump)
  useEffect(() => {
    if (!user) return;
    const cacheUserKey = 'articles_cache_user';
    const cacheVersionKey = 'articles_cache_version';
    const CURRENT_CACHE_VERSION = '2'; // Bump this to force cache clear

    const cachedUser = localStorage.getItem(cacheUserKey);
    const cachedVersion = localStorage.getItem(cacheVersionKey);

    if ((cachedUser && cachedUser !== user.id) || cachedVersion !== CURRENT_CACHE_VERSION) {
      // User changed or cache version outdated — clear IndexedDB article cache
      import('./utils/db').then(({ clearStore, STORE_NAMES }) => {
        clearStore(STORE_NAMES.articles).catch(() => {});
      });
    }
    localStorage.setItem(cacheUserKey, user.id);
    localStorage.setItem(cacheVersionKey, CURRENT_CACHE_VERSION);
  }, [user]);

  // Navigation handler
  const navigate = useCallback((hash: string) => {
    window.location.hash = hash;
  }, []);

  // Start quiz with an article (called from article reader)
  const startQuiz = useCallback((article: NewsArticle) => {
    setQuizArticle(article);
    setRoute({ page: 'quiz', article });
  }, []);

  // Quiz close handler
  const handleQuizClose = useCallback(() => {
    setQuizArticle(null);
    window.location.hash = '#/';
  }, []);

  const activeNavId = getActiveNavId(route);

  // Expose startQuiz globally so pages can trigger it
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__startQuiz = startQuiz;
    return () => {
      delete (window as unknown as Record<string, unknown>).__startQuiz;
    };
  }, [startQuiz]);

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  // Not logged in - show auth page
  if (!user) {
    return <AuthPage />;
  }

  // ============================================================
  // Render current page
  // ============================================================

  const renderPage = () => {
    switch (route.page) {
      case 'news':
        return <NewsList />;
      case 'article':
        return <ArticleReader articleId={route.articleId} />;
      case 'quiz':
        if (quizArticle) {
          return <QuizPage article={quizArticle} onClose={handleQuizClose} />;
        }
        return <NewsList />;
      case 'vocabulary':
        return <VocabularyTraining />;
      case 'grammar':
        return <GrammarTraining />;
      case 'dashboard':
        return <Dashboard />;
      case 'wordbank':
        return <WordBank />;
      case 'phrasebook':
        return <PhraseBook />;
      case 'history':
        return <ReadingHistory />;
      case 'add-article':
        return <AddArticle />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col md:flex-row">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex md:flex-col md:w-64 lg:w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shrink-0">
        {/* App Logo / Header with User Name */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100 dark:border-gray-700">
          <div
            className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:bg-primary-700 transition-colors"
            onClick={() => navigate('#/history')}
            title="查看阅读记录"
          >
            {user.displayName?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <UserNameDisplay />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {user.phone}
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="主导航">
          {NAV_ITEMS.map((item) => {
            const isActive = activeNavId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.hash)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
                  ${
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer - User Info & Logout */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300">
              {user.displayName?.charAt(0).toUpperCase() || '?'}
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
              {user.displayName || user.phone}
            </span>
          </div>
          <button
            onClick={() => useAuthStore.getState().signOut()}
            className="w-full text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors py-1"
          >
            退出登录
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen md:min-h-0 overflow-hidden">
        {/* Mobile Top Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-md bg-primary-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:bg-primary-700 transition-colors"
              onClick={() => navigate('#/history')}
              title="查看阅读记录"
            >
              {user.displayName?.charAt(0).toUpperCase() || '?'}
            </div>
            <UserNameDisplay />
          </div>
          <ThemeToggle />
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {renderPage()}
        </div>

        {/* Mobile Bottom Tab Navigation */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-area-bottom"
          aria-label="主导航"
        >
          <div className="flex items-center justify-around h-14">
            {NAV_ITEMS.map((item) => {
              const isActive = activeNavId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.hash)}
                  className={`
                    flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-md transition-colors min-w-0
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
                    ${
                      isActive
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }
                  `}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                >
                  {item.icon}
                  <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}

export default App;
