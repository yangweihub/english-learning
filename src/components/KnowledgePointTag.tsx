/**
 * KnowledgePointTag Component
 *
 * Displays inline knowledge point tags (grammar, idiom, cultural-reference)
 * within article text. Tapping a tag shows an explanation card overlay with
 * detailed info, examples, and links to related resources.
 *
 * Requirements: 5.1, 5.2, 5.3
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { KnowledgePoint, KnowledgeType } from '../types';
import { getRelatedResources } from '../services/knowledgeExpander';

// ============================================================
// Style maps for different knowledge point types
// ============================================================

const TAG_STYLES: Record<KnowledgeType, { bg: string; text: string; border: string; hoverBg: string; icon: string }> = {
  grammar: {
    bg: 'bg-purple-100 dark:bg-purple-900/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-600',
    hoverBg: 'hover:bg-purple-200 dark:hover:bg-purple-800/60',
    icon: '📝',
  },
  idiom: {
    bg: 'bg-green-100 dark:bg-green-900/40',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-300 dark:border-green-600',
    hoverBg: 'hover:bg-green-200 dark:hover:bg-green-800/60',
    icon: '💬',
  },
  'cultural-reference': {
    bg: 'bg-orange-100 dark:bg-orange-900/40',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-300 dark:border-orange-600',
    hoverBg: 'hover:bg-orange-200 dark:hover:bg-orange-800/60',
    icon: '🌍',
  },
};

const TYPE_LABELS: Record<KnowledgeType, string> = {
  grammar: '语法',
  idiom: '习语',
  'cultural-reference': '文化',
};

// ============================================================
// Props
// ============================================================

export interface KnowledgePointTagProps {
  /** The knowledge point to display as a tag */
  point: KnowledgePoint;
  /** Optional callback when the user navigates to a related resource */
  onNavigateToRelated?: (point: KnowledgePoint) => void;
}

// ============================================================
// Component
// ============================================================

export const KnowledgePointTag: React.FC<KnowledgePointTagProps> = ({
  point,
  onNavigateToRelated,
}) => {
  const [showCard, setShowCard] = useState(false);
  const [relatedPoints, setRelatedPoints] = useState<KnowledgePoint[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLSpanElement>(null);

  const style = TAG_STYLES[point.type];

  // Load related resources when card is opened
  useEffect(() => {
    if (!showCard) return;

    setLoadingRelated(true);
    try {
      const related = getRelatedResources(point.id);
      setRelatedPoints(related.slice(0, 3)); // Show max 3 related
    } catch {
      setRelatedPoints([]);
    } finally {
      setLoadingRelated(false);
    }
  }, [showCard, point.id]);

  // Close card when clicking outside
  useEffect(() => {
    if (!showCard) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        cardRef.current &&
        !cardRef.current.contains(event.target as Node) &&
        tagRef.current &&
        !tagRef.current.contains(event.target as Node)
      ) {
        setShowCard(false);
      }
    };

    // Delay adding listener to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCard]);

  const handleTagClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCard((prev) => !prev);
  }, []);

  const handleRelatedClick = useCallback(
    (relatedPoint: KnowledgePoint, e: React.MouseEvent) => {
      e.stopPropagation();
      if (onNavigateToRelated) {
        onNavigateToRelated(relatedPoint);
      }
    },
    [onNavigateToRelated]
  );

  const handleCloseCard = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCard(false);
  }, []);

  return (
    <span className="relative inline" data-testid={`knowledge-tag-${point.id}`}>
      {/* Inline Tag */}
      <span
        ref={tagRef}
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer border transition-colors select-none ${style.bg} ${style.text} ${style.border} ${style.hoverBg}`}
        role="button"
        tabIndex={0}
        aria-label={`${TYPE_LABELS[point.type]}: ${point.title}. 点击查看详情`}
        aria-expanded={showCard}
        onClick={handleTagClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setShowCard((prev) => !prev);
          }
        }}
      >
        <span aria-hidden="true">{style.icon}</span>
        <span>{point.title}</span>
      </span>

      {/* Explanation Card Overlay */}
      {showCard && (
        <div
          ref={cardRef}
          className="absolute z-50 mt-1 left-0 w-72 sm:w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4"
          role="dialog"
          aria-label={`知识点详情: ${point.title}`}
          onClick={(e) => e.stopPropagation()}
          data-testid={`knowledge-card-${point.id}`}
        >
          {/* Card Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}
              >
                {style.icon} {TYPE_LABELS[point.type]}
              </span>
              <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">
                {point.title}
              </h4>
            </div>
            <button
              onClick={handleCloseCard}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none ml-2 flex-shrink-0"
              aria-label="关闭知识点详情"
            >
              ×
            </button>
          </div>

          {/* Explanation */}
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
            {point.explanation}
          </p>

          {/* Examples */}
          {point.examples.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                例句:
              </p>
              <ul className="space-y-1">
                {point.examples.map((example, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-gray-600 dark:text-gray-400 italic pl-2 border-l-2 border-gray-200 dark:border-gray-600"
                  >
                    {example}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Source Sentence */}
          {point.sourceSentence && (
            <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                来源句子:
              </p>
              <p className="text-xs text-gray-700 dark:text-gray-300 italic">
                "{point.sourceSentence}"
              </p>
            </div>
          )}

          {/* Related Resources */}
          <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              相关知识点:
            </p>
            {loadingRelated ? (
              <p className="text-xs text-gray-400">加载中...</p>
            ) : relatedPoints.length > 0 ? (
              <ul className="space-y-1">
                {relatedPoints.map((related) => {
                  const relatedStyle = TAG_STYLES[related.type];
                  return (
                    <li key={related.id}>
                      <button
                        className={`text-xs px-2 py-1 rounded w-full text-left transition-colors ${relatedStyle.bg} ${relatedStyle.text} ${relatedStyle.hoverBg}`}
                        onClick={(e) => handleRelatedClick(related, e)}
                        aria-label={`查看相关知识点: ${related.title}`}
                      >
                        {relatedStyle.icon} {related.title}
                        <span className="text-gray-400 dark:text-gray-500 ml-1">
                          ({TYPE_LABELS[related.type]})
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                暂无相关知识点
              </p>
            )}
          </div>
        </div>
      )}
    </span>
  );
};

export default KnowledgePointTag;
