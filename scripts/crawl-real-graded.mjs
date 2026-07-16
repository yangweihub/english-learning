/**
 * Real Graded Article Crawler - 爬取真实的分年级英语文章
 * 
 * Sources:
 * - 21st Century Kids (小学版) + Senior (高中版)
 * - Breaking News English (分级新闻)
 * - News in Levels (分级)
 * - English e-Reader (分级阅读)
 * 
 * Run: node scripts/crawl-real-graded.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://phlxxwlopehxkxpjvfwa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBobHh4d2xvcGVoeGt4cGp2ZndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4Njg1NTEsImV4cCI6MjA5ODQ0NDU1MX0.DU5QkKEVDu6ua0vKIgpen789ihXq_vWFbSt06WJQIQw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const seenTitles = new Set();
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function cleanHTML(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<video[\s\S]*?<\/video>/gi, '')
    .replace(/<img[^>]*\/?>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '').replace(/https?:\/\/[^\s)'"]+/g, '')
    .replace(/\s+/g, ' ').trim();
}

async function fetchPage(url, timeout = 15000) {
  const resp = await fetch(url, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(timeout),
  });
  if (!resp.ok) return null;
  return await resp.text();
}

// ============================================================
// 21st Century - 小学版 (多页爬取)
// ============================================================
async function crawl21stElementary() {
  console.log('\n📰 Crawling 21st Century Kids (小学)...');
  const articles = [];
  const pages = Array.from({length: 20}, (_, i) => i + 1);

  for (const page of pages) {
    try {
      const url = `https://www.i21st.cn/story/primary_${page}.html`;
      const html = await fetchPage(url);
      if (!html) { console.log(`  ⚠️ Page ${page}: failed`); continue; }

      const linkRe = /href="(\/story\/\d+\.html)"/gi;
      const links = new Set();
      let m;
      while ((m = linkRe.exec(html)) !== null) links.add(`https://www.i21st.cn${m[1]}`);

      let count = 0;
      for (const link of links) {
        if (count >= 8) break;
        try {
          const artHtml = await fetchPage(link, 10000);
          if (!artHtml) continue;

          const titleMatch = artHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          const title = titleMatch ? cleanHTML(titleMatch[1]).trim() : '';
          if (!title || title.length < 5 || seenTitles.has(title.toLowerCase())) continue;

          // Extract paragraphs
          const paragraphs = [];
          const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
          let pm;
          while ((pm = pRe.exec(artHtml)) !== null) {
            const t = cleanHTML(pm[1]);
            if (t.length > 20 && !t.includes('©') && !t.includes('Copyright') && !t.includes('编辑'))
              paragraphs.push(t);
          }
          const content = paragraphs.slice(0, 15).join(' ');
          if (content.length < 60) continue;

          seenTitles.add(title.toLowerCase());
          count++;
          articles.push({
            title, content,
            source_name: '21世纪学生英文报 - 小学版',
            source_url: link,
            content_source: 'elementary',
            difficulty: 'beginner',
            grade: null, // Will assign based on content length
          });
          await new Promise(r => setTimeout(r, 200));
        } catch { /* skip */ }
      }
      console.log(`  Page ${page}: ${count} articles`);
      await new Promise(r => setTimeout(r, 300));
    } catch (err) { console.log(`  ❌ Page ${page}: ${err.message}`); }
  }

  // Assign grades based on content complexity (length as proxy)
  articles.sort((a, b) => a.content.length - b.content.length);
  const quarter = Math.floor(articles.length / 4);
  articles.forEach((a, i) => {
    if (i < quarter) a.grade = '三年级';
    else if (i < quarter * 2) a.grade = '四年级';
    else if (i < quarter * 3) a.grade = '五年级';
    else a.grade = '六年级';
  });

  console.log(`  ✅ Total elementary: ${articles.length}`);
  return articles;
}

// ============================================================
// 21st Century - 高中版 (多页爬取)
// ============================================================
async function crawl21stSenior() {
  console.log('\n📰 Crawling 21st Century Senior (高中)...');
  const articles = [];
  const pages = Array.from({length: 30}, (_, i) => i + 1);

  for (const page of pages) {
    try {
      const url = `https://www.i21st.cn/story/senior_${page}.html`;
      const html = await fetchPage(url);
      if (!html) { console.log(`  ⚠️ Page ${page}: failed`); continue; }

      const linkRe = /href="(\/story\/\d+\.html)"/gi;
      const links = new Set();
      let m;
      while ((m = linkRe.exec(html)) !== null) links.add(`https://www.i21st.cn${m[1]}`);

      let count = 0;
      for (const link of links) {
        if (count >= 8) break;
        try {
          const artHtml = await fetchPage(link, 10000);
          if (!artHtml) continue;

          const titleMatch = artHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          const title = titleMatch ? cleanHTML(titleMatch[1]).trim() : '';
          if (!title || title.length < 5 || seenTitles.has(title.toLowerCase())) continue;

          const paragraphs = [];
          const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
          let pm;
          while ((pm = pRe.exec(artHtml)) !== null) {
            const t = cleanHTML(pm[1]);
            if (t.length > 30 && !t.includes('©') && !t.includes('Copyright') && !t.includes('编辑'))
              paragraphs.push(t);
          }
          const content = paragraphs.slice(0, 20).join(' ');
          if (content.length < 100) continue;

          seenTitles.add(title.toLowerCase());
          count++;
          articles.push({
            title, content,
            source_name: '21世纪学生英文报 - 高中版',
            source_url: link,
            content_source: 'senior-high',
            difficulty: 'intermediate',
            grade: null,
          });
          await new Promise(r => setTimeout(r, 200));
        } catch { /* skip */ }
      }
      console.log(`  Page ${page}: ${count} articles`);
      await new Promise(r => setTimeout(r, 300));
    } catch (err) { console.log(`  ❌ Page ${page}: ${err.message}`); }
  }

  // Assign grades: shorter=高一, medium=高二, longer=高三
  articles.sort((a, b) => a.content.length - b.content.length);
  const third = Math.floor(articles.length / 3);
  articles.forEach((a, i) => {
    if (i < third) a.grade = '高一';
    else if (i < third * 2) a.grade = '高二';
    else a.grade = '高三';
  });

  console.log(`  ✅ Total senior-high: ${articles.length}`);
  return articles;
}

// ============================================================
// Breaking News English - 分级新闻 (Level 4-6 适合高中)
// ============================================================
async function crawlBreakingNewsGraded() {
  console.log('\n📰 Crawling Breaking News English (graded)...');
  const articles = [];

  try {
    const html = await fetchPage('https://breakingnewsenglish.com/rss.xml', 20000);
    if (!html) { console.log('  ⚠️ RSS failed'); return articles; }

    // Parse RSS
    const itemRe = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    const items = [];
    while ((match = itemRe.exec(html)) !== null) {
      const x = match[1];
      const titleM = x.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const linkM = x.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || x.match(/(https?:\/\/[^\s<"]+)/i);
      const descM = x.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
      items.push({
        title: titleM ? cleanHTML(titleM[1]) : '',
        link: linkM ? cleanHTML(linkM[1]) : '',
        desc: descM ? cleanHTML(descM[1]) : '',
      });
    }

    for (const item of items.slice(0, 60)) {
      if (!item.title || seenTitles.has(item.title.toLowerCase())) continue;
      
      let content = item.desc;
      // Try to get full article
      if (item.link && content.length < 200) {
        try {
          const fullHtml = await fetchPage(item.link, 10000);
          if (fullHtml) {
            const paragraphs = [];
            const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
            let pm;
            while ((pm = pRe.exec(fullHtml)) !== null) {
              const t = cleanHTML(pm[1]);
              if (t.length > 40 && !t.includes('Copyright')) paragraphs.push(t);
            }
            if (paragraphs.length >= 2) content = paragraphs.slice(0, 12).join(' ');
          }
        } catch { /* use desc */ }
      }

      if (content.length < 80) continue;
      seenTitles.add(item.title.toLowerCase());
      articles.push({
        title: item.title, content,
        source_name: 'Breaking News English',
        source_url: item.link,
        content_source: 'senior-high',
        difficulty: 'intermediate',
        grade: null,
      });
      await new Promise(r => setTimeout(r, 200));
    }

    // Assign grades
    articles.sort((a, b) => a.content.length - b.content.length);
    const third = Math.floor(articles.length / 3);
    articles.forEach((a, i) => {
      if (i < third) a.grade = '高一';
      else if (i < third * 2) a.grade = '高二';
      else a.grade = '高三';
    });
  } catch (err) { console.log(`  ❌ ${err.message}`); }

  console.log(`  ✅ Total: ${articles.length}`);
  return articles;
}

// ============================================================
// News in Levels - Level 1 (小学) + Level 3 (高中)
// ============================================================
async function crawlNewsInLevelsGraded() {
  console.log('\n📰 Crawling News in Levels (graded)...');
  const articles = [];

  try {
    const html = await fetchPage('https://www.newsinlevels.com/feed/', 20000);
    if (!html) { console.log('  ⚠️ RSS failed'); return articles; }

    const itemRe = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRe.exec(html)) !== null) {
      const x = match[1];
      const titleM = x.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const descM = x.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      const linkM = x.match(/<link[^>]*>([\s\S]*?)<\/link>/i);

      const title = titleM ? cleanHTML(titleM[1]).trim() : '';
      let content = descM ? cleanHTML(descM[1]) : '';
      const link = linkM ? cleanHTML(linkM[1]) : '';

      if (!title || title.length < 5 || seenTitles.has(title.toLowerCase())) continue;
      if (content.length < 50) continue;

      seenTitles.add(title.toLowerCase());
      // News in Levels articles are generally intermediate
      articles.push({
        title, content,
        source_name: 'News in Levels',
        source_url: link,
        content_source: content.length < 200 ? 'elementary' : 'senior-high',
        difficulty: content.length < 200 ? 'beginner' : 'intermediate',
        grade: content.length < 150 ? '五年级' : content.length < 250 ? '六年级' : '高一',
      });
    }
  } catch (err) { console.log(`  ❌ ${err.message}`); }

  console.log(`  ✅ Total: ${articles.length}`);
  return articles;
}

// ============================================================
// Save to Supabase
// ============================================================
async function saveArticles(articles) {
  if (articles.length === 0) { console.log('  ⚠️ No articles'); return; }
  console.log(`\n💾 Saving ${articles.length} articles...`);
  let saved = 0, skipped = 0;
  for (let i = 0; i < articles.length; i += 20) {
    const batch = articles.slice(i, i + 20).map(a => ({
      title: a.title,
      summary: a.content.substring(0, 250) + (a.content.length > 250 ? '...' : ''),
      content: a.content,
      source_name: a.source_name,
      source_url: a.source_url,
      content_source: a.content_source,
      difficulty: a.difficulty,
      grade: a.grade,
      published_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('articles').insert(batch);
    if (error) {
      for (const a of batch) {
        const { error: e2 } = await supabase.from('articles').insert(a);
        if (e2) skipped++; else saved++;
      }
    } else { saved += batch.length; }
  }
  console.log(`  ✅ Saved: ${saved}, Skipped: ${skipped}`);
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('🚀 Crawling real graded articles...\n');

  const elementary = await crawl21stElementary();
  const senior = await crawl21stSenior();
  const bne = await crawlBreakingNewsGraded();
  const nil = await crawlNewsInLevelsGraded();

  const all = [...elementary, ...senior, ...bne, ...nil];

  // Summary by grade
  const gradeCount = {};
  for (const a of all) {
    gradeCount[a.grade] = (gradeCount[a.grade] || 0) + 1;
  }
  console.log('\n📊 Articles by grade:');
  for (const [g, c] of Object.entries(gradeCount).sort()) {
    console.log(`  ${g}: ${c}`);
  }
  console.log(`  Total: ${all.length}`);

  await saveArticles(all);

  const { count } = await supabase.from('articles').select('*', { count: 'exact', head: true });
  console.log(`\n📚 Total in database: ${count}`);
  console.log('✨ Done!');
}

main().catch(console.error);
