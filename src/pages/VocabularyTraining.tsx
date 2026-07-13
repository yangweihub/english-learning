import { useState, useEffect, useCallback, useMemo } from 'react';
import type { VocabExercise, ExerciseResult, SessionSummary } from '../types';
import {
  getWordBank,
  generateTrainingExercises,
  updateMastery,
  organizeWordBank,
} from '../services/vocabularyModule';
import type { WordBankSortCriteria } from '../services/vocabularyModule';

// ============================================================
// Types
// ============================================================

type TrainingPhase = 'loading' | 'empty' | 'training' | 'summary';

// ============================================================
// VocabularyTraining Page Component
// ============================================================

/**
 * Dedicated vocabulary training page accessible from main navigation.
 * Implements exercises: spelling practice, definition matching, context fill-in-the-blank.
 * Displays source article title and original sentence for each word.
 * Organizes training words by recency, difficulty, mastery level.
 * Shows session summary with accuracy rate and words mastered.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
export function VocabularyTraining() {
  const [phase, setPhase] = useState<TrainingPhase>('loading');
  const [exercises, setExercises] = useState<VocabExercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ shown: boolean; correct: boolean } | null>(null);
  const [sortBy, setSortBy] = useState<WordBankSortCriteria>('recency');
  const [sessionStartedAt] = useState<Date>(new Date());

  // Load word bank and generate exercises
  useEffect(() => {
    async function loadExercises() {
      try {
        const wordBank = await getWordBank();
        if (wordBank.length === 0) {
          setPhase('empty');
          return;
        }
        const organized = organizeWordBank(wordBank, sortBy);
        const generated = generateTrainingExercises(organized);
        setExercises(generated);
        setPhase('training');
      } catch {
        setPhase('empty');
      }
    }
    loadExercises();
  }, [sortBy]);

  const currentExercise = exercises[currentIndex] ?? null;

  // Handle answer submission
  const handleSubmit = useCallback(async () => {
    if (!currentExercise || feedback?.shown) return;

    const trimmedAnswer = userAnswer.trim();
    const isCorrect =
      trimmedAnswer.toLowerCase() === currentExercise.correctAnswer.toLowerCase();

    const result: ExerciseResult = {
      exerciseId: currentExercise.id,
      userAnswer: trimmedAnswer,
      isCorrect,
      timeSpent: 0,
    };

    setResults((prev) => [...prev, result]);
    setFeedback({ shown: true, correct: isCorrect });

    // Update mastery in the background
    try {
      await updateMastery(currentExercise.word.id, isCorrect);
    } catch {
      // Silently handle mastery update failure
    }
  }, [currentExercise, userAnswer, feedback]);

  // Move to next exercise or show summary
  const handleNext = useCallback(() => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setUserAnswer('');
      setFeedback(null);
    } else {
      setPhase('summary');
    }
  }, [currentIndex, exercises.length]);

  // Handle option selection for definition-matching
  const handleOptionSelect = useCallback(
    async (option: string) => {
      if (!currentExercise || feedback?.shown) return;

      const isCorrect =
        option.toLowerCase() === currentExercise.correctAnswer.toLowerCase();

      const result: ExerciseResult = {
        exerciseId: currentExercise.id,
        userAnswer: option,
        isCorrect,
        timeSpent: 0,
      };

      setResults((prev) => [...prev, result]);
      setFeedback({ shown: true, correct: isCorrect });

      try {
        await updateMastery(currentExercise.word.id, isCorrect);
      } catch {
        // Silently handle mastery update failure
      }
    },
    [currentExercise, feedback]
  );

  // Navigate to source article (placeholder - navigates via URL)
  const handleNavigateToSource = useCallback((exercise: VocabExercise) => {
    if (exercise.word.sourceArticleId) {
      // Navigate to article with sentence highlighted
      const articleId = exercise.word.sourceArticleId;
      const sentence = encodeURIComponent(exercise.sourceSentence);
      window.location.hash = `#/article/${articleId}?highlight=${sentence}`;
    }
  }, []);

  // Compute session summary
  const summary: SessionSummary = useMemo(() => {
    const totalExercises = results.length;
    const correctCount = results.filter((r) => r.isCorrect).length;
    const accuracy = totalExercises > 0 ? correctCount / totalExercises : 0;
    const wordsMastered = results
      .filter((r) => r.isCorrect)
      .map((r) => {
        const exercise = exercises.find((e) => e.id === r.exerciseId);
        return exercise?.word.word ?? '';
      })
      .filter(Boolean);

    const duration = Math.round((Date.now() - sessionStartedAt.getTime()) / 1000);

    return {
      totalExercises,
      correctCount,
      accuracy,
      wordsMastered,
      grammarPointsMastered: [],
      duration,
    };
  }, [results, exercises, sessionStartedAt]);

  // Restart training
  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setResults([]);
    setUserAnswer('');
    setFeedback(null);
    setPhase('loading');
    // Re-trigger load by changing sort (or same sort re-loads)
    setSortBy((prev) => prev);
    // Force reload
    async function reload() {
      try {
        const wordBank = await getWordBank();
        if (wordBank.length === 0) {
          setPhase('empty');
          return;
        }
        const organized = organizeWordBank(wordBank, sortBy);
        const generated = generateTrainingExercises(organized);
        setExercises(generated);
        setPhase('training');
      } catch {
        setPhase('empty');
      }
    }
    reload();
  }, [sortBy]);

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      {/* Header */}
      <header className="max-w-2xl mx-auto mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          单词专项训练
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Vocabulary Training
        </p>
      </header>

      {/* Sort Controls */}
      {phase === 'training' && (
        <div className="max-w-2xl mx-auto mb-4">
          <SortControls currentSort={sortBy} onSortChange={setSortBy} />
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-2xl mx-auto">
        {phase === 'loading' && <LoadingState />}
        {phase === 'empty' && <EmptyState />}
        {phase === 'training' && currentExercise && (
          <ExerciseCard
            exercise={currentExercise}
            currentIndex={currentIndex}
            totalExercises={exercises.length}
            userAnswer={userAnswer}
            feedback={feedback}
            onAnswerChange={setUserAnswer}
            onSubmit={handleSubmit}
            onNext={handleNext}
            onOptionSelect={handleOptionSelect}
            onNavigateToSource={handleNavigateToSource}
          />
        )}
        {phase === 'summary' && (
          <SessionSummaryCard summary={summary} onRestart={handleRestart} />
        )}
      </div>
    </div>
  );
}

// ============================================================
// Sub-Components
// ============================================================

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12" aria-live="polite">
      <svg
        className="animate-spin h-8 w-8 text-primary-500"
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
      <span className="ml-3 text-gray-600 dark:text-gray-300">加载训练内容...</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="text-5xl mb-4">📚</div>
      <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
        词库为空
      </h2>
      <p className="text-gray-500 dark:text-gray-400">
        阅读文章时将单词添加到词库，即可开始训练
      </p>
    </div>
  );
}

interface SortControlsProps {
  currentSort: WordBankSortCriteria;
  onSortChange: (sort: WordBankSortCriteria) => void;
}

function SortControls({ currentSort, onSortChange }: SortControlsProps) {
  const options: { value: WordBankSortCriteria; label: string }[] = [
    { value: 'recency', label: '最近添加' },
    { value: 'difficulty', label: '按难度' },
    { value: 'mastery', label: '按掌握度' },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">排序：</span>
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSortChange(opt.value)}
            className={`
              px-3 py-1 text-xs font-medium rounded-full transition-colors
              ${
                currentSort === opt.value
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
              }
            `}
            aria-pressed={currentSort === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ExerciseCardProps {
  exercise: VocabExercise;
  currentIndex: number;
  totalExercises: number;
  userAnswer: string;
  feedback: { shown: boolean; correct: boolean } | null;
  onAnswerChange: (value: string) => void;
  onSubmit: () => void;
  onNext: () => void;
  onOptionSelect: (option: string) => void;
  onNavigateToSource: (exercise: VocabExercise) => void;
}

function ExerciseCard({
  exercise,
  currentIndex,
  totalExercises,
  userAnswer,
  feedback,
  onAnswerChange,
  onSubmit,
  onNext,
  onOptionSelect,
  onNavigateToSource,
}: ExerciseCardProps) {
  const typeLabels: Record<VocabExercise['type'], string> = {
    spelling: '拼写练习',
    'definition-matching': '释义匹配',
    'context-fill': '语境填空',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {currentIndex + 1} / {totalExercises}
        </span>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
          {typeLabels[exercise.type]}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mb-6">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / totalExercises) * 100}%` }}
        />
      </div>

      {/* Question */}
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {exercise.question}
      </h2>

      {/* Answer area */}
      {exercise.type === 'definition-matching' && exercise.options ? (
        <DefinitionMatchingInput
          options={exercise.options}
          feedback={feedback}
          correctAnswer={exercise.correctAnswer}
          onOptionSelect={onOptionSelect}
        />
      ) : (
        <TextInput
          value={userAnswer}
          feedback={feedback}
          correctAnswer={exercise.correctAnswer}
          onChange={onAnswerChange}
          onSubmit={onSubmit}
        />
      )}

      {/* Feedback */}
      {feedback?.shown && (
        <FeedbackDisplay
          correct={feedback.correct}
          correctAnswer={exercise.correctAnswer}
        />
      )}

      {/* Source info */}
      <SourceInfo exercise={exercise} onNavigate={onNavigateToSource} />

      {/* Next button */}
      {feedback?.shown && (
        <button
          onClick={onNext}
          className="mt-4 w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          {currentIndex < totalExercises - 1 ? '下一题' : '查看结果'}
        </button>
      )}
    </div>
  );
}

interface TextInputProps {
  value: string;
  feedback: { shown: boolean; correct: boolean } | null;
  correctAnswer: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

function TextInput({ value, feedback, onChange, onSubmit }: TextInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !feedback?.shown) {
      onSubmit();
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={feedback?.shown}
        placeholder="输入你的答案..."
        className={`
          flex-1 px-4 py-2.5 border rounded-lg text-gray-900 dark:text-white
          bg-white dark:bg-gray-700 transition-colors
          focus:outline-none focus:ring-2 focus:ring-primary-500
          disabled:opacity-60 disabled:cursor-not-allowed
          ${
            feedback?.shown
              ? feedback.correct
                ? 'border-green-500'
                : 'border-red-500'
              : 'border-gray-300 dark:border-gray-600'
          }
        `}
        aria-label="答案输入"
      />
      {!feedback?.shown && (
        <button
          onClick={onSubmit}
          disabled={!value.trim()}
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed"
        >
          提交
        </button>
      )}
    </div>
  );
}

interface DefinitionMatchingInputProps {
  options: string[];
  feedback: { shown: boolean; correct: boolean } | null;
  correctAnswer: string;
  onOptionSelect: (option: string) => void;
}

function DefinitionMatchingInput({
  options,
  feedback,
  correctAnswer,
  onOptionSelect,
}: DefinitionMatchingInputProps) {
  return (
    <div className="grid gap-2">
      {options.map((option, idx) => {
        let optionStyle = 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20';

        if (feedback?.shown) {
          if (option === correctAnswer) {
            optionStyle = 'border-green-500 bg-green-50 dark:bg-green-900/20';
          } else if (!feedback.correct && option !== correctAnswer) {
            optionStyle = 'border-gray-300 dark:border-gray-600 opacity-60';
          }
        }

        return (
          <button
            key={idx}
            onClick={() => onOptionSelect(option)}
            disabled={feedback?.shown}
            className={`
              w-full text-left px-4 py-3 border rounded-lg text-sm
              text-gray-800 dark:text-gray-200 transition-all
              disabled:cursor-not-allowed
              ${optionStyle}
            `}
          >
            <span className="font-medium text-gray-500 dark:text-gray-400 mr-2">
              {String.fromCharCode(65 + idx)}.
            </span>
            {option}
          </button>
        );
      })}
    </div>
  );
}

interface FeedbackDisplayProps {
  correct: boolean;
  correctAnswer: string;
}

function FeedbackDisplay({ correct, correctAnswer }: FeedbackDisplayProps) {
  return (
    <div
      className={`mt-4 p-3 rounded-lg ${
        correct
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
      }`}
      role="alert"
    >
      {correct ? (
        <p className="text-green-700 dark:text-green-300 font-medium">
          ✅ 正确！
        </p>
      ) : (
        <div>
          <p className="text-red-700 dark:text-red-300 font-medium">
            ❌ 不正确
          </p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            正确答案：<span className="font-semibold">{correctAnswer}</span>
          </p>
        </div>
      )}
    </div>
  );
}

interface SourceInfoProps {
  exercise: VocabExercise;
  onNavigate: (exercise: VocabExercise) => void;
}

function SourceInfo({ exercise, onNavigate }: SourceInfoProps) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
      {/* Source article title */}
      {exercise.sourceArticleTitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          来源：{exercise.sourceArticleTitle}
        </p>
      )}

      {/* Source sentence - tappable to navigate to article */}
      {exercise.sourceSentence && (
        <button
          onClick={() => onNavigate(exercise)}
          className="text-left text-sm text-primary-600 dark:text-primary-400 hover:underline italic leading-relaxed"
          title="点击查看原文"
          aria-label={`查看来源句子: ${exercise.sourceSentence}`}
        >
          "{exercise.sourceSentence}"
        </button>
      )}
    </div>
  );
}

interface SessionSummaryCardProps {
  summary: SessionSummary;
  onRestart: () => void;
}

function SessionSummaryCard({ summary, onRestart }: SessionSummaryCardProps) {
  const accuracyPercent = Math.round(summary.accuracy * 100);
  const minutes = Math.floor(summary.duration / 60);
  const seconds = summary.duration % 60;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🎉</div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          训练完成！
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Session Complete
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard label="总题数" value={String(summary.totalExercises)} />
        <StatCard label="正确数" value={String(summary.correctCount)} />
        <StatCard
          label="正确率"
          value={`${accuracyPercent}%`}
          highlight={accuracyPercent >= 80}
        />
        <StatCard
          label="用时"
          value={minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`}
        />
      </div>

      {/* Words mastered */}
      {summary.wordsMastered.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            本次掌握的单词
          </h3>
          <div className="flex flex-wrap gap-2">
            {summary.wordsMastered.map((word, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Encouragement message */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
        {accuracyPercent >= 80
          ? '太棒了！继续保持！ 🌟'
          : accuracyPercent >= 50
          ? '不错的表现，继续加油！ 💪'
          : '多练习几次，你会越来越好的！ 📖'}
      </div>

      {/* Restart button */}
      <button
        onClick={onRestart}
        className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        再练一次
      </button>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function StatCard({ label, value, highlight }: StatCardProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p
        className={`text-lg font-bold ${
          highlight
            ? 'text-green-600 dark:text-green-400'
            : 'text-gray-900 dark:text-white'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default VocabularyTraining;
