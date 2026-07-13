/**
 * Article Crawler Script - Large Scale
 * 
 * Crawls English articles from multiple sources:
 * - CGTN & China Daily for current-affairs (advanced)
 * - VOA Learning English, News in Levels, etc. for senior-high (intermediate-advanced)
 * 
 * Run with: node scripts/crawl-articles.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://phlxxwlopehxkxpjvfwa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBobHh4d2xvcGVoeGt4cGp2ZndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4Njg1NTEsImV4cCI6MjA5ODQ0NDU1MX0.DU5QkKEVDu6ua0vKIgpen789ihXq_vWFbSt06WJQIQw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const seenTitles = new Set();

// ============================================================
// CGTN RSS Feeds (latest news, full content, China-accessible)
// ============================================================

async function crawlCGTN() {
  console.log('📰 Crawling CGTN (latest news with full content)...\n');

  const feeds = [
    { url: 'https://www.cgtn.com/subscribe/rss/section/world.xml', category: 'World' },
    { url: 'https://www.cgtn.com/subscribe/rss/section/china.xml', category: 'China' },
    { url: 'https://www.cgtn.com/subscribe/rss/section/business.xml', category: 'Business' },
    { url: 'https://www.cgtn.com/subscribe/rss/section/tech-sci.xml', category: 'Tech & Science' },
    { url: 'https://www.cgtn.com/subscribe/rss/section/sports.xml', category: 'Sports' },
    { url: 'https://www.cgtn.com/subscribe/rss/section/culture.xml', category: 'Culture' },
    { url: 'https://www.cgtn.com/subscribe/rss/section/nature.xml', category: 'Nature' },
    { url: 'https://www.cgtn.com/subscribe/rss/section/travel.xml', category: 'Travel' },
    { url: 'https://www.cgtn.com/subscribe/rss/section/opinion.xml', category: 'Opinion' },
  ];

  const allArticles = [];

  for (const feed of feeds) {
    try {
      console.log(`  Fetching ${feed.category}...`);
      const response = await fetch(feed.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) {
        console.log(`  ⚠️ ${feed.category}: ${response.status}`);
        continue;
      }

      const xml = await response.text();
      const items = parseRSSItems(xml);
      let count = 0;

      for (const item of items) {
        const title = cleanHTML(item.title || '').trim();
        if (!title || title.length < 10) continue;
        if (seenTitles.has(title.toLowerCase())) continue;

        // Extract content from encoded field (CGTN provides full HTML content)
        let content = '';
        if (item.encoded) {
          content = cleanHTML(item.encoded);
        }
        if (!content || content.length < 100) {
          content = cleanHTML(item.description || '');
        }
        if (content.length < 80) continue;

        seenTitles.add(title.toLowerCase());
        count++;

        allArticles.push({
          title,
          summary: content.substring(0, 250).trim() + (content.length > 250 ? '...' : ''),
          content,
          source_name: `CGTN - ${feed.category}`,
          source_url: item.link || '',
          content_source: 'current-affairs',
          difficulty: 'advanced',
          published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        });
      }

      console.log(`  ✅ ${count} articles from ${feed.category} (total items in feed: ${items.length})`);
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.log(`  ❌ ${feed.category}: ${err.message}`);
    }
  }

  return allArticles;
}

// ============================================================
// Also crawl China Daily (for variety)
// ============================================================

async function crawlChinaDaily() {
  console.log('\n📰 Crawling China Daily...\n');

  const feeds = [
    { url: 'https://www.chinadaily.com.cn/rss/world_rss.xml', category: 'World' },
    { url: 'https://www.chinadaily.com.cn/rss/china_rss.xml', category: 'China' },
    { url: 'https://www.chinadaily.com.cn/rss/culture_rss.xml', category: 'Culture' },
    { url: 'https://www.chinadaily.com.cn/rss/sports_rss.xml', category: 'Sports' },
    { url: 'https://www.chinadaily.com.cn/rss/opinion_rss.xml', category: 'Opinion' },
  ];

  const articles = [];

  for (const feed of feeds) {
    try {
      console.log(`  Fetching ${feed.category}...`);
      const response = await fetch(feed.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) { console.log(`  ⚠️ ${feed.category}: ${response.status}`); continue; }

      const xml = await response.text();
      const items = parseRSSItems(xml);
      let count = 0;

      for (const item of items) {
        const title = cleanHTML(item.title || '').trim();
        if (!title || title.length < 10 || seenTitles.has(title.toLowerCase())) continue;

        let content = cleanHTML(item.description || '');
        
        // Try fetching full article
        if (item.link && content.length < 300) {
          try {
            const fullContent = await fetchFullArticle(item.link);
            if (fullContent && fullContent.length > content.length) content = fullContent;
          } catch { /* use description */ }
        }

        if (content.length < 80) continue;
        seenTitles.add(title.toLowerCase());
        count++;

        articles.push({
          title,
          summary: content.substring(0, 250).trim() + (content.length > 250 ? '...' : ''),
          content,
          source_name: `China Daily - ${feed.category}`,
          source_url: item.link || '',
          content_source: 'current-affairs',
          difficulty: 'advanced',
          published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        });
      }

      console.log(`  ✅ ${count} articles from ${feed.category}`);
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.log(`  ❌ ${feed.category}: ${err.message}`);
    }
  }

  return articles;
}

// ============================================================
// Parsing Helpers
// ============================================================

function parseRSSItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const x = match[1];
    items.push({
      title: extractTag(x, 'title'),
      link: extractTag(x, 'link') || extractPlainLink(x),
      description: extractTag(x, 'description'),
      encoded: extractTag(x, 'content:encoded') || extractTag(x, 'encoded'),
      pubDate: extractTag(x, 'pubDate'),
    });
  }
  return items;
}

function extractTag(xml, tag) {
  const cdataRe = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const m1 = xml.match(cdataRe);
  if (m1) return m1[1].trim();
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m2 = xml.match(re);
  return m2 ? m2[1].trim() : '';
}

function extractPlainLink(xml) {
  const m = xml.match(/(https?:\/\/[^\s<"]+)/i);
  return m ? m[1] : '';
}

function cleanHTML(html) {
  return html
    // Remove entire video/audio/iframe/script/style elements
    .replace(/<video[\s\S]*?<\/video>/gi, '')
    .replace(/<audio[\s\S]*?<\/audio>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Remove self-closing tags (img, br, hr, video without closing tag)
    .replace(/<video[^>]*\/?\s*>/gi, '')
    .replace(/<img[^>]*\/?\s*>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<hr\s*\/?>/gi, ' ')
    // Remove anchor tags but keep text
    .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    // Remove URLs that leaked through
    .replace(/https?:\/\/[^\s)'"]+/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchFullArticle(url) {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    const paragraphs = [];
    const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let m;
    while ((m = pRe.exec(html)) !== null) {
      const t = cleanHTML(m[1]);
      if (t.length > 40 && !t.includes('Copyright') && !t.includes('©') && !t.startsWith('Updated:'))
        paragraphs.push(t);
    }
    return paragraphs.length >= 2 ? paragraphs.slice(0, 15).join(' ') : null;
  } catch { return null; }
}

// ============================================================
// Senior-High Level: VOA Learning English (accessible in China via RSS)
// Suitable for 译林版高中英语阅读水平
// ============================================================

async function crawlVOALearningEnglish() {
  console.log('\n📰 Crawling VOA Learning English (senior-high level)...\n');

  const feeds = [
    { url: 'https://learningenglish.voanews.com/api/z-mqerekqt', category: 'Arts & Culture' },
    { url: 'https://learningenglish.voanews.com/api/ztqpye_ptp', category: 'Health & Lifestyle' },
    { url: 'https://learningenglish.voanews.com/api/zk$qpeypvq', category: 'Science & Technology' },
    { url: 'https://learningenglish.voanews.com/api/z-iqpey-vp', category: 'Education' },
  ];

  const articles = [];

  for (const feed of feeds) {
    try {
      console.log(`  Fetching ${feed.category}...`);
      const response = await fetch(feed.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) { console.log(`  ⚠️ ${feed.category}: ${response.status}`); continue; }

      const xml = await response.text();
      const items = parseRSSItems(xml);
      let count = 0;

      for (const item of items) {
        const title = cleanHTML(item.title || '').trim();
        if (!title || title.length < 10 || seenTitles.has(title.toLowerCase())) continue;

        let content = '';
        if (item.encoded) content = cleanHTML(item.encoded);
        if (!content || content.length < 100) content = cleanHTML(item.description || '');
        if (content.length < 80) continue;

        seenTitles.add(title.toLowerCase());
        count++;

        articles.push({
          title,
          summary: content.substring(0, 250).trim() + (content.length > 250 ? '...' : ''),
          content,
          source_name: `VOA Learning English - ${feed.category}`,
          source_url: item.link || '',
          content_source: 'senior-high',
          difficulty: 'intermediate',
          published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        });
      }

      console.log(`  ✅ ${count} articles from ${feed.category}`);
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.log(`  ❌ ${feed.category}: ${err.message}`);
    }
  }

  return articles;
}

// ============================================================
// Senior-High Level: Breaking News English (graded reading)
// ============================================================

async function crawlBreakingNewsEnglish() {
  console.log('\n📰 Crawling Breaking News English (senior-high level)...\n');

  const articles = [];

  try {
    const response = await fetch('https://breakingnewsenglish.com/rss.xml', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) { console.log(`  ⚠️ Status: ${response.status}`); return articles; }

    const xml = await response.text();
    const items = parseRSSItems(xml);
    let count = 0;

    for (const item of items) {
      const title = cleanHTML(item.title || '').trim();
      if (!title || title.length < 10 || seenTitles.has(title.toLowerCase())) continue;

      let content = cleanHTML(item.description || '');

      // Try fetching full article content
      if (item.link && content.length < 200) {
        try {
          const fullContent = await fetchFullArticle(item.link);
          if (fullContent && fullContent.length > content.length) content = fullContent;
        } catch { /* use description */ }
      }

      if (content.length < 80) continue;
      seenTitles.add(title.toLowerCase());
      count++;

      articles.push({
        title,
        summary: content.substring(0, 250).trim() + (content.length > 250 ? '...' : ''),
        content,
        source_name: 'Breaking News English',
        source_url: item.link || '',
        content_source: 'senior-high',
        difficulty: 'intermediate',
        published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      });
    }

    console.log(`  ✅ ${count} articles`);
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
  }

  return articles;
}

// ============================================================
// Senior-High Level: Scientific American (60-Second Science short articles)
// ============================================================

async function crawlScientificAmerican() {
  console.log('\n📰 Crawling Scientific American / 60-Second Science (senior-high level)...\n');

  const articles = [];

  try {
    const response = await fetch('https://rss.sciam.com/ScientificAmerican-Global', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) { console.log(`  ⚠️ Status: ${response.status}`); return articles; }

    const xml = await response.text();
    const items = parseRSSItems(xml);
    let count = 0;

    for (const item of items) {
      const title = cleanHTML(item.title || '').trim();
      if (!title || title.length < 10 || seenTitles.has(title.toLowerCase())) continue;

      let content = cleanHTML(item.description || '');
      if (item.encoded) {
        const enc = cleanHTML(item.encoded);
        if (enc.length > content.length) content = enc;
      }

      if (content.length < 80) continue;
      seenTitles.add(title.toLowerCase());
      count++;

      articles.push({
        title,
        summary: content.substring(0, 250).trim() + (content.length > 250 ? '...' : ''),
        content,
        source_name: 'Scientific American',
        source_url: item.link || '',
        content_source: 'senior-high',
        difficulty: 'advanced',
        published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      });
    }

    console.log(`  ✅ ${count} articles`);
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
  }

  return articles;
}

// ============================================================
// Senior-High Level: 21st Century (面向中国高中生的英文报纸)
// ============================================================

async function crawl21stCentury() {
  console.log('\n📰 Crawling 21st Century / i21st (senior-high English newspaper)...\n');

  const articles = [];
  const pages = [1, 2, 3, 4, 5]; // Crawl multiple pages

  for (const page of pages) {
    try {
      // 21st Century provides English learning content for Chinese students
      const url = `https://www.i21st.cn/story/senior_${page}.html`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) { console.log(`  ⚠️ Page ${page}: ${response.status}`); continue; }

      const html = await response.text();
      
      // Extract article links from list page
      const linkRe = /href="(\/story\/\d+\.html)"/gi;
      const links = new Set();
      let m;
      while ((m = linkRe.exec(html)) !== null) {
        links.add(`https://www.i21st.cn${m[1]}`);
      }

      let count = 0;
      for (const link of links) {
        if (count >= 10) break; // Limit per page
        try {
          const artResp = await fetch(link, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            signal: AbortSignal.timeout(10000),
          });
          if (!artResp.ok) continue;

          const artHtml = await artResp.text();
          
          // Extract title
          const titleMatch = artHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          const title = titleMatch ? cleanHTML(titleMatch[1]).trim() : '';
          if (!title || title.length < 5 || seenTitles.has(title.toLowerCase())) continue;

          // Extract content from article body
          const bodyMatch = artHtml.match(/<div[^>]*class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
            || artHtml.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
          
          let content = '';
          if (bodyMatch) {
            content = cleanHTML(bodyMatch[1]);
          } else {
            // Fallback: extract all paragraphs
            const paragraphs = [];
            const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
            let pm;
            while ((pm = pRe.exec(artHtml)) !== null) {
              const t = cleanHTML(pm[1]);
              if (t.length > 30 && !t.includes('©') && !t.includes('Copyright')) paragraphs.push(t);
            }
            content = paragraphs.slice(0, 20).join(' ');
          }

          if (content.length < 80) continue;
          seenTitles.add(title.toLowerCase());
          count++;

          articles.push({
            title,
            summary: content.substring(0, 250).trim() + (content.length > 250 ? '...' : ''),
            content,
            source_name: '21st Century',
            source_url: link,
            content_source: 'senior-high',
            difficulty: 'intermediate',
            published_at: new Date().toISOString(),
          });

          await new Promise(r => setTimeout(r, 300));
        } catch { /* skip individual article */ }
      }

      console.log(`  ✅ Page ${page}: ${count} articles`);
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.log(`  ❌ Page ${page}: ${err.message}`);
    }
  }

  return articles;
}

// ============================================================
// Senior-High Level: 高中英语话题文章（手动整理适合译林版的阅读材料）
// Topics aligned with 译林版 high school English textbook themes
// ============================================================

function getSeniorHighTopicArticles() {
  console.log('\n📝 Adding curated senior-high topic articles (译林版 themes)...\n');

  // These are curated articles matching common 译林版 textbook unit themes
  const articles = [
    {
      title: 'The Power of Positive Thinking in Student Life',
      content: 'Positive thinking is not just about being happy all the time. It is a mental attitude that focuses on the bright side of life and expects positive results. Research has shown that students who maintain a positive outlook tend to perform better academically. When faced with challenges such as difficult exams or complex assignments, optimistic students are more likely to persist and find creative solutions. The connection between positive thinking and physical health has also been well documented. Students who think positively experience less stress, have stronger immune systems, and enjoy better overall well-being. Developing a positive mindset requires practice. Students can start by recognizing negative thought patterns and consciously replacing them with constructive alternatives. Keeping a gratitude journal, surrounding oneself with supportive friends, and setting achievable goals are all effective strategies for cultivating positivity.',
      source_name: '英语学习 - 心理健康',
      topic: 'Unit: Growing Up / Personal Development',
    },
    {
      title: 'How Technology Is Changing the Way We Learn',
      content: 'The digital revolution has fundamentally transformed education in ways that previous generations could never have imagined. Online learning platforms now offer courses from the world\'s leading universities, making quality education accessible to anyone with an internet connection. Artificial intelligence is personalizing the learning experience, adapting content to each student\'s pace and style. Virtual reality allows students to explore ancient civilizations, conduct scientific experiments, and practice language skills in immersive environments. However, this technological transformation also raises important questions. How do we maintain meaningful human connections in digital classrooms? How can we ensure that technology enhances rather than replaces critical thinking skills? Educators and students alike must learn to harness technology as a powerful tool while preserving the irreplaceable value of face-to-face interaction and independent thought.',
      source_name: '英语学习 - 科技教育',
      topic: 'Unit: Technology and Modern Life',
    },
    {
      title: 'Traditional Chinese Culture in the Modern World',
      content: 'As China continues its rapid modernization, the preservation and promotion of traditional culture has become increasingly important. Ancient philosophies such as Confucianism and Taoism continue to influence Chinese values and social relationships. Traditional art forms including calligraphy, paper cutting, and Chinese opera are being revitalized through modern platforms and educational programs. The concept of harmony between humans and nature, deeply rooted in Chinese philosophy, offers valuable perspectives on contemporary environmental challenges. Young Chinese people are finding creative ways to blend traditional elements with modern expression. From incorporating traditional patterns into contemporary fashion to creating digital art inspired by ancient paintings, a new cultural renaissance is emerging. This revival demonstrates that tradition and modernity need not be opposing forces but can enrich each other.',
      source_name: '英语学习 - 文化传承',
      topic: 'Unit: Chinese Culture / Cultural Heritage',
    },
    {
      title: 'The Science of Sleep and Academic Performance',
      content: 'Sleep is not merely a period of rest but an active process essential for learning and memory consolidation. During deep sleep, the brain processes and organizes information acquired during the day, strengthening neural connections that form the basis of long-term memory. Research consistently shows that students who get adequate sleep perform significantly better on tests and creative problem-solving tasks. Unfortunately, many high school students sacrifice sleep to study more hours, not realizing this approach is counterproductive. Sleep deprivation impairs concentration, reduces working memory capacity, and diminishes the ability to make connections between different pieces of information. Experts recommend that teenagers get eight to ten hours of sleep per night. Establishing a consistent sleep schedule, limiting screen time before bed, and creating a comfortable sleeping environment are practical steps students can take to improve their sleep quality and, consequently, their academic performance.',
      source_name: '英语学习 - 健康生活',
      topic: 'Unit: Health and Lifestyle',
    },
    {
      title: 'Environmental Protection: Individual Actions Matter',
      content: 'While governments and corporations bear significant responsibility for environmental protection, individual actions collectively make an enormous difference. The choices we make daily regarding transportation, food consumption, and waste management all contribute to our environmental footprint. Reducing single-use plastic consumption is one of the most impactful changes individuals can make. Carrying reusable bags, water bottles, and food containers prevents thousands of plastic items from entering landfills and oceans each year. Dietary choices also play a crucial role. Reducing meat consumption, choosing locally sourced produce, and minimizing food waste can significantly lower one\'s carbon footprint. Energy conservation at home through simple habits like turning off unused lights, using energy-efficient appliances, and adjusting thermostat settings contributes to reducing greenhouse gas emissions. When millions of individuals make these small but meaningful changes, the cumulative environmental benefit is substantial.',
      source_name: '英语学习 - 环境保护',
      topic: 'Unit: Nature and Environment',
    },
    {
      title: 'The Art of Effective Communication',
      content: 'Effective communication is a skill that extends far beyond the ability to speak fluently. It encompasses listening, understanding non-verbal cues, adapting one\'s message to the audience, and expressing ideas clearly and respectfully. In an increasingly connected world, the ability to communicate across cultural boundaries has become essential. Active listening is perhaps the most overlooked component of good communication. It requires full attention to the speaker, genuine interest in their message, and thoughtful responses that demonstrate understanding. Non-verbal communication, including body language, facial expressions, and tone of voice, often conveys more meaning than words alone. In written communication, clarity and organization are paramount. Whether writing an email, an essay, or a social media post, taking time to structure thoughts logically and choose words precisely makes the difference between being understood and being misunderstood. Developing these communication skills requires practice, patience, and a willingness to learn from both successes and failures.',
      source_name: '英语学习 - 人际交往',
      topic: 'Unit: Communication and Relationships',
    },
    {
      title: 'Space Exploration and the Future of Humanity',
      content: 'Humanity\'s fascination with space has driven remarkable achievements over the past several decades. From the first human footsteps on the Moon to the construction of the International Space Station, space exploration represents the pinnacle of human ingenuity and cooperation. China\'s space program has achieved remarkable milestones, including the successful landing on the far side of the Moon and the establishment of the Tiangong space station. These achievements demonstrate the nation\'s growing capabilities in science and technology. Looking forward, plans for establishing permanent human settlements on Mars are no longer science fiction but serious engineering challenges being actively addressed. Space exploration also yields practical benefits for life on Earth. Technologies developed for space missions have led to advances in medical imaging, water purification, and communication systems. Satellite data helps scientists monitor climate change, predict natural disasters, and manage agricultural resources. The pursuit of knowledge beyond our planet continues to inspire new generations of scientists, engineers, and dreamers.',
      source_name: '英语学习 - 太空探索',
      topic: 'Unit: Science and Exploration',
    },
    {
      title: 'Volunteering: Making a Difference in Your Community',
      content: 'Volunteering offers a unique opportunity to contribute to society while developing valuable personal skills. Whether helping at a local food bank, tutoring younger students, or participating in environmental cleanup projects, volunteers make tangible differences in their communities. The benefits of volunteering extend beyond the immediate impact on those being helped. Volunteers often report increased self-confidence, improved communication skills, and a stronger sense of purpose. For students, volunteering provides practical experience that complements classroom learning. It offers exposure to diverse perspectives and real-world challenges that cannot be replicated in textbooks. Research has also shown that regular volunteering is associated with better mental health, reduced stress levels, and even improved physical health. Finding the right volunteer opportunity involves identifying personal interests and skills, researching local organizations, and committing to a realistic schedule. Even small contributions of time and effort, when sustained over months and years, create meaningful change.',
      source_name: '英语学习 - 社会服务',
      topic: 'Unit: Social Responsibility',
    },
    {
      title: 'The Rise of Artificial Intelligence and Its Impact on Society',
      content: 'Artificial intelligence has rapidly evolved from a concept in science fiction to a technology that permeates daily life. From voice assistants and recommendation algorithms to autonomous vehicles and medical diagnosis systems, AI applications are becoming increasingly sophisticated and widespread. This technological revolution raises profound questions about the future of work, education, and human identity. Many routine jobs are being automated, but new roles requiring creativity, emotional intelligence, and complex problem-solving are emerging. The education system must adapt to prepare students for a world where AI handles routine tasks and humans focus on higher-order thinking. Ethical considerations surrounding AI development include questions about privacy, bias in algorithms, and the concentration of technological power. As AI systems become more capable, society must establish frameworks to ensure these powerful tools serve humanity\'s best interests while minimizing potential harm. Understanding AI is no longer optional but an essential component of modern literacy.',
      source_name: '英语学习 - 人工智能',
      topic: 'Unit: Technology and Ethics',
    },
    {
      title: 'The Benefits of Reading Literature in English',
      content: 'Reading English literature offers far more than vocabulary expansion and grammar improvement. It provides a window into different cultures, historical periods, and ways of thinking that broaden one\'s understanding of the human experience. Through literature, readers develop empathy by inhabiting characters whose lives and perspectives differ vastly from their own. Classic works by authors such as Shakespeare, Dickens, and Austen reveal universal themes of love, ambition, justice, and identity that remain relevant across centuries. Contemporary literature addresses modern issues including globalization, technology, and cultural identity. For language learners, reading literature improves comprehension skills, builds intuitive understanding of sentence structure, and exposes readers to rich, varied vocabulary used in natural contexts. Starting with shorter works such as short stories and gradually progressing to novels helps build confidence and stamina. The key is choosing texts that are challenging enough to promote growth while remaining engaging enough to sustain interest.',
      source_name: '英语学习 - 文学阅读',
      topic: 'Unit: Literature and Language',
    },
    {
      title: 'Sports and Character Building',
      content: 'Participation in sports contributes to character development in ways that extend well beyond physical fitness. Athletes learn to set goals, manage time effectively, and maintain discipline through consistent training routines. Team sports develop cooperation, communication, and leadership skills as players work together toward shared objectives. Individual sports cultivate self-reliance, mental toughness, and the ability to perform under pressure. Perhaps most importantly, sports teach resilience through inevitable experiences of failure and setback. A missed shot, a lost match, or a disappointing performance provides opportunities to practice recovering from adversity with grace and determination. The lessons learned on the playing field transfer directly to academic and professional settings. Students who participate in sports often demonstrate better time management, stronger work ethic, and greater ability to handle stress. These transferable skills make athletic participation a valuable complement to academic education.',
      source_name: '英语学习 - 体育精神',
      topic: 'Unit: Sports and Personal Growth',
    },
    {
      title: 'Understanding Cultural Differences in a Globalized World',
      content: 'In an era of unprecedented global connectivity, understanding and respecting cultural differences has become an essential life skill. Culture shapes how people communicate, make decisions, express emotions, and build relationships. What is considered polite in one culture may be offensive in another. Direct communication is valued in some societies while indirect approaches are preferred elsewhere. Developing cultural awareness begins with recognizing that one\'s own cultural norms are not universal truths but rather one set of practices among many. Travel, international friendships, and exposure to foreign media all contribute to broader cultural understanding. However, genuine cultural competence requires more than surface-level knowledge of customs and traditions. It demands the ability to suspend judgment, ask respectful questions, and adapt one\'s behavior appropriately in cross-cultural situations. As the world becomes increasingly interconnected through technology and commerce, the ability to navigate cultural differences becomes not just personally enriching but professionally essential.',
      source_name: '英语学习 - 跨文化交际',
      topic: 'Unit: Global Awareness',
    },
  ];

  return articles.map(a => ({
    title: a.title,
    summary: a.content.substring(0, 250).trim() + '...',
    content: a.content,
    source_name: a.source_name,
    source_url: '',
    content_source: 'senior-high',
    difficulty: 'intermediate',
    published_at: new Date().toISOString(),
  }));
}

// ============================================================
// Senior-High Level: BBC Learning English (accessible, intermediate level)
// ============================================================

async function crawlBBCLearningEnglish() {
  console.log('\n📰 Crawling BBC Learning English (senior-high level)...\n');

  const articles = [];

  try {
    const response = await fetch('https://www.bbc.co.uk/learningenglish/english/rss', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) { console.log(`  ⚠️ Status: ${response.status}`); return articles; }

    const xml = await response.text();
    const items = parseRSSItems(xml);
    let count = 0;

    for (const item of items) {
      const title = cleanHTML(item.title || '').trim();
      if (!title || title.length < 10 || seenTitles.has(title.toLowerCase())) continue;

      let content = '';
      if (item.encoded) content = cleanHTML(item.encoded);
      if (!content || content.length < 100) content = cleanHTML(item.description || '');
      if (content.length < 80) continue;

      seenTitles.add(title.toLowerCase());
      count++;

      articles.push({
        title,
        summary: content.substring(0, 250).trim() + (content.length > 250 ? '...' : ''),
        content,
        source_name: 'BBC Learning English',
        source_url: item.link || '',
        content_source: 'senior-high',
        difficulty: 'intermediate',
        published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      });
    }

    console.log(`  ✅ ${count} articles`);
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
  }

  return articles;
}

// ============================================================
// Senior-High Level: News in Levels (Level 3 = senior-high)
// ============================================================

async function crawlNewsInLevels() {
  console.log('\n📰 Crawling News in Levels (senior-high level)...\n');

  const articles = [];

  try {
    const response = await fetch('https://www.newsinlevels.com/feed/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) { console.log(`  ⚠️ Status: ${response.status}`); return articles; }

    const xml = await response.text();
    const items = parseRSSItems(xml);
    let count = 0;

    for (const item of items) {
      const title = cleanHTML(item.title || '').trim();
      if (!title || title.length < 10 || seenTitles.has(title.toLowerCase())) continue;

      let content = '';
      if (item.encoded) content = cleanHTML(item.encoded);
      if (!content || content.length < 100) content = cleanHTML(item.description || '');
      if (content.length < 80) continue;

      seenTitles.add(title.toLowerCase());
      count++;

      articles.push({
        title,
        summary: content.substring(0, 250).trim() + (content.length > 250 ? '...' : ''),
        content,
        source_name: 'News in Levels',
        source_url: item.link || '',
        content_source: 'senior-high',
        difficulty: 'intermediate',
        published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      });
    }

    console.log(`  ✅ ${count} articles`);
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
  }

  return articles;
}

// ============================================================
// Senior-High Level: The Guardian - Education section (accessible)
// ============================================================

async function crawlGuardianEducation() {
  console.log('\n📰 Crawling The Guardian Education (senior-high level)...\n');

  const articles = [];
  const feeds = [
    { url: 'https://www.theguardian.com/education/rss', category: 'Education' },
    { url: 'https://www.theguardian.com/science/rss', category: 'Science' },
    { url: 'https://www.theguardian.com/environment/rss', category: 'Environment' },
  ];

  for (const feed of feeds) {
    try {
      console.log(`  Fetching ${feed.category}...`);
      const response = await fetch(feed.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) { console.log(`  ⚠️ ${feed.category}: ${response.status}`); continue; }

      const xml = await response.text();
      const items = parseRSSItems(xml);
      let count = 0;

      for (const item of items.slice(0, 15)) {
        const title = cleanHTML(item.title || '').trim();
        if (!title || title.length < 10 || seenTitles.has(title.toLowerCase())) continue;

        let content = cleanHTML(item.description || '');
        if (item.encoded) {
          const enc = cleanHTML(item.encoded);
          if (enc.length > content.length) content = enc;
        }
        if (content.length < 100) continue;

        seenTitles.add(title.toLowerCase());
        count++;

        articles.push({
          title,
          summary: content.substring(0, 250).trim() + (content.length > 250 ? '...' : ''),
          content,
          source_name: `The Guardian - ${feed.category}`,
          source_url: item.link || '',
          content_source: 'senior-high',
          difficulty: 'advanced',
          published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        });
      }

      console.log(`  ✅ ${count} articles from ${feed.category}`);
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.log(`  ❌ ${feed.category}: ${err.message}`);
    }
  }

  return articles;
}

async function saveArticles(articles) {
  if (articles.length === 0) { console.log('\n⚠️ No articles to save.'); return; }

  console.log(`\n💾 Saving ${articles.length} articles to Supabase...`);

  // Batch insert (20 at a time), skip duplicates via unique index
  let saved = 0;
  let skipped = 0;

  for (let i = 0; i < articles.length; i += 20) {
    const batch = articles.slice(i, i + 20);
    const { error } = await supabase.from('articles').upsert(batch, { onConflict: 'title', ignoreDuplicates: true });
    if (error) {
      // If upsert not available, try insert and ignore errors
      for (const article of batch) {
        const { error: e2 } = await supabase.from('articles').insert(article);
        if (e2) { skipped++; } else { saved++; }
      }
    } else {
      saved += batch.length;
    }
  }

  console.log(`  ✅ Saved: ${saved}, Skipped (duplicates): ${skipped}`);
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('🚀 Starting large-scale article crawler...\n');

  // Current affairs (advanced)
  const cgtnArticles = await crawlCGTN();
  const chinaDaily = await crawlChinaDaily();

  // Senior-high level (intermediate-advanced, 适合译林版高中英语)
  const voaArticles = await crawlVOALearningEnglish();
  const bneArticles = await crawlBreakingNewsEnglish();
  const sciAmArticles = await crawlScientificAmerican();
  const i21stArticles = await crawl21stCentury();
  const bbcArticles = await crawlBBCLearningEnglish();
  const nilArticles = await crawlNewsInLevels();
  const guardianArticles = await crawlGuardianEducation();
  const topicArticles = getSeniorHighTopicArticles();

  const allArticles = [
    ...cgtnArticles,
    ...chinaDaily,
    ...voaArticles,
    ...bneArticles,
    ...sciAmArticles,
    ...i21stArticles,
    ...bbcArticles,
    ...nilArticles,
    ...guardianArticles,
    ...topicArticles,
  ];

  const seniorHighTotal = voaArticles.length + bneArticles.length + sciAmArticles.length + i21stArticles.length + bbcArticles.length + nilArticles.length + guardianArticles.length + topicArticles.length;

  console.log(`\n📊 Total new articles crawled:`);
  console.log(`  - Current affairs: ${cgtnArticles.length + chinaDaily.length}`);
  console.log(`  - Senior-high: ${seniorHighTotal}`);
  console.log(`  - Total: ${allArticles.length}`);

  await saveArticles(allArticles);

  const { count } = await supabase.from('articles').select('*', { count: 'exact', head: true });
  console.log(`\n📚 Total articles in database: ${count}`);
  console.log('✨ Done!');
}

main().catch(console.error);
