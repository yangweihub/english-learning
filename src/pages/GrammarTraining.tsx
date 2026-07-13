/**
 * Grammar Training Page
 *
 * Dedicated grammar training page accessible from main navigation.
 * Implements exercises: sentence correction, structure analysis, transformation practice.
 * Displays source article title and original sentence for each grammar point.
 * Categorizes grammar points by topic and difficulty level.
 * Tracks and displays grammar mastery progress.
 * Recommends grammar points needing further practice.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import { useState, useEffect, useCallback } from 'react';
import type { GrammarExercise, KnowledgePoint, GrammarTopic, DifficultyLevel } from '../types';
import {
  generateGrammarExercises,
  trackGrammarMastery,
  getGrammarProgress,
  getGrammarRecommendations,
  getGrammarExplanation,
  getKnowledgePointDetails,
} from '../services/knowledgeExpander';

// ============================================================
// Types
// ============================================================

interface ExerciseResult {
  exerciseId: string;
  userAnswer: string;
  isCorrect: boolean;
}

interface SessionState {
  status: 'loading' | 'ready' | 'in-progress' | 'completed';
  exercises: GrammarExercise[];
  currentIndex: number;
  results: ExerciseResult[];
}

// ============================================================
// Constants
// ============================================================

const GRAMMAR_TOPIC_LABELS: Record<GrammarTopic, string> = {
  tenses: '时态',
  clauses: '从句',
  prepositions: '介词',
  articles: '冠词',
  conditionals: '条件句',
  'passive-voice': '被动语态',
  modals: '情态动词',
  other: '其他',
};

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
};

const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const EXERCISE_TYPE_LABELS: Record<GrammarExercise['type'], string> = {
  'sentence-correction': '句子纠错',
  'structure-analysis': '结构分析',
  transformation: '句型转换',
};

// ============================================================
// Component
// ============================================================

export default function GrammarTraining() {
  const [session, setSession] = useState<SessionState>({
    status: 'loading',
    exercises: [],
    currentIndex: 0,
    results: [],
  });

  const [userAnswer, setUserAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentResult, setCurrentResult] = useState<ExerciseResult | null>(null);
  const [feedbackDetails, setFeedbackDetails] = useState<{
    explanation: string;
    additionalExamples: string[];
  } | null>(null);

  const [grammarProgress, setGrammarProgress] = useState<Map<GrammarTopic, number>>(new Map());
  const [recommendations, setRecommendations] = useState<KnowledgePoint[]>([]);

  // Load grammar points and generate exercises on mount
  useEffect(() => {
    loadGrammarSession();
  }, []);

  const loadGrammarSession = useCallback(() => {
    // Get grammar progress and recommendations
    const progress = getGrammarProgress();
    setGrammarProgress(progress);

    const recs = getGrammarRecommendations();
    setRecommendations(recs);

    // Generate exercises from recommended points, or all available points
    const pointsForExercises = recs.length > 0 ? recs : getAllGrammarPoints();
    const exercises = generateGrammarExercises(pointsForExercises);

    if (exercises.length === 0) {
      setSession({ status: 'ready', exercises: [], currentIndex: 0, results: [] });
    } else {
      setSession({ status: 'in-progress', exercises, currentIndex: 0, results: [] });
    }
  }, []);

  const getAllGrammarPoints = (): KnowledgePoint[] => {
    // Try to get points from recommendations (which come from the registry)
    // If empty, return an empty array — exercises require identified knowledge points
    return getGrammarRecommendations();
  };

  // Handle answer submission
  const handleSubmitAnswer = () => {
    if (!userAnswer.trim()) return;

    const currentExercise = session.exercises[session.currentIndex];
    if (!currentExercise) return;

    // Simple check: compare user answer with correct answer (case-insensitive, trimmed)
    const isCorrect =
      userAnswer.trim().toLowerCase() === currentExercise.correctAnswer.trim().toLowerCase();

    const result: ExerciseResult = {
      exerciseId: currentExercise.id,
      userAnswer: userAnswer.trim(),
      isCorrect,
    };

    // Track mastery
    trackGrammarMastery(currentExercise.grammarPointId, isCorrect);

    // Get feedback details for incorrect answers
    if (!isCorrect) {
      const details = getGrammarExplanation(currentExercise);
      setFeedbackDetails(details);
    } else {
      setFeedbackDetails(null);
    }

    setCurrentResult(result);
    setShowFeedback(true);
    setSession((prev) => ({
      ...prev,
      results: [...prev.results, result],
    }));
  };

  // Move to next exercise
  const handleNextExercise = () => {
    setShowFeedback(false);
    setCurrentResult(null);
    setFeedbackDetails(null);
    setUserAnswer('');

    const nextIndex = session.currentIndex + 1;
    if (nextIndex >= session.exercises.length) {
      // Session completed
      const progress = getGrammarProgress();
      setGrammarProgress(progress);
      setRecommendations(getGrammarRecommendations());
      setSession((prev) => ({ ...prev, status: 'completed', currentIndex: nextIndex }));
    } else {
      setSession((prev) => ({ ...prev, currentIndex: nextIndex }));
    }
  };

  // Handle tap on source sentence to navigate to article
  const handleSourceSentenceClick = (articleId: string, sentence: string) => {
    // Navigate to article with sentence highlighted
    // In a full app this would use a router; here we dispatch a custom event
    // that the article reader can listen for
    window.dispatchEvent(
      new CustomEvent('navigate-to-article', {
        detail: { articleId, highlightSentence: sentence },
      })
    );
  };

  // Restart training session
  const handleRestartSession = () => {
    setUserAnswer('');
    setShowFeedback(false);
    setCurrentResult(null);
    setFeedbackDetails(null);
    loadGrammarSession();
  };

  // Get the knowledge point details for the current exercise
  const getCurrentPointDetails = (): KnowledgePoint | null => {
    const currentExercise = session.exercises[session.currentIndex];
    if (!currentExercise) return null;
    return getKnowledgePointDetails(currentExercise.grammarPointId);
  };

  // ============================================================
  // Render Helpers
  // ============================================================

  const renderProgressSection = () => {
    const topics = Array.from(grammarProgress.entries());

    return (
      <div className="mb-6 rounded-lg bg-white p-4 shadow dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200">
          语法掌握进度
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {topics.map(([topic, mastery]) => (
            <div key={topic} className="rounded-md bg-gray-50 p-3 dark:bg-gray-700">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {GRAMMAR_TOPIC_LABELS[topic]}
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-600">
                <div
                  className="h-2 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${mastery}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {mastery}%
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRecommendations = () => {
    if (recommendations.length === 0) return null;

    return (
      <div className="mb-6 rounded-lg bg-white p-4 shadow dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200">
          推荐练习
        </h2>
        <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
          以下语法点需要进一步练习：
        </p>
        <div className="space-y-2">
          {recommendations.slice(0, 5).map((point) => (
            <div
              key={point.id}
              className="flex items-center justify-between rounded-md bg-gray-50 p-2 dark:bg-gray-700"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {point.title}
                </span>
                {point.grammarTopic && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                    {GRAMMAR_TOPIC_LABELS[point.grammarTopic]}
                  </span>
                )}
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${DIFFICULTY_COLORS[point.difficulty]}`}
              >
                {DIFFICULTY_LABELS[point.difficulty]}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderExercise = () => {
    const exercise = session.exercises[session.currentIndex];
    if (!exercise) return null;

    const pointDetails = getCurrentPointDetails();
    const exerciseNumber = session.currentIndex + 1;
    const totalExercises = session.exercises.length;

    return (
      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        {/* Exercise header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
              {EXERCISE_TYPE_LABELS[exercise.type]}
            </span>
            {pointDetails?.grammarTopic && (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                {GRAMMAR_TOPIC_LABELS[pointDetails.grammarTopic]}
              </span>
            )}
            {pointDetails?.difficulty && (
              <span
                className={`rounded-full px-3 py-1 text-sm ${DIFFICULTY_COLORS[pointDetails.difficulty]}`}
              >
                {DIFFICULTY_LABELS[pointDetails.difficulty]}
              </span>
            )}
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {exerciseNumber} / {totalExercises}
          </span>
        </div>

        {/* Source info */}
        <div className="mb-4 rounded-md bg-gray-50 p-3 dark:bg-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">来源文章</p>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            文章 ID: {exercise.sourceArticleId}
          </p>
          <button
            type="button"
            onClick={() =>
              handleSourceSentenceClick(exercise.sourceArticleId, exercise.sourceSentence)
            }
            className="mt-1 cursor-pointer text-left text-sm italic text-blue-600 hover:underline dark:text-blue-400"
            title="点击跳转到文章对应句子"
          >
            &ldquo;{exercise.sourceSentence}&rdquo;
          </button>
        </div>

        {/* Question */}
        <div className="mb-4">
          <h3 className="mb-2 text-base font-medium text-gray-800 dark:text-gray-200">
            题目
          </h3>
          <p className="text-gray-700 dark:text-gray-300">{exercise.question}</p>
        </div>

        {/* Answer input */}
        {!showFeedback && (
          <div className="space-y-3">
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="请输入你的答案..."
              className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400"
              rows={3}
            />
            <button
              type="button"
              onClick={handleSubmitAnswer}
              disabled={!userAnswer.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              提交答案
            </button>
          </div>
        )}

        {/* Feedback */}
        {showFeedback && currentResult && (
          <div className="space-y-4">
            {/* Correct/Incorrect indicator */}
            <div
              className={`rounded-md p-3 ${
                currentResult.isCorrect
                  ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                  : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200'
              }`}
            >
              <p className="font-medium">
                {currentResult.isCorrect ? '✓ 回答正确！' : '✗ 回答错误'}
              </p>
              {!currentResult.isCorrect && (
                <p className="mt-1 text-sm">
                  正确答案: {exercise.correctAnswer}
                </p>
              )}
            </div>

            {/* Detailed explanation for incorrect answers */}
            {!currentResult.isCorrect && feedbackDetails && (
              <div className="rounded-md bg-amber-50 p-4 dark:bg-amber-900/20">
                <h4 className="mb-2 font-medium text-amber-800 dark:text-amber-200">
                  语法规则解析
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {feedbackDetails.explanation}
                </p>
                {feedbackDetails.additionalExamples.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      更多示例：
                    </p>
                    <ul className="mt-1 list-inside list-disc space-y-1">
                      {feedbackDetails.additionalExamples.map((example, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-amber-700 dark:text-amber-300"
                        >
                          {example}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Next button */}
            <button
              type="button"
              onClick={handleNextExercise}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {session.currentIndex + 1 >= session.exercises.length
                ? '查看训练总结'
                : '下一题'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderSessionSummary = () => {
    const totalExercises = session.results.length;
    const correctCount = session.results.filter((r) => r.isCorrect).length;
    const accuracy = totalExercises > 0 ? Math.round((correctCount / totalExercises) * 100) : 0;

    return (
      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
          训练总结
        </h2>

        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-md bg-blue-50 p-4 text-center dark:bg-blue-900/20">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalExercises}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">总题数</div>
          </div>
          <div className="rounded-md bg-green-50 p-4 text-center dark:bg-green-900/20">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {correctCount}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">正确数</div>
          </div>
          <div className="rounded-md bg-purple-50 p-4 text-center dark:bg-purple-900/20">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {accuracy}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">正确率</div>
          </div>
        </div>

        {/* Updated progress after session */}
        {renderProgressSection()}

        {/* Recommendations for further practice */}
        {renderRecommendations()}

        <button
          type="button"
          onClick={handleRestartSession}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          再次练习
        </button>
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="rounded-lg bg-white p-6 text-center shadow dark:bg-gray-800">
      <p className="text-gray-600 dark:text-gray-400">
        暂无可用的语法练习。请先阅读一些文章以识别语法知识点。
      </p>
    </div>
  );

  // ============================================================
  // Main Render
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-900 md:p-6">
      <div className="mx-auto max-w-3xl">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            语法专项训练
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            通过文章中的真实语句练习语法，提升英语语法掌握能力
          </p>
        </div>

        {/* Progress Overview (always visible) */}
        {session.status !== 'loading' && renderProgressSection()}

        {/* Main Content */}
        {session.status === 'loading' && (
          <div className="rounded-lg bg-white p-6 text-center shadow dark:bg-gray-800">
            <p className="text-gray-600 dark:text-gray-400">加载中...</p>
          </div>
        )}

        {session.status === 'ready' && session.exercises.length === 0 && renderEmptyState()}

        {session.status === 'in-progress' && renderExercise()}

        {session.status === 'completed' && renderSessionSummary()}

        {/* Recommendations (visible when not in exercise) */}
        {session.status !== 'in-progress' &&
          session.status !== 'completed' &&
          renderRecommendations()}
      </div>
    </div>
  );
}
