# Implementation Plan: English Learning News

## Overview

本实现计划将英语学习新闻应用拆分为可增量执行的编码任务。采用 React + TypeScript + Tailwind CSS 技术栈，使用 Zustand 进行状态管理，IndexedDB + LocalStorage 进行数据持久化，Vitest + fast-check 进行测试。每个任务建立在前一任务的基础上，确保代码始终可集成运行。本次更新覆盖了数据源切换功能（Requirement 10）、Content_Selector 组件、ContentSource 类型系统以及新增的属性测试（Properties 26-30）。

## Tasks

- [x] 1. Set up project structure and core types
  - [x] 1.1 Initialize React + TypeScript project with Vite, install dependencies (Tailwind CSS, Zustand, fast-check, vitest, React Testing Library)
    - Create project scaffold with Vite React-TS template
    - Configure Tailwind CSS with education-themed color palette
    - Configure Vitest with fast-check support
    - Set up project directory structure: `src/services/`, `src/components/`, `src/pages/`, `src/stores/`, `src/types/`, `src/utils/`
    - _Requirements: 9.1_

  - [x] 1.2 Define core TypeScript interfaces and types including ContentSource
    - Create `src/types/index.ts` with all shared types: `ContentSource`, `DifficultyLevel`, `NewsArticle`, `Sentence`, `VocabularyWord`, `Definition`, `WordBankEntry`, `QuizQuestion`, `QuizResult`, `QuizSession`, `QuizSummary`, `KnowledgePoint`, `GrammarExercise`, `VocabExercise`, `UserProgress`, `LearningSession`, `Achievement`, `UserSettings`, `TrainingSession`, `ExerciseResult`, `SessionSummary`, `ContentSelectorProps`, `ContentSelectorState`
    - Define `ContentSource` type: `'current-affairs' | 'senior-high' | 'junior-high' | 'junior-senior-mixed' | 'elementary'`
    - Define `SOURCE_DIFFICULTY_MAP` constant mapping each ContentSource to its DifficultyLevel
    - Define `CONTENT_SOURCE_LABELS` constant mapping each ContentSource to its Chinese label
    - Define `DEFAULT_CONTENT_SOURCE` constant as `'current-affairs'`
    - Define type enums/unions: `QuizType`, `KnowledgeType`, `GrammarTopic`
    - Ensure `NewsArticle` uses `contentSource: ContentSource` field (not category)
    - Ensure `UserSettings` includes `selectedSource: ContentSource` field
    - _Requirements: 1.1, 1.8, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 10.1_

  - [x] 1.3 Set up IndexedDB database schema and helper utilities
    - Create `src/utils/db.ts` with IndexedDB initialization (database: EnglishLearningNews)
    - Define object stores: articles, wordBank, knowledgePoints, translations, quizHistory
    - articles store indexes: `['publishedAt', 'contentSource', 'difficulty']` (使用 contentSource 而非 category)
    - Implement generic CRUD helpers for IndexedDB operations
    - _Requirements: 1.5, 3.5, 6.5, 10.4_

  - [x] 1.4 Set up LocalStorage utilities and Zustand stores
    - Create `src/utils/storage.ts` for LocalStorage read/write with type safety
    - Implement `ContentSourcePersistence` 接口: `saveSelectedSource(source)`, `loadSelectedSource()`, `DEFAULT_SOURCE`
    - 当无存储的数据源选择时，返回默认值 `'current-affairs'`
    - Create `src/stores/progressStore.ts` for user progress state
    - Create `src/stores/settingsStore.ts` for user settings (theme, fontSize, autoTranslate, highlightLevel, dailyGoal, selectedSource)
    - 在 LocalStorage 中独立存储 `'selected-content-source'` 键用于快速读取
    - _Requirements: 8.1, 9.3, 10.5, 10.6_


- [x] 2. Implement News_Fetcher service with ContentSource support
  - [x] 2.1 Implement news fetching with ContentSource parameter and caching logic
    - Create `src/services/newsFetcher.ts` implementing `NewsFetcher` interface
    - Implement `fetchArticles(source: ContentSource, count: number)`: 根据 ContentSource 调用对应 API 获取文章
    - Implement `filterBySource(articles, source)`: filter articles to match specified ContentSource only
    - Implement `getCachedArticles(source: ContentSource)`: retrieve cached articles filtered by contentSource from IndexedDB
    - Implement `getArticleById(id)`: fetch single article from cache or API
    - Implement `clearArticleCache()`: 清空文章缓存（数据源切换时调用）
    - Implement `getAvailableSources()`: 返回所有支持的 ContentSource 列表
    - Add error handling: on API failure, fall back to cached articles with friendly error message
    - 当特定数据源无内容时，返回空列表并由 UI 层提示切换其他数据源
    - _Requirements: 1.1, 1.7, 1.8, 10.2, 10.4, 10.9_

  - [ ]* 2.2 Write property test for content source filter
    - **Property 1: Content source filter only returns matching articles**
    - **Validates: Requirements 1.8, 10.4**

  - [ ]* 2.3 Write property test for article display fields
    - **Property 2: Article display contains required fields**
    - **Validates: Requirements 1.5**

  - [ ]* 2.4 Write property test for source switch clears and reloads articles
    - **Property 30: Source switch clears and reloads articles**
    - **Validates: Requirements 10.2, 10.4**

- [x] 3. Implement Content_Selector component and ContentSource persistence
  - [x] 3.1 Implement Content_Selector React component
    - Create `src/components/ContentSelector.tsx` implementing Content_Selector 组件
    - 展示五个 ContentSource 选项: current-affairs（时政新闻）, senior-high（高中英语）, junior-high（初中英语）, junior-senior-mixed（初高中混合）, elementary（小学英语）
    - 使用 `CONTENT_SOURCE_LABELS` 显示中文标签
    - 高亮当前选中的 ContentSource（视觉指示当前活动数据源）
    - 触发 `onSourceChange` 回调通知父组件数据源变更
    - 切换时显示加载状态 (isLoading)
    - 响应式设计，适配桌面和移动端
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 3.2 Implement ContentSource persistence logic
    - 在 `src/utils/storage.ts` 中完善数据源持久化逻辑
    - 数据源切换时调用 `saveSelectedSource` 保存到 LocalStorage
    - 应用启动时调用 `loadSelectedSource` 恢复上次选择
    - 无存储值时默认返回 `'current-affairs'`
    - 集成到 Zustand settingsStore 中同步 selectedSource 状态
    - _Requirements: 1.4, 10.5, 10.6_

  - [ ]* 3.3 Write property test for content source persistence round-trip
    - **Property 26: Content source persistence round-trip**
    - **Validates: Requirements 1.4, 10.5**

  - [ ]* 3.4 Write property test for active source indicator consistency
    - **Property 29: Active source indicator consistency**
    - **Validates: Requirements 10.3**

- [x] 4. Implement Translation Service
  - [x] 4.1 Implement translation service with caching
    - Create `src/services/translationService.ts` implementing `TranslationService` interface
    - Implement `translateSentence(sentence)`: call Translation API, return Chinese translation
    - Implement `translateBatch(sentences)`: batch translate for full translation mode
    - Implement `getCachedTranslation(sentence)`: lookup in IndexedDB translations store
    - Cache all successful translations to IndexedDB for offline use
    - Handle API failures gracefully with "翻译暂不可用" message
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 4.2 Write property test for full translation mode coverage
    - **Property 3: Full translation mode covers all sentences**
    - **Validates: Requirements 2.3**

- [x] 5. Implement Vocabulary_Module service with ContentSource difficulty mapping
  - [x] 5.1 Implement vocabulary identification and word details with source-based difficulty
    - Create `src/services/vocabularyModule.ts` implementing `VocabularyModule` interface
    - Implement `identifyKeyWords(article, userLevel)`: analyze article text, identify key vocabulary, assign difficulty levels
    - 使用 `SOURCE_DIFFICULTY_MAP` 将 ContentSource 映射为词汇难度阈值
    - 当数据源切换时，根据新数据源的难度级别调整词汇高亮范围
    - Implement `getWordDetails(word)`: call Dictionary API, return pronunciation, definitions, examples, part of speech
    - Implement `categorizeByDifficulty(words)`: categorize words into beginner/intermediate/advanced
    - Ensure every identified word exists within the article's text content
    - _Requirements: 1.9, 3.1, 3.2, 3.4, 10.7_

  - [ ]* 5.2 Write property test for vocabulary identification and categorization
    - **Property 4: Vocabulary identification and categorization**
    - **Validates: Requirements 3.1, 3.4**

  - [ ]* 5.3 Write property test for word details completeness
    - **Property 5: Word details completeness**
    - **Validates: Requirements 3.2**

  - [ ]* 5.4 Write property test for content source to vocabulary difficulty mapping
    - **Property 27: Content source to vocabulary difficulty mapping consistency**
    - **Validates: Requirements 1.9, 10.7**

  - [x] 5.5 Implement word bank persistence and management
    - Implement `addToWordBank(word)`: save word with context sentence to IndexedDB wordBank store
    - Implement `getWordBank()`: retrieve all saved words with mastery data
    - Implement `updateMastery(wordId, correct)`: update mastery level based on training results
    - Implement word organization: sort by recency, difficulty, and mastery level
    - _Requirements: 3.5, 6.5_

  - [ ]* 5.6 Write property test for word bank round-trip persistence
    - **Property 6: Word bank round-trip persistence**
    - **Validates: Requirements 3.5**

  - [ ]* 5.7 Write property test for word organization sorting invariant
    - **Property 16: Word organization sorting invariant**
    - **Validates: Requirements 6.5**

  - [x] 5.8 Implement vocabulary training exercise generation
    - Implement `generateTrainingExercises(words)`: generate spelling, definition-matching, and context-fill exercises
    - Each exercise must include source article title and source sentence
    - Ensure at least one exercise of each type when given 3+ words
    - _Requirements: 6.2, 6.3_

  - [ ]* 5.9 Write property test for vocabulary exercises source traceability
    - **Property 14: Vocabulary exercises include source traceability**
    - **Validates: Requirements 6.3**

  - [ ]* 5.10 Write property test for vocabulary exercise type coverage
    - **Property 15: Vocabulary exercise type coverage**
    - **Validates: Requirements 6.2**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Quiz_Module service with ContentSource difficulty adaptation
  - [x] 7.1 Implement quiz question generation and evaluation with source-based difficulty
    - Create `src/services/quizModule.ts` implementing `QuizModule` interface
    - Implement `generateQuestions(article, count)`: generate vocabulary-matching, fill-in-blank, reading-comprehension, and sentence-ordering questions from article content
    - 根据文章的 contentSource 对应的难度级别调整测验题目难度
    - Ensure at least 3 questions generated per article (with 3+ sentences)
    - Each question must reference sourceArticleId
    - Implement `evaluateAnswer(question, answer)`: compare answer, return QuizResult with isCorrect, points, and explanation
    - Correct answers award points > 0; incorrect answers include correct answer and explanation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 10.8_

  - [ ]* 7.2 Write property test for quiz generation minimum count
    - **Property 7: Quiz generation minimum count**
    - **Validates: Requirements 4.1**

  - [ ]* 7.3 Write property test for correct quiz answers award positive points
    - **Property 8: Correct quiz answers award positive points**
    - **Validates: Requirements 4.3**

  - [ ]* 7.4 Write property test for incorrect quiz answers include explanation
    - **Property 9: Incorrect quiz answers include explanation**
    - **Validates: Requirements 4.4**

  - [ ]* 7.5 Write property test for content source to quiz difficulty mapping
    - **Property 28: Content source to quiz difficulty mapping**
    - **Validates: Requirements 10.8**

  - [x] 7.6 Implement quiz session tracking and summary
    - Implement `getSessionSummary(session)`: calculate accuracy (C/N), total points (sum of correct), identify weak areas
    - Implement `getPerformanceHistory()`: retrieve past quiz sessions from IndexedDB
    - Store completed quiz sessions to IndexedDB quizHistory store
    - _Requirements: 4.5_

  - [ ]* 7.7 Write property test for quiz summary accuracy calculation
    - **Property 10: Quiz summary accuracy calculation**
    - **Validates: Requirements 4.5**

- [x] 8. Implement Knowledge_Expander service
  - [x] 8.1 Implement knowledge point identification and details
    - Create `src/services/knowledgeExpander.ts` implementing `KnowledgeExpander` interface
    - Implement `identifyKnowledgePoints(article)`: identify grammar points, idioms, and cultural references within article sentences
    - Each knowledge point must have valid type, and sourceSentence must be substring of article content
    - Implement `getKnowledgePointDetails(id)`: return full details with non-empty explanation and at least one example
    - Implement `getRelatedResources(pointId)`: find related knowledge points
    - Implement `suggestNextPoint(completedIds)`: suggest next point not in completed set
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 8.2 Write property test for knowledge points reference source content
    - **Property 11: Knowledge points reference source content**
    - **Validates: Requirements 5.1**

  - [ ]* 8.3 Write property test for knowledge point details completeness
    - **Property 12: Knowledge point details completeness**
    - **Validates: Requirements 5.2**

  - [ ]* 8.4 Write property test for next knowledge point suggestion excludes completed
    - **Property 13: Next knowledge point suggestion excludes completed**
    - **Validates: Requirements 5.4**

  - [x] 8.5 Implement grammar exercise generation and mastery tracking
    - Implement `generateGrammarExercises(points)`: generate sentence-correction, structure-analysis, and transformation exercises
    - Each exercise includes source article title and source sentence
    - Ensure at least one exercise of each type when given 3+ grammar points
    - Implement `trackGrammarMastery(pointId, correct)`: update mastery score in IndexedDB
    - Implement `getGrammarProgress()`: return mastery by GrammarTopic
    - Categorize all grammar points by topic and difficulty level
    - Incorrect answers provide detailed explanation with additional examples
    - Recommend grammar points with mastery below threshold
    - _Requirements: 7.2, 7.3, 7.5, 7.6, 7.7_

  - [ ]* 8.6 Write property test for grammar exercises source traceability
    - **Property 18: Grammar exercises include source traceability**
    - **Validates: Requirements 7.3**

  - [ ]* 8.7 Write property test for grammar exercise type coverage
    - **Property 19: Grammar exercise type coverage**
    - **Validates: Requirements 7.2**

  - [ ]* 8.8 Write property test for grammar categorization validity
    - **Property 20: Grammar categorization validity**
    - **Validates: Requirements 7.5**

  - [ ]* 8.9 Write property test for incorrect grammar answers include explanation and examples
    - **Property 21: Incorrect grammar answers include explanation and examples**
    - **Validates: Requirements 7.6**

  - [ ]* 8.10 Write property test for grammar recommendations target low-mastery points
    - **Property 22: Grammar recommendations target low-mastery points**
    - **Validates: Requirements 7.7**

- [x] 9. Implement Progress Manager service
  - [x] 9.1 Implement progress tracking and recommendations
    - Create `src/services/progressManager.ts` implementing `ProgressManager` interface
    - Implement `getUserProgress()`: read from LocalStorage, return UserProgress
    - Implement `updateSessionStats(session)`: update totalWordsLearned, totalArticlesRead, calculate daily streak
    - Implement `calculateDailyStreak()`: compute consecutive active dates
    - Implement `getRecommendedArticles(progress, articles)`: filter by user level (or adjacent), exclude reading history
    - Implement `checkAchievements(progress)`: check milestone achievements (streak, words, articles, quiz, grammar)
    - Implement `getPendingReviews()`: return words due for review
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 9.2 Write property test for progress state consistency after session update
    - **Property 23: Progress state consistency after session update**
    - **Validates: Requirements 8.1, 8.2**

  - [ ]* 9.3 Write property test for article recommendations match level and exclude history
    - **Property 24: Article recommendations match level and exclude history**
    - **Validates: Requirements 8.3**

  - [ ]* 9.4 Write property test for daily goal completion generates summary
    - **Property 25: Daily goal completion generates summary**
    - **Validates: Requirements 9.5**

- [x] 10. Checkpoint - Ensure all service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement UI pages and components - Content Selector, News List and Article Reader
  - [x] 11.1 Implement News List page with Content_Selector integration
    - Create `src/pages/NewsList.tsx`: display at least 5 articles with title, summary, publication date
    - 在页面顶部集成 Content_Selector 组件，允许用户切换数据源
    - 切换数据源时清空当前文章列表并加载新数据源的内容
    - Implement article card components with contentSource badges
    - Add loading state and error fallback UI (friendly error message + cached articles)
    - 当数据源无可用内容时，显示提示信息并建议切换到其他数据源
    - Implement pull-to-refresh and pagination
    - _Requirements: 1.1, 1.3, 1.5, 1.7, 10.1, 10.2, 10.4, 10.9_

  - [x] 11.2 Implement Article Reader page
    - Create `src/pages/ArticleReader.tsx`: display full article with paragraph-level formatting
    - Implement sentence-level Chinese translation toggle (tap to show/hide per sentence)
    - Implement full translation mode toggle (show all translations simultaneously)
    - Visually distinguish English text from Chinese translation (different font styles/colors)
    - Integrate Vocabulary_Module: highlight key words based on ContentSource difficulty level
    - Implement word tap popup: show pronunciation, Chinese definition, example sentences, part of speech
    - Implement long-press any word for dictionary lookup
    - Add "add to word bank" button in word popup
    - _Requirements: 1.6, 1.9, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.5_

  - [x] 11.3 Implement Knowledge Point tags in Article Reader
    - Display tagged grammar points, idioms, and cultural references within article text
    - Implement tap-to-show explanation card with detailed info and examples
    - Add link to related resources for each knowledge point
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 12. Implement UI pages - Quiz, Vocabulary Training, Grammar Training
  - [x] 12.1 Implement Quiz page with ContentSource difficulty adaptation
    - Create `src/pages/QuizPage.tsx`: quiz interface triggered after reading an article
    - Implement multiple quiz types: vocabulary-matching, fill-in-blank, reading-comprehension, sentence-ordering
    - 根据当前文章的 ContentSource 生成适当难度的测验题目
    - Display positive feedback animation for correct answers with point awards
    - Display correct answer and explanation for incorrect answers
    - Show quiz session summary with performance stats (accuracy, points, weak areas)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.8_

  - [x] 12.2 Implement Vocabulary Training page
    - Create `src/pages/VocabularyTraining.tsx`: dedicated training page accessible from main navigation
    - Implement exercises: spelling practice, definition matching, context fill-in-the-blank
    - Display source article title and original sentence for each word
    - Implement tap on source sentence to navigate to article with sentence highlighted
    - Organize training words by recency, difficulty, mastery level
    - Display session summary with accuracy rate and words mastered
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 12.3 Implement Grammar Training page
    - Create `src/pages/GrammarTraining.tsx`: dedicated grammar training page accessible from main navigation
    - Implement exercises: sentence correction, structure analysis, transformation practice
    - Display source article title and original sentence for each grammar point
    - Implement tap on source sentence to navigate to article with sentence highlighted
    - Categorize grammar points by topic and difficulty level
    - Display detailed grammar rule explanation with additional examples for incorrect answers
    - Track and display grammar mastery progress
    - Recommend grammar points needing further practice
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 13. Implement Dashboard and Navigation
  - [x] 13.1 Implement Learning Dashboard
    - Create `src/pages/Dashboard.tsx`: display daily streak, total words learned, articles read
    - Display progress summary after learning sessions
    - Show personalized article recommendations (based on level, excluding read articles)
    - Highlight new articles and pending vocabulary reviews
    - Display achievement milestones with celebration animations
    - Show encouraging summary when daily goals are completed
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.2, 9.5_

  - [x] 13.2 Implement main navigation and app shell
    - Create `src/App.tsx` with routing: News List, Article Reader, Quiz, Vocabulary Training, Grammar Training, Dashboard
    - Implement main navigation with access to all training pages
    - Apply responsive layout for desktop and mobile
    - Implement light/dark theme toggle using Zustand settings store
    - Apply clean, modern design with education-themed color palette
    - _Requirements: 6.1, 7.1, 9.1, 9.3, 9.4_

- [x] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Integration wiring and final polish
  - [x] 15.1 Wire all services into UI components with ContentSource flow
    - Connect News_Fetcher to NewsList and ArticleReader pages, with ContentSource parameter
    - Connect Content_Selector to settingsStore 和 News_Fetcher，实现数据源切换完整链路
    - Connect TranslationService to ArticleReader translation features
    - Connect VocabularyModule to ArticleReader word highlights (difficulty based on ContentSource)
    - Connect QuizModule to QuizPage (difficulty based on ContentSource)
    - Connect KnowledgeExpander to ArticleReader tags and GrammarTraining page
    - Connect ProgressManager to Dashboard and session tracking across all pages
    - 确保数据源切换时触发词汇难度和测验难度的联动更新
    - Ensure data flows correctly between modules (e.g., switch source → load articles → read → quiz → progress)
    - _Requirements: 1.1, 1.9, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 10.2, 10.7, 10.8_

  - [ ]* 15.2 Write integration tests for core user flows including source switching
    - Test: open app → verify default source (current-affairs) → switch source → verify content updates
    - Test: switch source → verify vocabulary difficulty changes → verify quiz difficulty adapts
    - Test: close app → reopen → verify source selection persisted
    - Test: read article → generate quiz → answer questions → update progress
    - Test: add word to bank → vocabulary training → view source article
    - Test: grammar training → incorrect answer → view explanation → navigate to source
    - Test: source unavailable → display message → suggest alternative
    - _Requirements: 1.1, 1.4, 4.1, 6.3, 6.4, 7.3, 7.4, 10.2, 10.5, 10.7, 10.9_

  - [ ]* 15.3 Write unit tests for UI components including Content_Selector
    - Test Content_Selector renders all 5 source options with correct labels
    - Test Content_Selector highlights active source correctly
    - Test Content_Selector fires onSourceChange callback
    - Test article list rendering with title, summary, date
    - Test translation toggle visibility and styling
    - Test word popup content display
    - Test theme switching (light/dark)
    - Test responsive layout breakpoints
    - _Requirements: 1.5, 2.4, 3.2, 9.3, 9.4, 10.1, 10.3_

- [x] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties defined in the design document（共 30 条属性）
- Unit tests validate specific examples and edge cases
- The project uses TypeScript throughout with strict type checking
- All service modules are independent and communicate through typed interfaces
- IndexedDB provides offline-first capability for cached articles and user data
- Tailwind CSS enables rapid responsive UI development with themed design tokens
- ContentSource 类型贯穿整个系统，从类型定义到 UI 组件再到服务层
- 数据源切换是核心功能之一，涉及 News_Fetcher、Vocabulary_Module、Quiz_Module 的联动
- SOURCE_DIFFICULTY_MAP 确保数据源与难度级别的一致映射

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "1.4"] },
    { "id": 3, "tasks": ["2.1", "4.1"] },
    { "id": 4, "tasks": ["2.2", "2.3", "2.4", "3.1", "4.2"] },
    { "id": 5, "tasks": ["3.2", "3.3", "3.4", "5.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "5.4", "5.5"] },
    { "id": 7, "tasks": ["5.6", "5.7", "5.8"] },
    { "id": 8, "tasks": ["5.9", "5.10", "7.1"] },
    { "id": 9, "tasks": ["7.2", "7.3", "7.4", "7.5", "7.6"] },
    { "id": 10, "tasks": ["7.7", "8.1"] },
    { "id": 11, "tasks": ["8.2", "8.3", "8.4", "8.5"] },
    { "id": 12, "tasks": ["8.6", "8.7", "8.8", "8.9", "8.10", "9.1"] },
    { "id": 13, "tasks": ["9.2", "9.3", "9.4"] },
    { "id": 14, "tasks": ["11.1", "11.2"] },
    { "id": 15, "tasks": ["11.3", "12.1", "12.2", "12.3"] },
    { "id": 16, "tasks": ["13.1", "13.2"] },
    { "id": 17, "tasks": ["15.1"] },
    { "id": 18, "tasks": ["15.2", "15.3"] }
  ]
}
```
