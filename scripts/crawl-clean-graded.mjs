/**
 * Clean Graded Crawler - 只爬取纯英文的分级文章
 * 严格过滤中文，确保内容适合对应年级
 * 
 * Run: node scripts/crawl-clean-graded.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://phlxxwlopehxkxpjvfwa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBobHh4d2xvcGVoeGt4cGp2ZndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4Njg1NTEsImV4cCI6MjA5ODQ0NDU1MX0.DU5QkKEVDu6ua0vKIgpen789ihXq_vWFbSt06WJQIQw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CHINESE_RE = /[\u4e00-\u9fff]/;
const seenTitles = new Set();
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function cleanHTML(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<img[^>]*\/?>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '').replace(/https?:\/\/[^\s)'"]+/g, '')
    .replace(/\s+/g, ' ').trim();
}

function isCleanEnglish(text) {
  if (CHINESE_RE.test(text)) return false;
  if (text.length < 50) return false;
  // At least 80% ASCII characters
  const ascii = text.split('').filter(c => c.charCodeAt(0) < 128).length;
  return ascii / text.length > 0.8;
}

async function fetchPage(url) {
  try {
    const r = await fetch(url, { headers:{'User-Agent':UA}, signal:AbortSignal.timeout(12000) });
    return r.ok ? await r.text() : null;
  } catch { return null; }
}

function parseRSS(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const x = m[1];
    const t = x.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const d = x.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const l = x.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    const enc = x.match(/<content:encoded[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i);
    items.push({
      title: t ? cleanHTML(t[1]) : '',
      desc: d ? cleanHTML(d[1]) : '',
      link: l ? cleanHTML(l[1]) : '',
      encoded: enc ? cleanHTML(enc[1]) : '',
    });
  }
  return items;
}

// ============================================================
// Breaking News English - 大量爬取全文
// ============================================================
async function crawlBNE() {
  console.log('📰 Breaking News English...');
  const articles = [];
  const html = await fetchPage('https://breakingnewsenglish.com/rss.xml');
  if (!html) { console.log('  ❌ RSS failed'); return articles; }

  const items = parseRSS(html);
  for (const item of items) {
    if (!item.title || seenTitles.has(item.title.toLowerCase())) continue;
    let content = item.encoded || item.desc;
    if (!isCleanEnglish(content)) continue;

    if (item.link && content.length < 200) {
      const full = await fetchPage(item.link);
      if (full) {
        const ps = [];
        const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
        let pm;
        while ((pm = pRe.exec(full)) !== null) {
          const t = cleanHTML(pm[1]);
          if (t.length > 40 && isCleanEnglish(t)) ps.push(t);
        }
        if (ps.length >= 2) content = ps.slice(0, 12).join(' ');
      }
      await new Promise(r => setTimeout(r, 300));
    }

    if (!isCleanEnglish(content)) continue;
    seenTitles.add(item.title.toLowerCase());
    articles.push({ title: item.title, content, link: item.link });
  }
  console.log(`  ✅ ${articles.length} articles`);
  return articles;
}

// ============================================================
// News in Levels
// ============================================================
async function crawlNIL() {
  console.log('📰 News in Levels...');
  const articles = [];
  const html = await fetchPage('https://www.newsinlevels.com/feed/');
  if (!html) { console.log('  ❌ RSS failed'); return articles; }

  const items = parseRSS(html);
  for (const item of items) {
    if (!item.title || seenTitles.has(item.title.toLowerCase())) continue;
    const content = item.encoded || item.desc;
    if (!isCleanEnglish(content)) continue;
    seenTitles.add(item.title.toLowerCase());
    articles.push({ title: item.title, content, link: item.link });
  }
  console.log(`  ✅ ${articles.length} articles`);
  return articles;
}

// ============================================================
// 21st Century Senior - 只保留纯英文的
// ============================================================
async function crawl21stSeniorClean() {
  console.log('📰 21st Century Senior (English only)...');
  const articles = [];

  for (let page = 1; page <= 40; page++) {
    const html = await fetchPage(`https://www.i21st.cn/story/senior_${page}.html`);
    if (!html) continue;

    const linkRe = /href="(\/story\/\d+\.html)"/gi;
    const links = new Set();
    let m;
    while ((m = linkRe.exec(html)) !== null) links.add(`https://www.i21st.cn${m[1]}`);

    let count = 0;
    for (const link of links) {
      if (count >= 6) break;
      const artHtml = await fetchPage(link);
      if (!artHtml) continue;

      const titleMatch = artHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      const title = titleMatch ? cleanHTML(titleMatch[1]).trim() : '';
      if (!title || CHINESE_RE.test(title) || seenTitles.has(title.toLowerCase())) continue;

      const ps = [];
      const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      let pm;
      while ((pm = pRe.exec(artHtml)) !== null) {
        const t = cleanHTML(pm[1]);
        if (t.length > 30 && isCleanEnglish(t)) ps.push(t);
      }
      const content = ps.slice(0, 15).join(' ');
      if (!isCleanEnglish(content) || content.length < 100) continue;

      seenTitles.add(title.toLowerCase());
      count++;
      articles.push({ title, content, link });
      await new Promise(r => setTimeout(r, 150));
    }
    if (page % 10 === 0) console.log(`  Page ${page}: total so far ${articles.length}`);
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`  ✅ ${articles.length} clean English articles`);
  return articles;
}

// ============================================================
// 21st Century Primary - 只保留纯英文的
// ============================================================
async function crawl21stPrimaryClean() {
  console.log('📰 21st Century Primary (English only)...');
  const articles = [];

  for (let page = 1; page <= 30; page++) {
    const html = await fetchPage(`https://www.i21st.cn/story/primary_${page}.html`);
    if (!html) continue;

    const linkRe = /href="(\/story\/\d+\.html)"/gi;
    const links = new Set();
    let m;
    while ((m = linkRe.exec(html)) !== null) links.add(`https://www.i21st.cn${m[1]}`);

    let count = 0;
    for (const link of links) {
      if (count >= 6) break;
      const artHtml = await fetchPage(link);
      if (!artHtml) continue;

      const titleMatch = artHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      const title = titleMatch ? cleanHTML(titleMatch[1]).trim() : '';
      if (!title || CHINESE_RE.test(title) || seenTitles.has(title.toLowerCase())) continue;

      const ps = [];
      const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      let pm;
      while ((pm = pRe.exec(artHtml)) !== null) {
        const t = cleanHTML(pm[1]);
        if (t.length > 20 && isCleanEnglish(t)) ps.push(t);
      }
      const content = ps.slice(0, 10).join(' ');
      if (!isCleanEnglish(content) || content.length < 60) continue;

      seenTitles.add(title.toLowerCase());
      count++;
      articles.push({ title, content, link });
      await new Promise(r => setTimeout(r, 150));
    }
    if (page % 10 === 0) console.log(`  Page ${page}: total so far ${articles.length}`);
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`  ✅ ${articles.length} clean English articles`);
  return articles;
}

// ============================================================
// Save & Main
// ============================================================
async function saveArticles(articles) {
  if (!articles.length) return;
  console.log(`\n💾 Saving ${articles.length} articles...`);
  let saved = 0, skipped = 0;
  for (let i = 0; i < articles.length; i += 20) {
    const batch = articles.slice(i, i + 20);
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

async function main() {
  console.log('🚀 Crawling clean English-only graded articles...\n');

  // Crawl all sources
  const bne = await crawlBNE();
  const nil = await crawlNIL();
  const senior = await crawl21stSeniorClean();
  const primary = await crawl21stPrimaryClean();

  // Assign grades
  // BNE + senior 21st -> 高中 (split by length)
  const seniorAll = [...bne, ...senior];
  seniorAll.sort((a, b) => a.content.length - b.content.length);
  const s3 = Math.floor(seniorAll.length / 3);

  const formatted = [];

  // 高一
  for (let i = 0; i < s3; i++) {
    const a = seniorAll[i];
    formatted.push({
      title: a.title, content: a.content,
      summary: a.content.substring(0, 250) + '...',
      source_name: '高中英语阅读 - 高一',
      source_url: a.link || '',
      content_source: 'senior-high', difficulty: 'intermediate', grade: '高一',
      published_at: new Date(Date.now() - Math.random()*86400000*60).toISOString(),
    });
  }
  // 高二
  for (let i = s3; i < s3*2; i++) {
    const a = seniorAll[i];
    formatted.push({
      title: a.title, content: a.content,
      summary: a.content.substring(0, 250) + '...',
      source_name: '高中英语阅读 - 高二',
      source_url: a.link || '',
      content_source: 'senior-high', difficulty: 'advanced', grade: '高二',
      published_at: new Date(Date.now() - Math.random()*86400000*60).toISOString(),
    });
  }
  // 高三
  for (let i = s3*2; i < seniorAll.length; i++) {
    const a = seniorAll[i];
    formatted.push({
      title: a.title, content: a.content,
      summary: a.content.substring(0, 250) + '...',
      source_name: '高中英语阅读 - 高三',
      source_url: a.link || '',
      content_source: 'senior-high', difficulty: 'advanced', grade: '高三',
      published_at: new Date(Date.now() - Math.random()*86400000*60).toISOString(),
    });
  }

  // Primary + NIL -> 小学 (split)
  const elemAll = [...primary, ...nil];
  elemAll.sort((a, b) => a.content.length - b.content.length);
  const e4 = Math.floor(elemAll.length / 4);

  for (let i = 0; i < e4; i++) {
    const a = elemAll[i];
    formatted.push({
      title: a.title, content: a.content,
      summary: a.content.substring(0, 200) + '...',
      source_name: '小学英语阅读 - 三年级',
      source_url: a.link || '',
      content_source: 'elementary', difficulty: 'beginner', grade: '三年级',
      published_at: new Date(Date.now() - Math.random()*86400000*60).toISOString(),
    });
  }
  for (let i = e4; i < e4*2; i++) {
    const a = elemAll[i];
    formatted.push({
      title: a.title, content: a.content,
      summary: a.content.substring(0, 200) + '...',
      source_name: '小学英语阅读 - 四年级',
      source_url: a.link || '',
      content_source: 'elementary', difficulty: 'beginner', grade: '四年级',
      published_at: new Date(Date.now() - Math.random()*86400000*60).toISOString(),
    });
  }
  for (let i = e4*2; i < e4*3; i++) {
    const a = elemAll[i];
    formatted.push({
      title: a.title, content: a.content,
      summary: a.content.substring(0, 200) + '...',
      source_name: '小学英语阅读 - 五年级',
      source_url: a.link || '',
      content_source: 'elementary', difficulty: 'beginner', grade: '五年级',
      published_at: new Date(Date.now() - Math.random()*86400000*60).toISOString(),
    });
  }
  for (let i = e4*3; i < elemAll.length; i++) {
    const a = elemAll[i];
    formatted.push({
      title: a.title, content: a.content,
      summary: a.content.substring(0, 200) + '...',
      source_name: '小学英语阅读 - 六年级',
      source_url: a.link || '',
      content_source: 'elementary', difficulty: 'beginner', grade: '六年级',
      published_at: new Date(Date.now() - Math.random()*86400000*60).toISOString(),
    });
  }

  // Summary
  const gradeCount = {};
  for (const a of formatted) gradeCount[a.grade] = (gradeCount[a.grade]||0) + 1;
  console.log('\n📊 Clean articles by grade:');
  for (const [g, c] of Object.entries(gradeCount).sort()) console.log(`  ${g}: ${c}`);
  console.log(`  Total: ${formatted.length}`);

  await saveArticles(formatted);

  const { count } = await supabase.from('articles').select('*', { count:'exact', head:true });
  console.log(`\n📚 Total in database: ${count}`);
  console.log('✨ Done!');
}

main().catch(console.error);
