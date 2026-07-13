/**
 * News Fetcher Service
 *
 * Retrieves articles from Supabase cloud database (real crawled content).
 * Falls back to mock data when Supabase has no articles for a given source.
 *
 * Requirements: 1.1, 1.7, 1.8, 10.2, 10.4, 10.9
 */

import type { ContentSource, NewsArticle, Sentence, DifficultyLevel } from '../types';
import { SOURCE_DIFFICULTY_MAP } from '../types';
import {
  getAllByIndex,
  getByKey,
  deleteByKey,
  putMany,
  clearStore,
  STORE_NAMES,
} from '../utils/db';
import type { CachedArticle } from '../utils/db';
import { supabase } from '../utils/supabase';

// ============================================================
// HTML Stripping Utility (cleans residual HTML from database content)
// ============================================================

function stripHTML(text: string): string {
  if (!text) return '';
  return text
    .replace(/<video[\s\S]*?<\/video>/gi, '')
    .replace(/<audio[\s\S]*?<\/audio>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<video[^>]*\/?>/gi, '')
    .replace(/<img[^>]*\/?>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/https?:\/\/[^\s)'"]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================
// NewsFetcher Interface
// ============================================================

export interface NewsFetcher {
  fetchArticles(source: ContentSource, count: number): Promise<NewsArticle[]>;
  filterBySource(articles: NewsArticle[], source: ContentSource): NewsArticle[];
  getCachedArticles(source: ContentSource): Promise<NewsArticle[]>;
  getArticleById(id: string): Promise<NewsArticle | null>;
  clearArticleCache(): Promise<void>;
  getAvailableSources(): ContentSource[];
}

// ============================================================
// Fetch Result Type (includes error info for UI)
// ============================================================

export interface FetchResult {
  articles: NewsArticle[];
  fromCache: boolean;
  error?: string;
}

// ============================================================
// All Supported Content Sources
// ============================================================

const ALL_SOURCES: ContentSource[] = [
  'current-affairs',
  'senior-high',
  'junior-high',
  'junior-senior-mixed',
  'elementary',
];

// ============================================================
// Supabase Article Fetching (real data)
// ============================================================

/**
 * Fetches articles from Supabase cloud database (public + user's private).
 * Returns null if no articles found (will fall back to mock).
 */
async function fetchFromSupabase(
  source: ContentSource,
  count: number
): Promise<NewsArticle[] | null> {
  try {
    // Fetch public articles
    const { data: publicData, error: publicError } = await supabase
      .from('articles')
      .select('*')
      .eq('content_source', source)
      .order('published_at', { ascending: false })
      .limit(count);

    // Also fetch user's private articles for this source
    const { data: userData } = await supabase
      .from('user_articles')
      .select('*')
      .eq('content_source', source)
      .order('created_at', { ascending: false });

    const allData = [...(userData || []), ...(publicData || [])];

    if (publicError || allData.length === 0) return null;

    // Map Supabase rows to NewsArticle format
    return allData.map((row) => {
      const articleId = row.id;
      // Strip any residual HTML from content
      const cleanContent = stripHTML(row.content);
      const cleanSummary = stripHTML(row.summary || '');
      const sentences = splitIntoSentences(cleanContent, articleId);
      const publishDate = row.published_at || row.created_at || new Date().toISOString();
      return {
        id: articleId,
        title: stripHTML(row.title),
        summary: cleanSummary || cleanContent.substring(0, 150) + '...',
        content: cleanContent,
        sentences,
        publishedAt: new Date(publishDate),
        source: row.source_name || '我的文章',
        contentSource: row.content_source as ContentSource,
        difficulty: (row.difficulty || 'intermediate') as DifficultyLevel,
        imageUrl: row.image_url || undefined,
      };
    });
  } catch {
    return null;
  }
}

// ============================================================
// Mock API Layer (fallback when Supabase has no data)
// ============================================================

/**
 * Falls back to mock data when Supabase doesn't have articles for this source.
 */
async function mockFetchFromApi(
  source: ContentSource,
  count: number
): Promise<NewsArticle[]> {
  const difficulty = SOURCE_DIFFICULTY_MAP[source];
  const articles = generateMockArticles(source, difficulty, count);
  return articles;
}

/**
 * Generates mock articles for testing and development.
 * Each source produces articles with appropriate content and difficulty.
 */
function generateMockArticles(
  source: ContentSource,
  difficulty: DifficultyLevel,
  count: number
): NewsArticle[] {
  const articles: NewsArticle[] = [];
  const templates = MOCK_ARTICLE_TEMPLATES[source];

  // Never exceed available templates to avoid duplicates
  const actualCount = Math.min(count, templates.length);

  for (let i = 0; i < actualCount; i++) {
    const template = templates[i]!;
    const articleId = `${source}-${i}`;
    const sentences = splitIntoSentences(template.content, articleId);

    articles.push({
      id: articleId,
      title: template.title,
      summary: template.summary,
      content: template.content,
      sentences,
      publishedAt: new Date(Date.now() - i * 86400000), // Each article 1 day apart
      source: template.sourceName,
      contentSource: source,
      difficulty,
      imageUrl: template.imageUrl,
    });
  }

  return articles;
}

/**
 * Splits article content into Sentence objects for translation support.
 */
function splitIntoSentences(content: string, articleId: string): Sentence[] {
  const sentenceTexts = content.match(/[^.!?]+[.!?]+/g) || [content];
  let currentIndex = 0;

  return sentenceTexts.map((text, idx) => {
    const trimmed = text.trim();
    const startIndex = content.indexOf(trimmed, currentIndex);
    const endIndex = startIndex + trimmed.length;
    currentIndex = endIndex;

    return {
      id: `${articleId}-s${idx}`,
      text: trimmed,
      startIndex,
      endIndex,
    };
  });
}

// ============================================================
// Mock Article Templates (organized by ContentSource)
// ============================================================

const MOCK_ARTICLE_TEMPLATES: Record<
  ContentSource,
  Array<{
    title: string;
    summary: string;
    content: string;
    sourceName: string;
    imageUrl?: string;
  }>
> = {
  'current-affairs': [
    {
      title: 'Global Leaders Meet to Discuss Climate Action',
      summary:
        'World leaders gathered at the United Nations to address escalating climate challenges and commit to new emission reduction targets.',
      content:
        'World leaders from over 190 countries convened at the United Nations headquarters in New York to discuss urgent climate action measures. The summit focused on achieving net-zero emissions by 2050 and increasing climate finance for developing nations. Several major economies announced new commitments to phase out coal power and invest in renewable energy infrastructure. Environmental advocates praised the renewed sense of urgency while cautioning that pledges must translate into concrete policy changes. The conference also highlighted the disproportionate impact of climate change on vulnerable communities.',
      sourceName: 'Global News Network',
      imageUrl: 'https://example.com/images/climate-summit.jpg',
    },
    {
      title: 'Technology Companies Face New Regulatory Framework',
      summary:
        'Major technology firms must adapt to comprehensive new regulations governing data privacy and artificial intelligence use.',
      content:
        'The European Union has introduced a comprehensive regulatory framework targeting major technology companies. The new legislation addresses data privacy concerns, algorithmic transparency, and the responsible deployment of artificial intelligence systems. Companies will be required to conduct impact assessments before launching AI products that affect public decision-making. Industry representatives have expressed concern about compliance costs while consumer advocates welcome the stronger protections. The regulations are expected to influence similar legislation worldwide.',
      sourceName: 'Tech Policy Review',
    },
    {
      title: 'International Trade Agreements Reshape Global Commerce',
      summary:
        'New bilateral trade agreements between major economies are creating fresh opportunities and challenges for international businesses.',
      content:
        'Several significant bilateral trade agreements have been signed this month, reshaping the landscape of international commerce. The agreements reduce tariffs on manufactured goods and agricultural products while establishing new intellectual property protections. Economists predict these changes will boost GDP growth in participating nations by approximately two percent over the next decade. Small and medium enterprises stand to benefit from simplified customs procedures. However, labor unions have raised concerns about potential job displacement in certain manufacturing sectors.',
      sourceName: 'Economic Times',
    },
    {
      title: 'Space Exploration Milestone Achieved',
      summary:
        'Scientists celebrate a historic achievement as a new spacecraft successfully completes its mission to collect samples from a distant asteroid.',
      content:
        'NASA scientists celebrated a historic milestone as the OSIRIS-REx spacecraft successfully returned samples from the asteroid Bennu to Earth. The mission, which took seven years to complete, is expected to provide crucial insights into the formation of our solar system. The collected materials may contain organic molecules that could help explain the origins of life on Earth. International space agencies are now collaborating on future asteroid exploration missions. This achievement demonstrates the growing capabilities of robotic space exploration technology.',
      sourceName: 'Science Daily',
    },
    {
      title: 'Healthcare Innovation Transforms Patient Care',
      summary:
        'Breakthrough medical technologies and AI-powered diagnostics are revolutionizing healthcare delivery across multiple countries.',
      content:
        'Healthcare systems worldwide are undergoing rapid transformation through the adoption of innovative technologies. Artificial intelligence algorithms can now detect certain cancers with accuracy comparable to experienced physicians. Telemedicine platforms have expanded access to specialist consultations for rural communities. Wearable health devices are enabling continuous patient monitoring outside hospital settings. These advances promise to reduce healthcare costs while improving patient outcomes. Regulatory bodies are working to establish appropriate oversight frameworks for these emerging technologies.',
      sourceName: 'Health Innovation Weekly',
    },
  ],
  'senior-high': [
    {
      title: 'The Impact of Social Media on Modern Communication',
      summary:
        'How digital platforms have fundamentally changed the way people interact and share information in contemporary society.',
      content:
        'Social media platforms have revolutionized the way humans communicate and form relationships. These digital tools enable instant connection across geographical boundaries, fostering global communities united by shared interests. However, researchers have identified potential negative effects on mental health, particularly among adolescents who spend excessive time on these platforms. The phenomenon of cyberbullying has emerged as a serious concern for educators and parents. Understanding both the benefits and risks of social media literacy has become an essential skill for modern students.',
      sourceName: 'English Learning Weekly',
    },
    {
      title: 'Renewable Energy: Powering the Future',
      summary:
        'An exploration of how solar, wind, and other renewable energy sources are becoming increasingly viable alternatives to fossil fuels.',
      content:
        'The global transition to renewable energy sources represents one of the most significant technological shifts in human history. Solar panel efficiency has improved dramatically over the past decade while manufacturing costs have decreased substantially. Wind energy now provides a significant portion of electricity in several European countries. Battery storage technology is addressing the intermittency challenges associated with renewable sources. Governments around the world are implementing policies to accelerate this transition and reduce dependence on fossil fuels.',
      sourceName: 'Science Exploration',
    },
    {
      title: 'The Art of Critical Thinking',
      summary:
        'Understanding how to evaluate information, recognize logical fallacies, and form well-reasoned opinions in the information age.',
      content:
        'Critical thinking is the ability to analyze information objectively and make reasoned judgments. In an era of information overload, this skill has become more important than ever. Students must learn to distinguish between reliable sources and misinformation. Developing critical thinking requires practice in identifying assumptions, evaluating evidence, and recognizing logical fallacies. Educational institutions worldwide are incorporating critical thinking exercises into their curricula to prepare students for the challenges of modern life.',
      sourceName: 'Academic English',
    },
    {
      title: 'Biodiversity Conservation Challenges',
      summary:
        'Examining the threats to global biodiversity and the conservation strategies being employed to protect endangered species.',
      content:
        'Biodiversity loss represents one of the most pressing environmental challenges facing our planet. Human activities such as deforestation, urbanization, and pollution have accelerated species extinction rates to alarming levels. Conservation biologists are employing various strategies including habitat restoration, captive breeding programs, and establishing protected areas. International cooperation is essential for protecting migratory species that cross national boundaries. Education and community engagement play crucial roles in building public support for conservation efforts.',
      sourceName: 'Nature and Science',
    },
    {
      title: 'The Evolution of Artificial Intelligence',
      summary:
        'Tracing the development of AI from early computing concepts to modern machine learning applications that shape our daily lives.',
      content:
        'Artificial intelligence has evolved from a theoretical concept to a practical technology that influences many aspects of daily life. Early AI research focused on rule-based systems that could solve specific problems. Modern machine learning approaches enable computers to improve their performance through experience without explicit programming. Natural language processing allows machines to understand and generate human language with increasing sophistication. The ethical implications of AI deployment continue to spark important debates in academic and policy circles.',
      sourceName: 'Technology Today',
    },
  ],
  'junior-high': [
    {
      title: 'How Animals Communicate',
      summary:
        'Discover the fascinating ways animals talk to each other using sounds, colors, and body language.',
      content:
        'Animals have many interesting ways to communicate with each other. Birds sing songs to attract mates and warn others of danger. Dolphins use clicking sounds to talk to their group members underwater. Bees perform a special dance to tell other bees where to find flowers. Even color can be a form of communication, as some animals change color to show their mood. Learning about animal communication helps us understand nature better.',
      sourceName: 'Junior English Reader',
    },
    {
      title: 'The Water Cycle Explained',
      summary:
        'Learn about how water moves between the ocean, sky, and land in a never-ending cycle.',
      content:
        'The water cycle is the continuous movement of water on our planet. Water evaporates from oceans, lakes, and rivers when the sun heats it. The water vapor rises into the sky and forms clouds through condensation. When clouds become heavy with water droplets, precipitation occurs as rain or snow. The water then flows back into rivers and oceans, and the cycle begins again. This process is essential for all life on Earth.',
      sourceName: 'Science for Students',
    },
    {
      title: 'Famous Inventors and Their Creations',
      summary:
        'Stories of brilliant inventors whose creations changed the world forever.',
      content:
        'Throughout history, inventors have created things that changed how people live. Thomas Edison invented the light bulb, which brought light to homes everywhere. The Wright brothers built the first successful airplane, making air travel possible. Alexander Graham Bell invented the telephone, allowing people to talk over long distances. These inventors all shared one important quality: they never gave up when their experiments failed. Their persistence teaches us that great achievements require patience and hard work.',
      sourceName: 'English Stories',
    },
    {
      title: 'Healthy Eating Habits for Students',
      summary:
        'Simple tips and advice on how to eat well and stay healthy during school years.',
      content:
        'Eating healthy food is very important for students who want to study well. A good breakfast gives your brain energy for morning classes. Fruits and vegetables provide vitamins that keep your body strong. Drinking enough water throughout the day helps you concentrate. Try to avoid too many sweets and snacks between meals. When you eat well, you can focus better in class and have more energy for sports and activities.',
      sourceName: 'Health and Life',
    },
    {
      title: 'Exploring the Solar System',
      summary:
        'A journey through our solar system to meet the planets and learn interesting facts about each one.',
      content:
        'Our solar system has eight planets that orbit around the sun. Mercury is the closest planet to the sun and is very hot during the day. Earth is the only planet known to have life. Jupiter is the largest planet and has a famous red spot that is actually a giant storm. Saturn is famous for its beautiful rings made of ice and rock. Scientists continue to explore space using telescopes and spacecraft to learn more about our cosmic neighborhood.',
      sourceName: 'Space Adventures',
    },
  ],
  'junior-senior-mixed': [
    {
      title: 'The Psychology of Learning',
      summary:
        'Understanding how the brain learns and remembers information can help students study more effectively.',
      content:
        'Understanding how our brains learn can help us study more effectively. Scientists have discovered that the brain forms new connections when we learn something new. Repeating information at spaced intervals helps transfer knowledge from short-term to long-term memory. Getting enough sleep is crucial because the brain consolidates memories during rest. Active learning methods like teaching others or solving problems are more effective than passive reading. These insights can help students of all ages improve their study habits.',
      sourceName: 'Learning Science',
    },
    {
      title: 'Environmental Protection in Daily Life',
      summary:
        'Practical ways everyone can contribute to protecting the environment through simple daily actions.',
      content:
        'Protecting the environment starts with small actions in our daily lives. Reducing plastic use by carrying reusable bags and water bottles makes a significant difference. Saving electricity by turning off lights and unplugging devices conserves energy resources. Planting trees and maintaining gardens helps clean the air in our communities. Sorting waste for recycling ensures materials can be reused rather than ending up in landfills. When millions of people make small changes, the combined effect on the environment is enormous.',
      sourceName: 'Green Living',
    },
    {
      title: 'Cultural Festivals Around the World',
      summary:
        'Exploring how different countries celebrate their unique traditions and festivals throughout the year.',
      content:
        'Every culture has special festivals that bring communities together in celebration. Chinese New Year is celebrated with fireworks, red decorations, and family reunions. Diwali in India is known as the festival of lights, where people light lamps and share sweets. Carnival in Brazil features colorful parades with music and dancing in the streets. Thanksgiving in America brings families together to share a meal and express gratitude. These celebrations remind us of the rich diversity of human culture and tradition.',
      sourceName: 'World Culture',
    },
    {
      title: 'The Importance of Reading',
      summary:
        'How regular reading can improve vocabulary, expand knowledge, and develop empathy and critical thinking skills.',
      content:
        'Reading regularly offers many benefits beyond simple entertainment. It expands our vocabulary naturally as we encounter new words in context. Reading fiction develops empathy by allowing us to experience different perspectives and emotions. Non-fiction reading builds knowledge across various subjects and topics. Studies show that consistent readers perform better academically across all subjects. Setting aside just thirty minutes each day for reading can make a remarkable difference in language skills.',
      sourceName: 'Reading Corner',
    },
    {
      title: 'Sports and Teamwork',
      summary:
        'How participating in sports teaches valuable life skills including cooperation, leadership, and perseverance.',
      content:
        'Playing sports teaches important skills that are useful throughout life. Team sports require cooperation and communication between players to achieve shared goals. Athletes learn to handle both victory and defeat with grace and sportsmanship. Regular physical activity improves concentration and reduces stress, benefiting academic performance. Leadership skills develop naturally when players take responsibility for motivating their teammates. The discipline required for consistent training builds character and determination.',
      sourceName: 'Sports and Life',
    },
  ],
  elementary: [
    {
      title: 'My Family',
      summary: 'Learn English words about family members and how to talk about your family.',
      content:
        'Everyone has a family. Your father and mother are your parents. Your brother and sister are your siblings. Grandparents are your parents\' parents. We love our family very much. Family members help each other every day.',
      sourceName: 'Kids English',
    },
    {
      title: 'Colors All Around Us',
      summary: 'Discover the names of colors in English and where you can find them in nature.',
      content:
        'Colors are everywhere in our world. The sky is blue on a sunny day. Grass and leaves are green. Flowers can be red, yellow, or purple. The sun looks orange at sunset. Snow is white in winter. Colors make our world beautiful and bright.',
      sourceName: 'Rainbow English',
    },
    {
      title: 'Animals on the Farm',
      summary: 'Meet the animals that live on a farm and learn what sounds they make.',
      content:
        'A farm has many different animals. Cows give us milk and say "moo." Chickens lay eggs and say "cluck." Pigs love mud and say "oink." Sheep have soft wool and say "baa." Horses are strong and can run fast. Farmers take good care of all their animals.',
      sourceName: 'Animal World',
    },
    {
      title: 'Days of the Week',
      summary: 'Learn the seven days of the week in English and what activities you can do each day.',
      content:
        'There are seven days in a week. Monday is the first day of school. Tuesday and Wednesday are in the middle of the week. Thursday comes before Friday. Friday is the last school day. Saturday and Sunday are the weekend. The weekend is time for fun and rest.',
      sourceName: 'Time English',
    },
    {
      title: 'Fruits I Like',
      summary: 'Learn the English names of common fruits and how to say which ones you like.',
      content:
        'Fruits are healthy and delicious. Apples are red or green and very crunchy. Bananas are yellow and soft inside. Oranges are round and full of juice. Grapes come in bunches and can be purple or green. Strawberries are small, red, and sweet. I like to eat fruit every day.',
      sourceName: 'Food English',
    },
  ],
};

// ============================================================
// NewsFetcher Implementation
// ============================================================

/**
 * Fetches articles for the given content source and count.
 * On success, caches articles to IndexedDB for offline access.
 * On failure, falls back to cached articles with a friendly error message.
 */
export async function fetchArticles(
  source: ContentSource,
  count: number
): Promise<FetchResult> {
  try {
    // Try Supabase first (real crawled content)
    const supabaseArticles = await fetchFromSupabase(source, count);
    
    if (supabaseArticles && supabaseArticles.length > 0) {
      // Cache to IndexedDB for offline access
      const cachedArticles: CachedArticle[] = supabaseArticles.map((article) => ({
        ...article,
        cachedAt: new Date(),
      }));

      // Clear stale cached articles for this source, then write fresh data
      // This ensures deleted articles don't linger in cache
      getAllByIndex(STORE_NAMES.articles, 'contentSource', source).then(cached => {
        const freshIds = new Set(supabaseArticles.map(a => a.id));
        for (const item of cached) {
          if (!freshIds.has(item.id)) {
            deleteByKey(STORE_NAMES.articles, item.id).catch(() => {});
          }
        }
      }).catch(() => {});

      putMany(STORE_NAMES.articles, cachedArticles).catch(() => {
        console.warn('[newsFetcher] Failed to cache articles to IndexedDB.');
      });
      return { articles: supabaseArticles, fromCache: false };
    }

    // If Supabase returned empty for this source, clear stale cache for it
    getAllByIndex(STORE_NAMES.articles, 'contentSource', source).then(cached => {
      for (const item of cached) {
        deleteByKey(STORE_NAMES.articles, item.id).catch(() => {});
      }
    }).catch(() => {});

    // Fallback to mock data if Supabase has no articles for this source
    const articles = await mockFetchFromApi(source, count);
    const filtered = filterBySource(articles, source);

    if (filtered.length > 0) {
      const cachedArticles: CachedArticle[] = filtered.map((article) => ({
        ...article,
        cachedAt: new Date(),
      }));
      putMany(STORE_NAMES.articles, cachedArticles).catch(() => {
        console.warn('[newsFetcher] Failed to cache articles to IndexedDB.');
      });
    }

    return { articles: filtered, fromCache: false };
  } catch (error) {
    // On failure, fall back to cached articles
    let cached: NewsArticle[] = [];
    try {
      cached = await getCachedArticles(source);
    } catch {
      // If cache retrieval also fails, return empty
    }
    const errorMessage =
      cached.length > 0
        ? '网络请求失败，已加载缓存内容'
        : '无法获取内容，请检查网络连接后重试';

    return { articles: cached, fromCache: true, error: errorMessage };
  }
}

/**
 * Filters articles to only include those matching the specified ContentSource.
 * Returns a subset of the input array where every article's contentSource matches.
 */
export function filterBySource(
  articles: NewsArticle[],
  source: ContentSource
): NewsArticle[] {
  return articles.filter((article) => article.contentSource === source);
}

/**
 * Retrieves cached articles for the specified ContentSource from IndexedDB.
 * Uses the 'contentSource' index for efficient lookup.
 */
export async function getCachedArticles(
  source: ContentSource
): Promise<NewsArticle[]> {
  try {
    const cached = await getAllByIndex(STORE_NAMES.articles, 'contentSource', source);
    // Convert CachedArticle back to NewsArticle (strip cachedAt)
    return cached.map(({ cachedAt, ...article }) => article);
  } catch {
    return [];
  }
}

/**
 * Fetches a single article by ID, first checking IndexedDB cache,
 * then falling back to the mock API if not found.
 */
export async function getArticleById(id: string): Promise<NewsArticle | null> {
  try {
    // Try cache first
    const cached = await getByKey(STORE_NAMES.articles, id);
    if (cached) {
      const { cachedAt, ...article } = cached;
      return article;
    }

    // Try fetching from Supabase user_articles (private articles)
    try {
      const { data } = await supabase
        .from('user_articles')
        .select('*')
        .eq('id', id)
        .single();
      if (data) {
        const cleanContent = stripHTML(data.content);
        const cleanSummary = stripHTML(data.summary || '');
        const sentences = splitIntoSentences(cleanContent, data.id);
        const publishDate = data.published_at || data.created_at || new Date().toISOString();
        return {
          id: data.id,
          title: stripHTML(data.title),
          summary: cleanSummary || cleanContent.substring(0, 150) + '...',
          content: cleanContent,
          sentences,
          publishedAt: new Date(publishDate),
          source: data.source_name || '我的文章',
          contentSource: (data.content_source || 'senior-high') as ContentSource,
          difficulty: (data.difficulty || 'intermediate') as DifficultyLevel,
          imageUrl: data.image_url || undefined,
        };
      }
    } catch {
      // Continue to other sources
    }

    // Try fetching from Supabase public articles
    try {
      const { data } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single();
      if (data) {
        const cleanContent = stripHTML(data.content);
        const cleanSummary = stripHTML(data.summary || '');
        const sentences = splitIntoSentences(cleanContent, data.id);
        return {
          id: data.id,
          title: stripHTML(data.title),
          summary: cleanSummary || cleanContent.substring(0, 150) + '...',
          content: cleanContent,
          sentences,
          publishedAt: new Date(data.published_at || data.created_at),
          source: data.source_name || '',
          contentSource: data.content_source as ContentSource,
          difficulty: (data.difficulty || 'intermediate') as DifficultyLevel,
          imageUrl: data.image_url || undefined,
        };
      }
    } catch {
      // Continue to mock fallback
    }

    // If not in Supabase, search mock sources
    for (const source of ALL_SOURCES) {
      const articles = await mockFetchFromApi(source, 10);
      const match = articles.find((a) => a.id === id);
      if (match) return match;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Clears all cached articles from IndexedDB.
 * Called when the user switches content sources to ensure fresh data.
 */
export async function clearArticleCache(): Promise<void> {
  try {
    await clearStore(STORE_NAMES.articles);
  } catch {
    // Fail silently - cache clear is not critical
    console.warn('[newsFetcher] Failed to clear article cache.');
  }
}

/**
 * Returns all supported ContentSource values.
 */
export function getAvailableSources(): ContentSource[] {
  return [...ALL_SOURCES];
}

// ============================================================
// Export NewsFetcher object (convenience grouping)
// ============================================================

export const newsFetcher: NewsFetcher = {
  fetchArticles: async (source, count) => {
    const result = await fetchArticles(source, count);
    return result.articles;
  },
  filterBySource,
  getCachedArticles,
  getArticleById,
  clearArticleCache,
  getAvailableSources,
};

export default newsFetcher;
