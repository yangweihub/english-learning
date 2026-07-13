# Requirements Document

## Introduction

本功能是一个英语学习网页应用，支持多种内容来源作为学习素材。用户（中文母语者）可以根据自身需求在多种数据源之间自由切换，包括：时政新闻、高中英语、初中英语、初中高中混合、小学英语。应用不限于单一内容来源，而是允许用户根据个人英语水平和兴趣领域选择最合适的学习素材。系统提供趣味性、易学性和知识扩展能力，帮助用户在真实语境中提升英语水平。数据源切换功能是系统的核心能力之一，确保不同水平的学习者都能找到适合自己的内容。

## Glossary

- **Learning_Page**: 英语学习网页应用的主界面，用于展示学习内容和学习功能
- **News_Fetcher**: 负责获取学习内容的数据服务模块，支持从多种内容来源获取数据
- **Content_Source**: 内容来源类型，定义了系统支持的数据源种类，包括：current-affairs（时政新闻）、senior-high（高中英语）、junior-high（初中英语）、junior-senior-mixed（初中高中混合）、elementary（小学英语）
- **Content_Selector**: 内容来源选择器组件，允许用户在不同 Content_Source 之间切换
- **Vocabulary_Module**: 词汇学习模块，负责单词高亮、释义展示和扩展学习
- **Quiz_Module**: 趣味测验模块，基于学习内容生成互动练习
- **Knowledge_Expander**: 知识扩展模块，提供语法点、文化背景和相关知识的延伸学习
- **User**: 使用该应用学习英语的中文母语用户
- **Learning_Article**: 一篇经过筛选的英文学习文章，来源于用户选择的 Content_Source

## Requirements

### Requirement 1: 内容来源获取与展示

**User Story:** As a User, I want to read English learning articles from my selected content source on the Learning_Page, so that I can learn English through content appropriate to my level and interests.

#### Acceptance Criteria

1. WHEN the User opens the Learning_Page, THE News_Fetcher SHALL retrieve and display at least 5 recent articles from the User's currently selected Content_Source.
2. THE Content_Selector SHALL provide all supported Content_Source options, allowing the User to freely switch between different content sources at any time.
3. WHEN the User switches Content_Source via the Content_Selector, THE News_Fetcher SHALL retrieve and display articles from the newly selected Content_Source within 3 seconds.
4. THE Learning_Page SHALL persist the User's Content_Source selection so that it is restored on subsequent visits.
5. WHEN a Learning_Article is displayed, THE Learning_Page SHALL show the article title, summary, and publication date.
6. WHEN the User selects a Learning_Article, THE Learning_Page SHALL display the full article content with paragraph-level formatting.
7. IF the News_Fetcher fails to retrieve articles, THEN THE Learning_Page SHALL display a friendly error message and offer cached articles as fallback.
8. THE News_Fetcher SHALL filter retrieved content to match the selected Content_Source category.
9. THE Learning_Page SHALL adjust vocabulary highlighting difficulty based on the selected Content_Source level.

### Requirement 2: 中英文对照与翻译辅助

**User Story:** As a User, I want to see Chinese translations alongside English learning content, so that I can understand the meaning while learning new vocabulary.

#### Acceptance Criteria

1. WHEN a Learning_Article is displayed, THE Learning_Page SHALL provide a sentence-level Chinese translation toggle.
2. WHEN the User taps on a sentence, THE Learning_Page SHALL display the Chinese translation of that sentence below the original English text.
3. WHEN the User enables full translation mode, THE Learning_Page SHALL display Chinese translations for all sentences simultaneously.
4. THE Learning_Page SHALL clearly distinguish English original text from Chinese translation text using different font styles or colors.

### Requirement 3: 词汇学习与高亮

**User Story:** As a User, I want to learn new vocabulary from the learning articles, so that I can expand my English word bank in context.

#### Acceptance Criteria

1. WHEN a Learning_Article is displayed, THE Vocabulary_Module SHALL automatically identify and highlight key vocabulary words based on difficulty level appropriate to the selected Content_Source.
2. WHEN the User taps on a highlighted word, THE Vocabulary_Module SHALL display a popup with the word's pronunciation, Chinese definition, example sentences, and part of speech.
3. WHEN the User long-presses any word in the article, THE Vocabulary_Module SHALL provide a dictionary lookup for that word.
4. THE Vocabulary_Module SHALL categorize vocabulary into difficulty levels: beginner, intermediate, and advanced.
5. WHEN the User adds a word to their word bank, THE Vocabulary_Module SHALL save the word with its context sentence for later review.

### Requirement 4: 趣味互动测验

**User Story:** As a User, I want to take fun quizzes based on the content I read, so that I can reinforce my learning in an engaging way.

#### Acceptance Criteria

1. WHEN the User finishes reading a Learning_Article, THE Quiz_Module SHALL generate at least 3 quiz questions based on the article content.
2. THE Quiz_Module SHALL provide multiple quiz types including vocabulary matching, fill-in-the-blank, reading comprehension, and sentence ordering.
3. WHEN the User answers a quiz question correctly, THE Quiz_Module SHALL display a positive feedback animation and award points.
4. WHEN the User answers a quiz question incorrectly, THE Quiz_Module SHALL display the correct answer with an explanation.
5. THE Quiz_Module SHALL track the User's quiz performance and display a progress summary.

### Requirement 5: 知识扩展学习

**User Story:** As a User, I want to explore extended knowledge points from the learning articles, so that I can deepen my understanding of grammar, culture, and related topics.

#### Acceptance Criteria

1. WHEN a Learning_Article is displayed, THE Knowledge_Expander SHALL identify and tag grammar points, idioms, and cultural references within the article.
2. WHEN the User taps on a tagged knowledge point, THE Knowledge_Expander SHALL display an explanation card with detailed information and additional examples.
3. THE Knowledge_Expander SHALL provide related articles or resources for each knowledge point to enable further exploration.
4. WHEN the User completes a knowledge point review, THE Knowledge_Expander SHALL suggest the next related knowledge point for progressive learning.

### Requirement 6: 单词专项训练

**User Story:** As a User, I want to practice vocabulary independently from the articles, so that I can reinforce word retention and review words from specific articles and sentences.

#### Acceptance Criteria

1. THE Vocabulary_Module SHALL provide a dedicated vocabulary training page accessible from the main navigation.
2. WHEN the User enters vocabulary training, THE Vocabulary_Module SHALL present exercises including spelling practice, definition matching, and context fill-in-the-blank.
3. WHEN the User reviews a word during training, THE Vocabulary_Module SHALL display the source Learning_Article title and the original sentence where the word appeared.
4. WHEN the User taps on the source sentence, THE Vocabulary_Module SHALL navigate to the corresponding Learning_Article with the sentence highlighted.
5. THE Vocabulary_Module SHALL organize training words by recency, difficulty, and mastery level.
6. WHEN the User completes a vocabulary training session, THE Vocabulary_Module SHALL display a session summary with accuracy rate and words mastered.

### Requirement 7: 语法专项训练

**User Story:** As a User, I want to practice grammar points independently, so that I can strengthen my understanding of English grammar rules encountered in articles.

#### Acceptance Criteria

1. THE Knowledge_Expander SHALL provide a dedicated grammar training page accessible from the main navigation.
2. WHEN the User enters grammar training, THE Knowledge_Expander SHALL present exercises including sentence correction, structure analysis, and transformation practice.
3. WHEN the User reviews a grammar point during training, THE Knowledge_Expander SHALL display the source Learning_Article title and the original sentence demonstrating the grammar point.
4. WHEN the User taps on the source sentence, THE Knowledge_Expander SHALL navigate to the corresponding Learning_Article with the sentence highlighted.
5. THE Knowledge_Expander SHALL categorize grammar points by topic (tenses, clauses, prepositions, etc.) and difficulty level.
6. WHEN the User answers a grammar exercise incorrectly, THE Knowledge_Expander SHALL provide a detailed explanation of the grammar rule with additional examples from other articles.
7. THE Knowledge_Expander SHALL track grammar mastery progress and recommend grammar points that need further practice.

### Requirement 8: 学习进度与个性化

**User Story:** As a User, I want to track my learning progress and receive personalized recommendations, so that I can stay motivated and learn efficiently.

#### Acceptance Criteria

1. THE Learning_Page SHALL display the User's daily learning streak, total words learned, and articles read.
2. WHEN the User completes a learning session, THE Learning_Page SHALL update the progress dashboard with session statistics.
3. THE Learning_Page SHALL recommend Learning_Articles based on the User's selected Content_Source, vocabulary level, and reading history.
4. WHEN the User returns to the Learning_Page, THE Learning_Page SHALL highlight new articles and pending vocabulary reviews.

### Requirement 9: 界面趣味性与用户体验

**User Story:** As a User, I want the learning interface to be visually appealing and fun to use, so that I stay engaged and motivated to learn daily.

#### Acceptance Criteria

1. THE Learning_Page SHALL use a clean, modern design with an education-themed color palette.
2. WHEN the User earns achievement milestones, THE Learning_Page SHALL display celebration animations.
3. THE Learning_Page SHALL support both light and dark display modes.
4. THE Learning_Page SHALL be responsive and function correctly on both desktop and mobile screen sizes.
5. WHEN the User completes daily learning goals, THE Learning_Page SHALL display an encouraging summary message.

### Requirement 10: 数据源切换功能

**User Story:** As a User, I want to freely switch between multiple content sources (时政新闻, 高中英语, 初中英语, 初中高中混合, 小学英语), so that I can choose learning materials that match my current English level and interests.

#### Acceptance Criteria

1. THE Content_Selector SHALL display the following five Content_Source options: current-affairs（时政新闻）, senior-high（高中英语）, junior-high（初中英语）, junior-senior-mixed（初中高中混合）, elementary（小学英语）.
2. WHEN the User selects a Content_Source from the Content_Selector, THE Learning_Page SHALL immediately update the displayed content to reflect the newly selected source.
3. THE Content_Selector SHALL visually indicate the currently active Content_Source at all times.
4. WHEN the User switches Content_Source, THE News_Fetcher SHALL clear the current article list and load articles specific to the new Content_Source.
5. THE Learning_Page SHALL store the User's most recent Content_Source selection in LocalStorage so that it persists across browser sessions.
6. WHEN the application starts without a stored Content_Source preference, THE Content_Selector SHALL default to current-affairs（时政新闻）as the initial Content_Source.
7. WHEN the User switches Content_Source, THE Vocabulary_Module SHALL adjust the vocabulary difficulty threshold to match the expected level of the selected Content_Source.
8. WHEN the User switches Content_Source, THE Quiz_Module SHALL generate quiz questions appropriate to the difficulty level of the selected Content_Source.
9. IF articles for the selected Content_Source are unavailable, THEN THE Learning_Page SHALL display a message indicating no content is available for that source and suggest switching to another Content_Source.
