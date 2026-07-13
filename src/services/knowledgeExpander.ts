/**
 * Knowledge Expander Service
 *
 * Implements the KnowledgeExpander interface for identifying grammar points,
 * idioms, and cultural references within article sentences.
 *
 * Uses a rule-based / pattern-matching approach with a built-in database of:
 * - Grammar patterns (passive voice, conditionals, present perfect, etc.)
 * - Common English idioms
 * - Cultural references
 *
 * Each identified knowledge point has a valid type and its sourceSentence is
 * always a substring of the article content.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import type {
  NewsArticle,
  KnowledgePoint,
  KnowledgeType,
  GrammarTopic,
  DifficultyLevel,
  GrammarExercise,
} from '../types';

// ============================================================
// KnowledgeExpander Interface
// ============================================================

export interface KnowledgeExpander {
  identifyKnowledgePoints(article: NewsArticle): KnowledgePoint[];
  getKnowledgePointDetails(id: string): KnowledgePoint;
  getRelatedResources(pointId: string): KnowledgePoint[];
  suggestNextPoint(completedIds: string[]): KnowledgePoint | null;
  generateGrammarExercises(points: KnowledgePoint[]): GrammarExercise[];
  trackGrammarMastery(pointId: string, correct: boolean): void;
  getGrammarProgress(): Map<GrammarTopic, number>;
}

// ============================================================
// Grammar Pattern Database
// ============================================================

interface GrammarPattern {
  name: string;
  topic: GrammarTopic;
  regex: RegExp;
  explanation: string;
  examples: string[];
  difficulty: DifficultyLevel;
}

/**
 * Built-in database of grammar patterns that can be matched against article sentences.
 * Each pattern includes a regex for detection, explanation, and examples.
 */
const GRAMMAR_PATTERNS: GrammarPattern[] = [
  {
    name: 'Passive Voice',
    topic: 'passive-voice',
    regex: /\b(is|are|was|were|been|being|be)\s+(\w+ed|built|made|done|seen|known|given|taken|shown|written|spoken|broken|chosen|driven|eaten|fallen|forgotten|gotten|hidden|ridden|risen|stolen|sworn|torn|worn|woken)\b/i,
    explanation: 'The passive voice is used when the focus is on the action, not who performs it. It is formed with a form of "be" + past participle.',
    examples: ['The book was written by a famous author.', 'The bridge is being built by workers.', 'The decision was made yesterday.'],
    difficulty: 'intermediate',
  },
  {
    name: 'Present Perfect Tense',
    topic: 'tenses',
    regex: /\b(has|have)\s+(\w+ed|been|done|gone|seen|made|come|taken|given|found|known|got|become|left|kept|let|begun|shown|heard|played|run|moved|lived|believed)\b/i,
    explanation: 'The present perfect tense connects past actions to the present. It is formed with "have/has" + past participle.',
    examples: ['She has lived in London for five years.', 'They have already finished the project.', 'He has never been to Japan.'],
    difficulty: 'intermediate',
  },
  {
    name: 'First Conditional',
    topic: 'conditionals',
    regex: /\bif\s+.{1,40}\b(will|shall|can|may|might)\s+\w+/i,
    explanation: 'The first conditional describes real or possible situations in the future. Structure: If + present simple, will + base verb.',
    examples: ['If it rains, we will stay inside.', 'If you study hard, you will pass the exam.', 'If she calls, I will answer.'],
    difficulty: 'intermediate',
  },
  {
    name: 'Second Conditional',
    topic: 'conditionals',
    regex: /\bif\s+\w+\s+(were|was|had|could|knew|went|came|saw|did)\b.*\bwould\b/i,
    explanation: 'The second conditional describes unreal or hypothetical situations. Structure: If + past simple, would + base verb.',
    examples: ['If I were rich, I would travel the world.', 'If she had time, she would help us.', 'If they knew the answer, they would tell us.'],
    difficulty: 'advanced',
  },
  {
    name: 'Third Conditional',
    topic: 'conditionals',
    regex: /\bif\s+\w+\s+had\s+\w+ed?\b.*\bwould\s+have\b/i,
    explanation: 'The third conditional describes unreal situations in the past. Structure: If + past perfect, would have + past participle.',
    examples: ['If I had known, I would have come earlier.', 'If they had studied, they would have passed.'],
    difficulty: 'advanced',
  },
  {
    name: 'Relative Clauses',
    topic: 'clauses',
    regex: /\b(who|whom|whose|which|that)\s+\w+\s+\w+/i,
    explanation: 'Relative clauses provide additional information about a noun. They are introduced by relative pronouns: who, whom, whose, which, that.',
    examples: ['The man who lives next door is friendly.', 'The book which I read was interesting.', 'The woman whose car broke down called for help.'],
    difficulty: 'intermediate',
  },
  {
    name: 'Modal Verbs',
    topic: 'modals',
    regex: /\b(must|should|ought\s+to|shall|might|may|could)\s+\w+/i,
    explanation: 'Modal verbs express ability, possibility, permission, or obligation. They are followed by a base verb without "to".',
    examples: ['You must finish your homework.', 'She should study harder.', 'They might come to the party.'],
    difficulty: 'beginner',
  },
  {
    name: 'Articles Usage',
    topic: 'articles',
    regex: /\b(the|a|an)\s+(unique|university|hour|honest|european|one-way)\b/i,
    explanation: 'Articles (a, an, the) are used before nouns. "A" is used before consonant sounds, "an" before vowel sounds, and "the" for specific nouns.',
    examples: ['She is an honest person.', 'He attends a university.', 'It takes an hour to get there.'],
    difficulty: 'beginner',
  },
  {
    name: 'Preposition Phrases',
    topic: 'prepositions',
    regex: /\b(in\s+spite\s+of|according\s+to|in\s+addition\s+to|due\s+to|instead\s+of|because\s+of|regardless\s+of|in\s+terms\s+of)\b/i,
    explanation: 'Prepositional phrases are groups of words that begin with a preposition and function as a single unit of meaning.',
    examples: ['In spite of the rain, they went out.', 'According to the report, sales increased.', 'Due to the storm, the flight was canceled.'],
    difficulty: 'intermediate',
  },
  {
    name: 'Past Perfect Tense',
    topic: 'tenses',
    regex: /\bhad\s+(\w+ed|been|done|gone|seen|made|come|taken|given|found|known|got|become|left|kept|begun|shown|heard|run|written)\b/i,
    explanation: 'The past perfect tense describes an action completed before another past action. It is formed with "had" + past participle.',
    examples: ['She had already left when I arrived.', 'They had finished dinner before the movie started.', 'He had never seen snow before that day.'],
    difficulty: 'intermediate',
  },
  {
    name: 'Future Continuous',
    topic: 'tenses',
    regex: /\bwill\s+be\s+\w+ing\b/i,
    explanation: 'The future continuous tense describes an ongoing action at a specific time in the future. It is formed with "will be" + present participle (-ing).',
    examples: ['I will be working at 9 PM tonight.', 'They will be traveling next week.', 'She will be studying when you arrive.'],
    difficulty: 'intermediate',
  },
];

// ============================================================
// Idiom Database
// ============================================================

interface IdiomEntry {
  phrase: string;
  regex: RegExp;
  explanation: string;
  examples: string[];
  difficulty: DifficultyLevel;
}

const IDIOM_DATABASE: IdiomEntry[] = [
  {
    phrase: 'break the ice',
    regex: /\bbreak(s|ing)?\s+the\s+ice\b/i,
    explanation: 'To "break the ice" means to do or say something to relieve tension or start a conversation in a social situation.',
    examples: ['He told a joke to break the ice at the meeting.', 'A simple greeting can break the ice.'],
    difficulty: 'intermediate',
  },
  {
    phrase: 'a piece of cake',
    regex: /\ba?\s*piece\s+of\s+cake\b/i,
    explanation: '"A piece of cake" means something very easy to do.',
    examples: ['The test was a piece of cake.', 'Fixing this bug should be a piece of cake.'],
    difficulty: 'beginner',
  },
  {
    phrase: 'hit the nail on the head',
    regex: /\bhit(s|ting)?\s+the\s+nail\s+on\s+the\s+head\b/i,
    explanation: 'To "hit the nail on the head" means to describe exactly what is causing a situation or problem.',
    examples: ['You hit the nail on the head with your analysis.', 'Her comment really hit the nail on the head.'],
    difficulty: 'intermediate',
  },
  {
    phrase: 'once in a blue moon',
    regex: /\bonce\s+in\s+a\s+blue\s+moon\b/i,
    explanation: '"Once in a blue moon" means very rarely.',
    examples: ['He visits us once in a blue moon.', 'Such opportunities come once in a blue moon.'],
    difficulty: 'intermediate',
  },
  {
    phrase: 'the tip of the iceberg',
    regex: /\b(the\s+)?tip\s+of\s+the\s+iceberg\b/i,
    explanation: '"The tip of the iceberg" means a small visible part of a much larger problem or situation.',
    examples: ['These complaints are just the tip of the iceberg.', 'What we see is only the tip of the iceberg.'],
    difficulty: 'intermediate',
  },
  {
    phrase: 'keep an eye on',
    regex: /\bkeep(s|ing)?\s+(an\s+)?eye\s+on\b/i,
    explanation: '"Keep an eye on" means to watch or monitor someone or something carefully.',
    examples: ['Please keep an eye on the children.', 'We need to keep an eye on the competition.'],
    difficulty: 'beginner',
  },
  {
    phrase: 'in the long run',
    regex: /\bin\s+the\s+long\s+run\b/i,
    explanation: '"In the long run" means over a long period of time; eventually.',
    examples: ['This investment will pay off in the long run.', 'In the long run, hard work always pays off.'],
    difficulty: 'intermediate',
  },
  {
    phrase: 'on the same page',
    regex: /\bon\s+the\s+same\s+page\b/i,
    explanation: '"On the same page" means to be in agreement or have the same understanding.',
    examples: ['Let us make sure we are on the same page.', 'The team needs to be on the same page.'],
    difficulty: 'intermediate',
  },
  {
    phrase: 'get the ball rolling',
    regex: /\bget(s|ting)?\s+the\s+ball\s+rolling\b/i,
    explanation: '"Get the ball rolling" means to start a process or activity.',
    examples: ['Let us get the ball rolling on this project.', 'Who wants to get the ball rolling?'],
    difficulty: 'intermediate',
  },
  {
    phrase: 'at the end of the day',
    regex: /\bat\s+the\s+end\s+of\s+the\s+day\b/i,
    explanation: '"At the end of the day" means ultimately; when everything is considered.',
    examples: ['At the end of the day, what matters is your health.', 'At the end of the day, we all want the same thing.'],
    difficulty: 'beginner',
  },
];

// ============================================================
// Cultural Reference Database
// ============================================================

interface CulturalReference {
  term: string;
  regex: RegExp;
  explanation: string;
  examples: string[];
  difficulty: DifficultyLevel;
}

const CULTURAL_REFERENCES: CulturalReference[] = [
  {
    term: 'Thanksgiving',
    regex: /\bthanksgiving\b/i,
    explanation: 'Thanksgiving is a national holiday in the United States and Canada, celebrated to give thanks for the harvest and blessings of the past year. In the US, it falls on the fourth Thursday of November.',
    examples: ['Families gather for Thanksgiving dinner.', 'Thanksgiving is a time to reflect on what we are grateful for.'],
    difficulty: 'beginner',
  },
  {
    term: 'Wall Street',
    regex: /\bwall\s+street\b/i,
    explanation: 'Wall Street is a street in New York City that is the center of the US financial industry. It is commonly used as a metonym for the American financial markets and institutions.',
    examples: ['Wall Street reacted positively to the news.', 'Many young professionals dream of working on Wall Street.'],
    difficulty: 'intermediate',
  },
  {
    term: 'Silicon Valley',
    regex: /\bsilicon\s+valley\b/i,
    explanation: 'Silicon Valley is a region in Northern California known as the global center of technology innovation and the headquarters of many major tech companies.',
    examples: ['Silicon Valley is home to companies like Google and Apple.', 'Many startups are founded in Silicon Valley.'],
    difficulty: 'intermediate',
  },
  {
    term: 'The American Dream',
    regex: /\b(the\s+)?american\s+dream\b/i,
    explanation: 'The American Dream is the ideal that every citizen can achieve success and prosperity through hard work, regardless of social class or background.',
    examples: ['Immigrants came seeking the American Dream.', 'The concept of the American Dream has evolved over time.'],
    difficulty: 'intermediate',
  },
  {
    term: 'Big Brother',
    regex: /\bbig\s+brother\b/i,
    explanation: '"Big Brother" refers to an all-powerful authority that monitors citizens, originating from George Orwell\'s novel "1984". It is now used to describe surveillance or authoritarian control.',
    examples: ['Privacy advocates warn against Big Brother surveillance.', 'The new cameras feel like Big Brother watching.'],
    difficulty: 'advanced',
  },
  {
    term: 'Ivy League',
    regex: /\bivy\s+league\b/i,
    explanation: 'The Ivy League is a group of eight prestigious private universities in the northeastern United States, known for academic excellence and social prestige.',
    examples: ['She was accepted into an Ivy League university.', 'Ivy League schools include Harvard and Yale.'],
    difficulty: 'intermediate',
  },
  {
    term: 'Brexit',
    regex: /\bbrexit\b/i,
    explanation: 'Brexit refers to the withdrawal of the United Kingdom from the European Union, a process that began with the 2016 referendum and was completed on January 31, 2020.',
    examples: ['Brexit has had significant economic implications.', 'The Brexit debate divided the nation.'],
    difficulty: 'advanced',
  },
  {
    term: 'Black Friday',
    regex: /\bblack\s+friday\b/i,
    explanation: 'Black Friday is the day after Thanksgiving in the US, known for major retail sales and the unofficial start of the Christmas shopping season.',
    examples: ['Stores offer huge discounts on Black Friday.', 'Black Friday shopping has become a global phenomenon.'],
    difficulty: 'beginner',
  },
];

// ============================================================
// Internal State: In-memory knowledge point registry
// ============================================================

/**
 * In-memory store of all identified knowledge points.
 * Keyed by their unique ID for quick lookup.
 */
const knowledgePointRegistry = new Map<string, KnowledgePoint>();

// ============================================================
// Helper Functions
// ============================================================

/**
 * Generates a unique ID for a knowledge point based on article, type, and index.
 */
function generateKnowledgePointId(
  articleId: string,
  type: KnowledgeType,
  index: number
): string {
  return `kp-${articleId}-${type}-${index}`;
}

/**
 * Finds the sentence in an article that matches a regex pattern.
 * Returns the full sentence text (which is a substring of article content).
 */
function findMatchingSentence(
  article: NewsArticle,
  regex: RegExp
): string | null {
  for (const sentence of article.sentences) {
    if (regex.test(sentence.text)) {
      return sentence.text;
    }
  }
  return null;
}



// ============================================================
// Core Implementation
// ============================================================

/**
 * Identifies knowledge points (grammar, idioms, cultural references) in an article.
 * Each knowledge point has a valid type and its sourceSentence is a substring of article content.
 *
 * Requirements: 5.1
 */
export function identifyKnowledgePoints(article: NewsArticle): KnowledgePoint[] {
  const points: KnowledgePoint[] = [];
  let grammarIndex = 0;
  let idiomIndex = 0;
  let culturalIndex = 0;

  // Identify grammar patterns
  for (const pattern of GRAMMAR_PATTERNS) {
    const matchingSentence = findMatchingSentence(article, pattern.regex);
    if (matchingSentence) {
      const id = generateKnowledgePointId(article.id, 'grammar', grammarIndex);
      const point: KnowledgePoint = {
        id,
        type: 'grammar',
        title: pattern.name,
        explanation: pattern.explanation,
        examples: pattern.examples,
        relatedArticleIds: [article.id],
        sourceSentence: matchingSentence,
        sourceArticleId: article.id,
        grammarTopic: pattern.topic,
        difficulty: pattern.difficulty,
      };
      points.push(point);
      knowledgePointRegistry.set(id, point);
      grammarIndex++;
    }
  }

  // Identify idioms
  for (const idiom of IDIOM_DATABASE) {
    const matchingSentence = findMatchingSentence(article, idiom.regex);
    if (matchingSentence) {
      const id = generateKnowledgePointId(article.id, 'idiom', idiomIndex);
      const point: KnowledgePoint = {
        id,
        type: 'idiom',
        title: idiom.phrase,
        explanation: idiom.explanation,
        examples: idiom.examples,
        relatedArticleIds: [article.id],
        sourceSentence: matchingSentence,
        sourceArticleId: article.id,
        difficulty: idiom.difficulty,
      };
      points.push(point);
      knowledgePointRegistry.set(id, point);
      idiomIndex++;
    }
  }

  // Identify cultural references
  for (const ref of CULTURAL_REFERENCES) {
    const matchingSentence = findMatchingSentence(article, ref.regex);
    if (matchingSentence) {
      const id = generateKnowledgePointId(article.id, 'cultural-reference', culturalIndex);
      const point: KnowledgePoint = {
        id,
        type: 'cultural-reference',
        title: ref.term,
        explanation: ref.explanation,
        examples: ref.examples,
        relatedArticleIds: [article.id],
        sourceSentence: matchingSentence,
        sourceArticleId: article.id,
        difficulty: ref.difficulty,
      };
      points.push(point);
      knowledgePointRegistry.set(id, point);
      culturalIndex++;
    }
  }

  return points;
}

/**
 * Returns full details for a knowledge point by ID.
 * Details include non-empty explanation and at least one example.
 *
 * Requirements: 5.2
 */
export function getKnowledgePointDetails(id: string): KnowledgePoint {
  const point = knowledgePointRegistry.get(id);
  if (!point) {
    // Return a fallback knowledge point with valid structure
    return {
      id,
      type: 'grammar',
      title: 'Unknown Knowledge Point',
      explanation: 'This knowledge point could not be found in the registry.',
      examples: ['No examples available for this point.'],
      relatedArticleIds: [],
      sourceSentence: '',
      sourceArticleId: '',
      difficulty: 'intermediate',
    };
  }
  return point;
}

/**
 * Finds related knowledge points for a given point.
 * Related points share the same type or grammar topic.
 *
 * Requirements: 5.3
 */
export function getRelatedResources(pointId: string): KnowledgePoint[] {
  const point = knowledgePointRegistry.get(pointId);
  if (!point) return [];

  const related: KnowledgePoint[] = [];

  for (const [id, candidate] of knowledgePointRegistry) {
    if (id === pointId) continue;

    // Related if same type, or same grammar topic
    const sameType = candidate.type === point.type;
    const sameGrammarTopic =
      point.type === 'grammar' &&
      candidate.type === 'grammar' &&
      point.grammarTopic === candidate.grammarTopic;

    if (sameType || sameGrammarTopic) {
      related.push(candidate);
    }
  }

  return related;
}

/**
 * Suggests the next knowledge point for progressive learning.
 * Returns a point that is NOT in the completed set.
 * Prefers points with lower difficulty first for progressive learning.
 *
 * Requirements: 5.4
 */
export function suggestNextPoint(completedIds: string[]): KnowledgePoint | null {
  const completedSet = new Set(completedIds);
  const difficultyOrder: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];

  // Find uncompleted points sorted by difficulty (progressive learning)
  for (const difficulty of difficultyOrder) {
    for (const [id, point] of knowledgePointRegistry) {
      if (!completedSet.has(id) && point.difficulty === difficulty) {
        return point;
      }
    }
  }

  return null;
}

// ============================================================
// Grammar Exercise Generation
// ============================================================

/** Mastery threshold: points below this score are recommended for practice */
export const GRAMMAR_MASTERY_THRESHOLD = 70;

/**
 * In-memory mastery store for grammar points.
 * Maps pointId to { mastery: number, reviewCount: number }.
 * This mirrors IndexedDB's StoredKnowledgePoint mastery/reviewCount fields
 * and is synced to IndexedDB via trackGrammarMastery.
 */
const grammarMasteryStore = new Map<string, { mastery: number; reviewCount: number }>();

/**
 * Generates a sentence-correction exercise from a grammar knowledge point.
 * Creates a sentence with an intentional error for the learner to correct.
 */
function generateSentenceCorrectionExercise(
  point: KnowledgePoint,
  index: number
): GrammarExercise {
  const sourceSentence = point.sourceSentence;
  // Create an incorrect version of the source sentence based on the grammar topic
  let incorrectSentence: string;
  let explanation: string;

  switch (point.grammarTopic) {
    case 'passive-voice':
      incorrectSentence = sourceSentence.replace(/\b(was|were|is|are|been)\s+/i, 'have ');
      explanation = `The correct form uses passive voice (be + past participle). ${point.explanation}`;
      break;
    case 'tenses':
      incorrectSentence = sourceSentence.replace(/\b(has|have|had)\s+/i, 'is ');
      explanation = `The correct tense form is required here. ${point.explanation}`;
      break;
    case 'conditionals':
      incorrectSentence = sourceSentence.replace(/\bwill\b/i, 'would have');
      explanation = `The conditional structure requires the correct verb form. ${point.explanation}`;
      break;
    case 'clauses':
      incorrectSentence = sourceSentence.replace(/\b(who|which|that)\b/i, 'what');
      explanation = `The correct relative pronoun must be used to introduce the clause. ${point.explanation}`;
      break;
    case 'modals':
      incorrectSentence = sourceSentence.replace(/\b(must|should|might|may|could)\b/i, 'will to');
      explanation = `Modal verbs are followed by a base verb without "to". ${point.explanation}`;
      break;
    case 'prepositions':
      incorrectSentence = sourceSentence.replace(/\b(in spite of|according to|due to)\b/i, 'for');
      explanation = `The correct prepositional phrase is needed here. ${point.explanation}`;
      break;
    case 'articles':
      incorrectSentence = sourceSentence.replace(/\b(a|an|the)\b/i, 'some');
      explanation = `The correct article usage depends on the noun type and context. ${point.explanation}`;
      break;
    default:
      incorrectSentence = sourceSentence.replace(/\.$/, '') + ' incorrectly.';
      explanation = `The sentence structure needs correction. ${point.explanation}`;
  }

  // Ensure we actually produced a different sentence
  if (incorrectSentence === sourceSentence) {
    incorrectSentence = sourceSentence.replace(/\.$/, '') + ' [error].';
  }

  return {
    id: `grammar-ex-correction-${point.id}-${index}`,
    type: 'sentence-correction',
    question: `Find and correct the grammatical error in this sentence: "${incorrectSentence}"`,
    correctAnswer: sourceSentence,
    explanation,
    grammarPointId: point.id,
    sourceArticleId: point.sourceArticleId,
    sourceSentence: point.sourceSentence,
  };
}

/**
 * Generates a structure-analysis exercise from a grammar knowledge point.
 * Asks the learner to identify or explain the grammar structure.
 */
function generateStructureAnalysisExercise(
  point: KnowledgePoint,
  index: number
): GrammarExercise {
  const topicLabel = point.grammarTopic || 'grammar';
  return {
    id: `grammar-ex-analysis-${point.id}-${index}`,
    type: 'structure-analysis',
    question: `Analyze the grammar structure in this sentence and identify the ${topicLabel} pattern: "${point.sourceSentence}"`,
    correctAnswer: `This sentence uses ${point.title}. ${point.explanation}`,
    explanation: `${point.explanation} Examples: ${point.examples.slice(0, 2).join('; ')}`,
    grammarPointId: point.id,
    sourceArticleId: point.sourceArticleId,
    sourceSentence: point.sourceSentence,
  };
}

/**
 * Generates a transformation exercise from a grammar knowledge point.
 * Asks the learner to transform a sentence structure.
 */
function generateTransformationExercise(
  point: KnowledgePoint,
  index: number
): GrammarExercise {
  let question: string;
  let correctAnswer: string;
  let explanation: string;

  switch (point.grammarTopic) {
    case 'passive-voice':
      question = `Transform the following sentence from passive to active voice (or vice versa): "${point.sourceSentence}"`;
      correctAnswer = `Active/Passive transformation of: ${point.sourceSentence}`;
      explanation = `To transform between active and passive voice, identify the subject, verb, and object. ${point.explanation}`;
      break;
    case 'tenses':
      question = `Rewrite the following sentence in a different tense: "${point.sourceSentence}"`;
      correctAnswer = `Tense transformation of: ${point.sourceSentence}`;
      explanation = `Changing tenses requires adjusting the verb form. ${point.explanation}`;
      break;
    case 'conditionals':
      question = `Transform the conditional type in this sentence: "${point.sourceSentence}"`;
      correctAnswer = `Conditional transformation of: ${point.sourceSentence}`;
      explanation = `Different conditional types express different degrees of possibility. ${point.explanation}`;
      break;
    default:
      question = `Rewrite the following sentence using a different grammatical structure while keeping the same meaning: "${point.sourceSentence}"`;
      correctAnswer = `Structural transformation of: ${point.sourceSentence}`;
      explanation = `The sentence can be restructured while maintaining its meaning. ${point.explanation}`;
  }

  return {
    id: `grammar-ex-transform-${point.id}-${index}`,
    type: 'transformation',
    question,
    correctAnswer,
    explanation: `${explanation} Examples: ${point.examples.slice(0, 2).join('; ')}`,
    grammarPointId: point.id,
    sourceArticleId: point.sourceArticleId,
    sourceSentence: point.sourceSentence,
  };
}

/**
 * Generates grammar exercises from knowledge points.
 * Produces sentence-correction, structure-analysis, and transformation exercises.
 * When given 3+ grammar points, ensures at least one of each type.
 * Each exercise includes source article ID and source sentence.
 *
 * Requirements: 7.2, 7.3
 */
export function generateGrammarExercises(points: KnowledgePoint[]): GrammarExercise[] {
  // Filter to grammar-type knowledge points only
  const grammarPoints = points.filter((p) => p.type === 'grammar');

  if (grammarPoints.length === 0) {
    return [];
  }

  const exercises: GrammarExercise[] = [];

  if (grammarPoints.length >= 3) {
    // Ensure at least one of each type by assigning types round-robin
    exercises.push(generateSentenceCorrectionExercise(grammarPoints[0]!, 0));
    exercises.push(generateStructureAnalysisExercise(grammarPoints[1]!, 1));
    exercises.push(generateTransformationExercise(grammarPoints[2]!, 2));

    // Generate additional exercises for remaining points
    for (let i = 3; i < grammarPoints.length; i++) {
      const typeIndex = i % 3;
      const point = grammarPoints[i]!;
      if (typeIndex === 0) {
        exercises.push(generateSentenceCorrectionExercise(point, i));
      } else if (typeIndex === 1) {
        exercises.push(generateStructureAnalysisExercise(point, i));
      } else {
        exercises.push(generateTransformationExercise(point, i));
      }
    }
  } else if (grammarPoints.length === 2) {
    // With 2 points, generate one correction and one analysis
    exercises.push(generateSentenceCorrectionExercise(grammarPoints[0]!, 0));
    exercises.push(generateStructureAnalysisExercise(grammarPoints[1]!, 1));
  } else {
    // With 1 point, generate one correction exercise
    exercises.push(generateSentenceCorrectionExercise(grammarPoints[0]!, 0));
  }

  return exercises;
}

/**
 * Tracks grammar mastery for a knowledge point.
 * Updates the in-memory mastery store. Correct answers increase mastery,
 * incorrect answers decrease it. Also persists to IndexedDB asynchronously.
 *
 * Mastery score ranges from 0-100.
 * - Correct answer: mastery increases by 10 (capped at 100)
 * - Incorrect answer: mastery decreases by 15 (floored at 0)
 *
 * Requirements: 7.6, 7.7
 */
export function trackGrammarMastery(pointId: string, correct: boolean): void {
  const existing = grammarMasteryStore.get(pointId) || { mastery: 0, reviewCount: 0 };

  if (correct) {
    existing.mastery = Math.min(100, existing.mastery + 10);
  } else {
    existing.mastery = Math.max(0, existing.mastery - 15);
  }
  existing.reviewCount += 1;

  grammarMasteryStore.set(pointId, existing);

  // Persist to IndexedDB asynchronously (fire-and-forget)
  const point = knowledgePointRegistry.get(pointId);
  if (point) {
    import('../utils/db').then(({ put, STORE_NAMES }) => {
      put(STORE_NAMES.knowledgePoints, {
        ...point,
        mastery: existing.mastery,
        reviewCount: existing.reviewCount,
      }).catch(() => {
        // Silently handle IndexedDB write failures (offline-first graceful degradation)
      });
    }).catch(() => {
      // Silently handle dynamic import failure
    });
  }
}

/**
 * Returns grammar mastery progress grouped by GrammarTopic.
 * Computes the average mastery score for all grammar points in each topic.
 * Topics with no points tracked default to 0.
 *
 * Requirements: 7.5
 */
export function getGrammarProgress(): Map<GrammarTopic, number> {
  const topicScores = new Map<GrammarTopic, { total: number; count: number }>([
    ['tenses', { total: 0, count: 0 }],
    ['clauses', { total: 0, count: 0 }],
    ['prepositions', { total: 0, count: 0 }],
    ['articles', { total: 0, count: 0 }],
    ['conditionals', { total: 0, count: 0 }],
    ['passive-voice', { total: 0, count: 0 }],
    ['modals', { total: 0, count: 0 }],
    ['other', { total: 0, count: 0 }],
  ]);

  // Aggregate mastery by grammar topic
  for (const [pointId, masteryData] of grammarMasteryStore) {
    const point = knowledgePointRegistry.get(pointId);
    if (point && point.type === 'grammar' && point.grammarTopic) {
      const topic = point.grammarTopic;
      const entry = topicScores.get(topic);
      if (entry) {
        entry.total += masteryData.mastery;
        entry.count += 1;
      }
    }
  }

  // Calculate average mastery for each topic
  const progress = new Map<GrammarTopic, number>();
  for (const [topic, data] of topicScores) {
    progress.set(topic, data.count > 0 ? Math.round(data.total / data.count) : 0);
  }

  return progress;
}

/**
 * Returns grammar points that have mastery below the threshold and need further practice.
 * Points are sorted by mastery (lowest first) for priority-based recommendations.
 *
 * Requirements: 7.7
 */
export function getGrammarRecommendations(): KnowledgePoint[] {
  const recommendations: Array<{ point: KnowledgePoint; mastery: number }> = [];

  for (const [pointId, point] of knowledgePointRegistry) {
    if (point.type !== 'grammar') continue;

    const masteryData = grammarMasteryStore.get(pointId);
    const mastery = masteryData ? masteryData.mastery : 0;

    if (mastery < GRAMMAR_MASTERY_THRESHOLD) {
      recommendations.push({ point, mastery });
    }
  }

  // Sort by mastery ascending (lowest mastery = highest priority)
  recommendations.sort((a, b) => a.mastery - b.mastery);

  return recommendations.map((r) => r.point);
}

/**
 * Returns the detailed explanation and additional examples for an incorrect grammar answer.
 * Provides the grammar rule explanation along with examples from the knowledge base.
 *
 * Requirements: 7.6
 */
export function getGrammarExplanation(exercise: GrammarExercise): {
  explanation: string;
  additionalExamples: string[];
} {
  const point = knowledgePointRegistry.get(exercise.grammarPointId);
  if (!point) {
    return {
      explanation: exercise.explanation,
      additionalExamples: ['No additional examples available.'],
    };
  }

  return {
    explanation: exercise.explanation,
    additionalExamples: point.examples,
  };
}

// ============================================================
// Mastery Store Management (for testing)
// ============================================================

/**
 * Clears the in-memory grammar mastery store.
 * Used in testing to reset state between tests.
 */
export function clearGrammarMasteryStore(): void {
  grammarMasteryStore.clear();
}

/**
 * Returns the raw mastery data for a given point ID.
 * Used for testing and internal inspection.
 */
export function getPointMastery(pointId: string): { mastery: number; reviewCount: number } | undefined {
  return grammarMasteryStore.get(pointId);
}

// ============================================================
// Registry Management (for testing)
// ============================================================

/**
 * Clears the internal knowledge point registry.
 * Primarily used in testing to reset state between tests.
 */
export function clearKnowledgePointRegistry(): void {
  knowledgePointRegistry.clear();
}

/**
 * Returns the number of knowledge points in the registry.
 */
export function getRegistrySize(): number {
  return knowledgePointRegistry.size;
}
