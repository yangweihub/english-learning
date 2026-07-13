import { useState, useCallback, useEffect } from 'react';
import type {
  NewsArticle,
  QuizQuestion,
  QuizResult,
  QuizSession,
  QuizSummary,
} from '../types';
import { SOURCE_DIFFICULTY_MAP, CONTENT_SOURCE_LABELS } from '../types';
import {
  generateQuestions,
  evaluateAnswer,
  getAnswerFeedback,
  getSessionSummary,
  saveQuizSession,
} from '../services/quizModule';
import { useProgressStore } from '../stores/progressStore';

// ============================================================
// QuizPage Props
// ============================================================

interface QuizPageProps {
  article: NewsArticle;
  onClose?: () => void;
}

// ============================================================
// Sub-Components
// ============================================================

/** Displays a positive feedback animation for correct answers */
function CorrectFeedback({ points }: { points: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center p-6 animate-bounce"
      role="alert"
      aria-live="polite"
    >
      <div className="text-5xl mb-3">🎉</div>
      <p className="text-xl font-bold text-green-600 dark:text-green-400">
        回答正确！
      </p>
      <p className="text-lg text-green-500 dark:text-green-300 mt-1">
        +{points} 分
      </p>
    </div>
  );
}

/** Displays the correct answer and explanation for incorrect answers */
function IncorrectFeedback({
  correctAnswer,
  explanation,
}: {
  correctAnswer: string;
  explanation: string;
}) {
  return (
    <div
      className="flex flex-col items-start p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">❌</span>
        <p className="text-lg font-semibold text-red-600 dark:text-red-400">
          回答错误
        </p>
      </div>
      <div className="mt-2 w-full">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          正确答案：
        </p>
        <p className="text-base text-green-700 dark:text-green-300 font-medium mt-1 bg-green-50 dark:bg-green-900/20 p-2 rounded">
          {correctAnswer}
        </p>
      </div>
      <div className="mt-3 w-full">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          解释：
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {explanation}
        </p>
      </div>
    </div>
  );
}

/** Quiz session summary with performance stats */
function QuizSummaryView({
  summary,
  onClose,
}: {
  summary: QuizSummary;
  onClose?: () => void;
}) {
  const accuracyPercent = Math.round(summary.accuracy * 100);
  const accuracyColor =
    accuracyPercent >= 80
      ? 'text-green-600 dark:text-green-400'
      : accuracyPercent >= 50
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md mx-auto">
      <div className="text-5xl mb-4">📊</div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
        测验总结
      </h2>

      <div className="w-full space-y-4">
        {/* Accuracy */}
        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            正确率
          </span>
          <span className={`text-xl font-bold ${accuracyColor}`}>
            {accuracyPercent}%
          </span>
        </div>

        {/* Correct / Total */}
        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            答对题数
          </span>
          <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {summary.correctAnswers} / {summary.totalQuestions}
          </span>
        </div>

        {/* Points */}
        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            获得积分
          </span>
          <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
            +{summary.pointsEarned}
          </span>
        </div>

        {/* Weak Areas */}
        {summary.weakAreas.length > 0 && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">
              需要加强的领域：
            </p>
            <ul className="list-disc list-inside text-sm text-yellow-600 dark:text-yellow-400 space-y-1">
              {summary.weakAreas.map((area) => (
                <li key={area}>{getQuizTypeLabel(area)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="mt-6 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          完成
        </button>
      )}
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

/** Returns a Chinese label for a quiz type */
function getQuizTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'vocabulary-matching': '词汇匹配',
    'fill-in-blank': '填空题',
    'reading-comprehension': '阅读理解',
    'sentence-ordering': '句子排序',
  };
  return labels[type] ?? type;
}

// ============================================================
// QuizPage Component
// ============================================================

/**
 * Quiz page triggered after reading an article.
 * Generates quiz questions based on the article's ContentSource difficulty,
 * supports multiple quiz types, provides feedback for each answer,
 * and displays a session summary at the end.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.8
 */
export function QuizPage({ article, onClose }: QuizPageProps) {
  const addQuizPoints = useProgressStore((s) => s.addQuizPoints);

  // Quiz state
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [feedbackState, setFeedbackState] = useState<
    | { type: 'correct'; points: number }
    | { type: 'incorrect'; correctAnswer: string; explanation: string }
    | null
  >(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [summary, setSummary] = useState<QuizSummary | null>(null);
  const [totalPointsEarned, setTotalPointsEarned] = useState(0);

  // Generate questions on mount
  useEffect(() => {
    const generated = generateQuestions(article, 5);
    setQuestions(generated);
  }, [article]);

  const currentQuestion = questions[currentIndex] ?? null;
  const difficulty = SOURCE_DIFFICULTY_MAP[article.contentSource];

  /** Submit the current answer */
  const handleSubmit = useCallback(() => {
    if (!currentQuestion || !selectedAnswer.trim()) return;

    const result = evaluateAnswer(currentQuestion, selectedAnswer);
    const feedback = getAnswerFeedback(currentQuestion, result.isCorrect);

    setResults((prev) => [...prev, result]);

    if (result.isCorrect) {
      setFeedbackState({ type: 'correct', points: feedback.points });
      setTotalPointsEarned((prev) => prev + feedback.points);
    } else {
      setFeedbackState({
        type: 'incorrect',
        correctAnswer: feedback.correctAnswer,
        explanation: feedback.explanation,
      });
    }
  }, [currentQuestion, selectedAnswer]);

  /** Move to the next question or complete the quiz */
  const handleNext = useCallback(() => {
    setFeedbackState(null);
    setSelectedAnswer('');

    if (currentIndex + 1 >= questions.length) {
      // Quiz complete — generate summary
      const session: QuizSession = {
        articleId: article.id,
        questions,
        results: [...results],
        totalPoints: totalPointsEarned,
        completedAt: new Date(),
      };

      const sessionSummary = getSessionSummary(session);
      setSummary(sessionSummary);
      setQuizCompleted(true);

      // Persist session and update progress
      addQuizPoints(totalPointsEarned);
      saveQuizSession(session).catch(() => {
        // Silent fail for persistence — non-critical
      });
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, questions, results, article.id, totalPointsEarned, addQuizPoints]);

  // ============================================================
  // Render
  // ============================================================

  // Loading state
  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-gray-500 dark:text-gray-400">正在生成测验题目...</p>
      </div>
    );
  }

  // Summary view
  if (quizCompleted && summary) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <QuizSummaryView summary={summary} onClose={onClose} />
      </div>
    );
  }

  // Question view
  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            文章测验
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            来源: {CONTENT_SOURCE_LABELS[article.contentSource]} · 难度:{' '}
            {difficulty === 'beginner'
              ? '初级'
              : difficulty === 'intermediate'
                ? '中级'
                : '高级'}
          </p>
        </div>
        <span className="text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-3 py-1 rounded-full">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-300"
          style={{
            width: `${((currentIndex + (feedbackState ? 1 : 0)) / questions.length) * 100}%`,
          }}
        />
      </div>

      {/* Question card */}
      {currentQuestion && !feedbackState && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          {/* Quiz type badge */}
          <span className="inline-block text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mb-3">
            {getQuizTypeLabel(currentQuestion.type)}
          </span>

          {/* Question text */}
          <p className="text-lg text-gray-800 dark:text-gray-100 font-medium mb-6 leading-relaxed">
            {currentQuestion.question}
          </p>

          {/* Options (for multiple-choice types) */}
          {currentQuestion.options && currentQuestion.options.length > 0 ? (
            <div className="space-y-3 mb-6">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedAnswer(option)}
                  className={`
                    w-full text-left p-3 rounded-lg border-2 transition-all duration-150
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
                    ${
                      selectedAnswer === option
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                    }
                  `}
                >
                  <span className="text-sm font-medium mr-2 text-gray-400">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <span className="text-sm">{option}</span>
                </button>
              ))}
            </div>
          ) : (
            /* Text input for fill-in-blank and sentence-ordering */
            <div className="mb-6">
              <input
                type="text"
                value={selectedAnswer}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                placeholder={
                  currentQuestion.type === 'sentence-ordering'
                    ? '请输入正确的句子顺序（用 | 分隔）'
                    : '请输入你的答案'
                }
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-primary-500 dark:focus:border-primary-400 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && selectedAnswer.trim()) {
                    handleSubmit();
                  }
                }}
              />
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!selectedAnswer.trim()}
            className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            提交答案
          </button>
        </div>
      )}

      {/* Feedback display */}
      {feedbackState && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          {feedbackState.type === 'correct' ? (
            <CorrectFeedback points={feedbackState.points} />
          ) : (
            <IncorrectFeedback
              correctAnswer={feedbackState.correctAnswer}
              explanation={feedbackState.explanation}
            />
          )}

          <button
            onClick={handleNext}
            className="w-full mt-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            {currentIndex + 1 >= questions.length ? '查看总结' : '下一题'}
          </button>
        </div>
      )}

      {/* Points earned so far */}
      {totalPointsEarned > 0 && (
        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          已获得 <span className="font-semibold text-primary-600 dark:text-primary-400">{totalPointsEarned}</span> 分
        </div>
      )}
    </div>
  );
}

export default QuizPage;
