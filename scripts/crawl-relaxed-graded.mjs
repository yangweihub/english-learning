/**
 * Relaxed Graded Crawler - 放宽过滤，允许正文含少量中文
 * 只排除：标题全中文的、正文中文比例超过20%的
 * 
 * Run: node scripts/crawl-relaxed-graded.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://phlxxwlopehxkxpjvfwa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBobHh4d2xvcGVoeGt4cGp2ZndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4Njg1NTEsImV4cCI6MjA5ODQ0NDU1MX0.DU5QkKEVDu6ua0vKIgpen789ihXq_vWFbSt06WJQIQw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CHINESE_RE = /[\u4e00-\u9fff]/g;
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

function chineseRatio(text) {
  const matches = text.match(CHINESE_RE);
  return matches ? matches.length / text.length : 0;
}

// Title must have some English (not purely Chinese)
function validTitle(t) {
  if (!t || t.length < 3) return false;
  const eng = t.match(/[a-zA-Z]/g);
  return eng && eng.length >= 3;
}

async function fetchPage(url) {
  try {
    const r = await fetch(url, {headers:{'User-Agent':UA}, signal:AbortSignal.timeout(12000)});
    return r.ok ? await r.text() : null;
  } catch { return null; }
}

// ============================================================
// 21st Century 小学版 - 放宽过滤
// ============================================================
async function crawlPrimary() {
  console.log('📰 21st Century Primary (relaxed filter)...');
  const articles = [];

  for (let page = 1; page <= 50; page++) {
    const html = await fetchPage(`https://www.i21st.cn/story/primary_${page}.html`);
    if (!html) continue;

    const linkRe = /href="(\/story\/\d+\.html)"/gi;
    const links = new Set();
    let m;
    while ((m = linkRe.exec(html)) !== null) links.add(`https://www.i21st.cn${m[1]}`);

    let count = 0;
    for (const link of links) {
      if (count >= 8) break;
      const artHtml = await fetchPage(link);
      if (!artHtml) continue;

      const titleMatch = artHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      const title = titleMatch ? cleanHTML(titleMatch[1]).trim() : '';
      if (!validTitle(title) || seenTitles.has(title.toLowerCase())) continue;

      const ps = [];
      const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      let pm;
      while ((pm = pRe.exec(artHtml)) !== null) {
        const t = cleanHTML(pm[1]);
        if (t.length > 15 && !t.includes('©') && !t.includes('编辑') && !t.includes('责任'))
          ps.push(t);
      }
      const content = ps.slice(0, 12).join(' ');
      if (content.length < 50) continue;
      // Allow up to 15% Chinese
      if (chineseRatio(content) > 0.15) continue;

      seenTitles.add(title.toLowerCase());
      count++;
      articles.push({ title, content, link });
      await new Promise(r => setTimeout(r, 150));
    }
    if (page % 10 === 0) console.log(`  Page ${page}: ${articles.length} total`);
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`  ✅ ${articles.length} articles`);
  return articles;
}

// ============================================================
// 21st Century 高中版 - 放宽过滤
// ============================================================
async function crawlSenior() {
  console.log('📰 21st Century Senior (relaxed filter)...');
  const articles = [];

  for (let page = 1; page <= 50; page++) {
    const html = await fetchPage(`https://www.i21st.cn/story/senior_${page}.html`);
    if (!html) continue;

    const linkRe = /href="(\/story\/\d+\.html)"/gi;
    const links = new Set();
    let m;
    while ((m = linkRe.exec(html)) !== null) links.add(`https://www.i21st.cn${m[1]}`);

    let count = 0;
    for (const link of links) {
      if (count >= 8) break;
      const artHtml = await fetchPage(link);
      if (!artHtml) continue;

      const titleMatch = artHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      const title = titleMatch ? cleanHTML(titleMatch[1]).trim() : '';
      if (!validTitle(title) || seenTitles.has(title.toLowerCase())) continue;

      const ps = [];
      const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      let pm;
      while ((pm = pRe.exec(artHtml)) !== null) {
        const t = cleanHTML(pm[1]);
        if (t.length > 25 && !t.includes('©') && !t.includes('编辑') && !t.includes('责任'))
          ps.push(t);
      }
      const content = ps.slice(0, 15).join(' ');
      if (content.length < 80) continue;
      if (chineseRatio(content) > 0.15) continue;

      seenTitles.add(title.toLowerCase());
      count++;
      articles.push({ title, content, link });
      await new Promise(r => setTimeout(r, 150));
    }
    if (page % 10 === 0) console.log(`  Page ${page}: ${articles.length} total`);
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`  ✅ ${articles.length} articles`);
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
  console.log('🚀 Crawling with relaxed Chinese filter...\n');

  const primary = await crawlPrimary();
  const senior = await crawlSenior();

  // Assign grades by content length
  // Primary -> 三四五六年级
  primary.sort((a, b) => a.content.length - b.content.length);
  const pq = Math.floor(primary.length / 4);

  // Senior -> 高一二三
  senior.sort((a, b) => a.content.length - b.content.length);
  const st = Math.floor(senior.length / 3);

  const formatted = [];

  // 小学
  const elemGrades = ['三年级','四年级','五年级','六年级'];
  for (let g = 0; g < 4; g++) {
    const start = g * pq;
    const end = g === 3 ? primary.length : (g+1) * pq;
    for (let i = start; i < end; i++) {
      const a = primary[i];
      formatted.push({
        title: a.title, content: a.content,
        summary: a.content.substring(0, 200) + '...',
        source_name: `21世纪英文报 - ${elemGrades[g]}`,
        source_url: a.link,
        content_source: 'elementary', difficulty: 'beginner',
        grade: elemGrades[g],
        published_at: new Date(Date.now() - Math.random()*86400000*90).toISOString(),
      });
    }
  }

  // 高中
  const seniorGrades = ['高一','高二','高三'];
  const seniorDiff = ['intermediate','intermediate','advanced'];
  for (let g = 0; g < 3; g++) {
    const start = g * st;
    const end = g === 2 ? senior.length : (g+1) * st;
    for (let i = start; i < end; i++) {
      const a = senior[i];
      formatted.push({
        title: a.title, content: a.content,
        summary: a.content.substring(0, 250) + '...',
        source_name: `21世纪英文报 - ${seniorGrades[g]}`,
        source_url: a.link,
        content_source: 'senior-high', difficulty: seniorDiff[g],
        grade: seniorGrades[g],
        published_at: new Date(Date.now() - Math.random()*86400000*90).toISOString(),
      });
    }
  }

  // Stats
  const gradeCount = {};
  for (const a of formatted) gradeCount[a.grade] = (gradeCount[a.grade]||0) + 1;
  console.log('\n📊 Articles by grade:');
  for (const [g, c] of Object.entries(gradeCount).sort()) console.log(`  ${g}: ${c}`);
  console.log(`  Total: ${formatted.length}`);

  await saveArticles(formatted);

  const { count } = await supabase.from('articles').select('*', { count:'exact', head:true });
  console.log(`\n📚 Total in database: ${count}`);
  console.log('✨ Done!');
}

main().catch(console.error);
