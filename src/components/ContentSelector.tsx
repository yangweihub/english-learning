import { useState, useCallback } from 'react';
import type { ContentSource, ContentSelectorProps } from '../types';
import { CONTENT_SOURCE_LABELS } from '../types';

/**
 * Content_Selector component for switching between content sources.
 * Displays all available ContentSource options as a button-group/tab-bar,
 * highlights the active source, and shows a loading state during transitions.
 *
 * Validates: Requirements 10.1, 10.2, 10.3
 */
export function ContentSelector({
  currentSource,
  onSourceChange,
  availableSources,
}: ContentSelectorProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSourceChange = useCallback(
    (source: ContentSource) => {
      if (source === currentSource || isLoading) return;
      setIsLoading(true);
      onSourceChange(source);
      // Simulate brief loading feedback; parent controls actual loading lifecycle
      setTimeout(() => setIsLoading(false), 600);
    },
    [currentSource, isLoading, onSourceChange]
  );

  return (
    <nav
      aria-label="内容来源选择"
      className="w-full"
    >
      <ul
        role="tablist"
        className="flex flex-wrap gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl sm:flex-nowrap sm:gap-1"
      >
        {availableSources.map((source) => {
          const isActive = source === currentSource;
          return (
            <li key={source} role="presentation" className="flex-1 min-w-0">
              <button
                role="tab"
                aria-selected={isActive}
                aria-label={CONTENT_SOURCE_LABELS[source]}
                disabled={isLoading}
                onClick={() => handleSourceChange(source)}
                className={`
                  w-full px-3 py-2 text-sm font-medium rounded-lg
                  transition-all duration-200 ease-in-out
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1
                  disabled:cursor-not-allowed disabled:opacity-60
                  truncate
                  ${
                    isActive
                      ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-300 shadow-sm ring-1 ring-primary-200 dark:ring-primary-700'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                  }
                `}
              >
                <span className="block truncate">
                  {CONTENT_SOURCE_LABELS[source]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {isLoading && (
        <div
          className="mt-2 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400"
          aria-live="polite"
        >
          <svg
            className="animate-spin h-4 w-4 text-primary-500"
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
          <span>加载中...</span>
        </div>
      )}
    </nav>
  );
}

export default ContentSelector;
