/**
 * Dashboard Page
 *
 * Displays daily streak, total words learned, articles read,
 * progress summary, personalized recommendations, and achievements.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 9.2, 9.5
 */

import { useEffect, useState } from 'react';
import { useProgressStore } from '../stores/progressStore';
import { useSettingsStore } from '../stores/settingsStore';
import { getRecommendedArticles, checkAchievements } from '../services/progressManager';
import { fetchArticles } from '../services/newsFetcher';
import type { NewsArticle, Achievement } from '../types';
import { CONTENT_SOURCE_LABELS } from '../types';

export function Dashboard() {
  const { progress, loadProgress, addAchievement } = useProgressStore();
  const { settings } = useSettingsStore();
  const [recommendations, setRecommendations] = useState<NewsArticle[]>([]);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // Check for new achievements and load recommendations
  useEffect(() => {
    // Check achievements
    const earned = checkAchievements(progress);
    if (earned.length > 0) {
      setNewAchievements(earned);
      earned.forEach((a) => addAchievement(a));
    }

    // Load recommended articles
    async function loadRecommendations() {
      const result = await fetchArticles(settings.selectedSource, 10);
      const recommended = getRecommendedArticles(progress, result.articles);
      setRecommendations(recommended.slice(0, 3));
    }
    loadRecommendations();
  }, [progress, settings.selectedSource, addAchievement]);

  return (
    <div className="min-h-full p-4 md:p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
          学习看板
        </h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="连续学习"
            value={`${progress.dailyStreak}`}
            unit="天"
            icon="🔥"
          />
          <StatCard
            label="已学单词"
            value={`${progress.totalWordsLearned}`}
            unit="个"
            icon="📚"
          />
          <StatCard
            label="已读文章"
            value={`${progress.totalArticlesRead}`}
            unit="篇"
            icon="📖"
          />
          <StatCard
            label="测验积分"
            value={`${progress.quizPoints}`}
            unit="分"
            icon="🏆"
          />
        </div>

        {/* Current Source */}
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            当前数据源
          </h2>
          <p className="text-lg font-semibold text-primary-600 dark:text-primary-400">
            {CONTENT_SOURCE_LABELS[settings.selectedSource]}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            难度等级: {progress.currentLevel === 'beginner' ? '初级' : progress.currentLevel === 'intermediate' ? '中级' : '高级'}
          </p>
        </div>

        {/* New Achievements */}
        {newAchievements.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
            <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-3">
              🎉 新成就解锁！
            </h2>
            <div className="space-y-2">
              {newAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg"
                >
                  <span className="text-2xl">🏅</span>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {achievement.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {achievement.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Achievements */}
        {progress.achievements.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              已获成就
            </h2>
            <div className="flex flex-wrap gap-2">
              {progress.achievements.map((achievement) => (
                <span
                  key={achievement.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300"
                  title={achievement.description}
                >
                  🏅 {achievement.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Articles */}
        {recommendations.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              推荐阅读
            </h2>
            <div className="space-y-3">
              {recommendations.map((article) => (
                <button
                  key={article.id}
                  onClick={() => { window.location.hash = `#/article/${article.id}`; }}
                  className="w-full text-left p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
                >
                  <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                    {article.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {article.summary}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300">
                      {CONTENT_SOURCE_LABELS[article.contentSource]}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {article.source}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { window.location.hash = '#/'; }}
            className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors text-center"
          >
            <span className="text-2xl block mb-1">📰</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              继续阅读
            </span>
          </button>
          <button
            onClick={() => { window.location.hash = '#/vocabulary'; }}
            className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors text-center"
          >
            <span className="text-2xl block mb-1">📝</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              词汇训练
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Stat Card Component
// ============================================================

interface StatCardProps {
  label: string;
  value: string;
  unit: string;
  icon: string;
}

function StatCard({ label, value, unit, icon }: StatCardProps) {
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center">
      <span className="text-2xl block mb-1">{icon}</span>
      <p className="text-xl font-bold text-gray-800 dark:text-gray-100">
        {value}
        <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-0.5">
          {unit}
        </span>
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  );
}

export default Dashboard;
