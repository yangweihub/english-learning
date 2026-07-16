/**
 * Cleanup script - 清理不合适的文章
 * 1. 删除含中文字符的文章
 * 2. 删除小学分类中难度过高的文章
 * 3. 重新分配合理的年级
 * 
 * Run: node scripts/cleanup-articles.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://phlxxwlopehxkxpjvfwa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBobHh4d2xvcGVoeGt4cGp2ZndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4Njg1NTEsImV4cCI6MjA5ODQ0NDU1MX0.DU5QkKEVDu6ua0vKIgpen789ihXq_vWFbSt06WJQIQw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Chinese character regex
const CHINESE_RE = /[\u4e00-\u9fff]/;

async function main() {
  console.log('🧹 Cleaning up articles...\n');

  // Step 1: Get all elementary articles
  const { data: elemArticles } = await supabase
    .from('articles')
    .select('id, title, content, grade, source_name')
    .eq('content_source', 'elementary');

  console.log(`Found ${elemArticles?.length || 0} elementary articles`);

  let deletedChinese = 0;
  let deletedHard = 0;
  const toDelete = [];

  for (const a of (elemArticles || [])) {
    // Delete if contains Chinese characters in content
    if (CHINESE_RE.test(a.content)) {
      toDelete.push(a.id);
      deletedChinese++;
      continue;
    }
    // Delete if title contains Chinese
    if (CHINESE_RE.test(a.title)) {
      toDelete.push(a.id);
      deletedChinese++;
      continue;
    }
  }

  console.log(`  含中文的小学文章: ${deletedChinese} 篇`);

  // Step 2: Also check senior-high for Chinese content
  const { data: seniorArticles } = await supabase
    .from('articles')
    .select('id, title, content')
    .eq('content_source', 'senior-high');

  console.log(`Found ${seniorArticles?.length || 0} senior-high articles`);

  let seniorChinese = 0;
  for (const a of (seniorArticles || [])) {
    if (CHINESE_RE.test(a.content) || CHINESE_RE.test(a.title)) {
      toDelete.push(a.id);
      seniorChinese++;
    }
  }
  console.log(`  含中文的高中文章: ${seniorChinese} 篇`);

  // Step 3: Delete all flagged articles
  console.log(`\n🗑️ Deleting ${toDelete.length} problematic articles...`);
  
  for (let i = 0; i < toDelete.length; i += 50) {
    const batch = toDelete.slice(i, i + 50);
    const { error } = await supabase
      .from('articles')
      .delete()
      .in('id', batch);
    if (error) console.log(`  ❌ Batch error: ${error.message}`);
  }
  console.log(`  ✅ Deleted ${toDelete.length} articles`);

  // Step 4: For remaining elementary articles from 21st Century,
  // reassign them to 五年级/六年级 (since they're actually harder)
  const { data: remaining } = await supabase
    .from('articles')
    .select('id, content, source_name')
    .eq('content_source', 'elementary')
    .like('source_name', '%21世纪%');

  if (remaining && remaining.length > 0) {
    console.log(`\n📝 Reassigning ${remaining.length} 21st Century elementary articles...`);
    // These are actually 五六年级 level at minimum
    const sorted = remaining.sort((a, b) => a.content.length - b.content.length);
    const half = Math.floor(sorted.length / 2);
    
    const grade5Ids = sorted.slice(0, half).map(a => a.id);
    const grade6Ids = sorted.slice(half).map(a => a.id);

    if (grade5Ids.length > 0) {
      await supabase.from('articles').update({ grade: '五年级' }).in('id', grade5Ids);
    }
    if (grade6Ids.length > 0) {
      await supabase.from('articles').update({ grade: '六年级' }).in('id', grade6Ids);
    }
    console.log(`  ✅ 五年级: ${grade5Ids.length}, 六年级: ${grade6Ids.length}`);
  }

  // Step 5: Summary
  const { count: totalCount } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true });

  const { data: gradeStats } = await supabase
    .from('articles')
    .select('grade, content_source');

  const stats = {};
  for (const a of (gradeStats || [])) {
    const key = `${a.content_source} - ${a.grade || '无年级'}`;
    stats[key] = (stats[key] || 0) + 1;
  }

  console.log(`\n📊 Database summary (total: ${totalCount}):`);
  for (const [k, v] of Object.entries(stats).sort()) {
    console.log(`  ${k}: ${v}`);
  }

  console.log('\n✨ Cleanup done!');
}

main().catch(console.error);
