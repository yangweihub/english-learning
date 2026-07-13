/**
 * Add Article Page
 * Manually add articles via text paste or image OCR scan.
 * Articles are saved to user's private collection (only visible to themselves).
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuthStore } from '../stores/authStore';
import { deleteByKey, STORE_NAMES } from '../utils/db';
import type { ContentSource, DifficultyLevel } from '../types';
import { CONTENT_SOURCE_LABELS } from '../types';

/**
 * Cleans up raw OCR text to produce clean reading content.
 */
function cleanOCRText(raw: string): string {
  let text = raw;
  text = text.replace(/[市县区]教[育研]?[考试院所局]+/g, '');
  text = text.replace(/英语试[卷题]+.*?[页）)]/g, '');
  text = text.replace(/第\s*\d+\s*页.*$/gm, '');
  text = text.replace(/^\s*\d{1,3}\.\s*(What|Which|Who|How|Why|Where|When|Do|Does|Did|Is|Are|Was|Were|Can|Could|Would|Should).*$/gm, '');
  text = text.replace(/^\s*[A-D][.．]\s*.{0,80}$/gm, '');
  text = text.replace(/^\s*\d{1,3}\.\s*[A-D][.．]/gm, '');
  text = text.replace(/^\s*(Read|Choose|Answer|Select|Mark|Fill).*?(below|following|correct|best).*$/gim, '');

  const lines = text.split('\n');
  const merged: string[] = [];
  let buffer = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { if (buffer) { merged.push(buffer); buffer = ''; } continue; }
    if (trimmed.length < 5) continue;
    if (buffer && !buffer.match(/[.!?"""]\s*$/)) { buffer += ' ' + trimmed; }
    else { if (buffer) merged.push(buffer); buffer = trimmed; }
  }
  if (buffer) merged.push(buffer);
  text = merged.join('\n\n');
  text = text.replace(/\s{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

// ============================================================

interface UserArticle {
  id: string;
  title: string;
  content: string;
  content_source: string;
  difficulty: string;
  created_at: string;
}

export function AddArticle() {
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [source, setSource] = useState<ContentSource>('senior-high');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('intermediate');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // My articles list
  const [myArticles, setMyArticles] = useState<UserArticle[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load user's private articles
  useEffect(() => {
    if (!user) return;
    loadMyArticles();
  }, [user]);

  // Check URL for edit param (also re-check on hash change)
  const [hashKey, setHashKey] = useState(window.location.hash);
  useEffect(() => {
    const onHashChange = () => setHashKey(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!user) return;
    const editMatch = hashKey.match(/edit=([^&]+)/);
    if (editMatch && editMatch[1]) {
      const editId = editMatch[1];

      // Check window data first (passed from NewsList)
      const windowData = (window as unknown as Record<string, unknown>).__editArticle as { id: string; title: string; content: string } | undefined;
      if (windowData && windowData.id === editId) {
        setEditingId(windowData.id);
        setTitle(windowData.title);
        setContent(windowData.content);
        delete (window as unknown as Record<string, unknown>).__editArticle;
        return;
      }

      // Try from loaded list
      const found = myArticles.find(a => a.id === editId);
      if (found) {
        setEditingId(found.id);
        setTitle(found.title);
        setContent(found.content);
        setSource((found.content_source || 'senior-high') as ContentSource);
        setDifficulty((found.difficulty || 'intermediate') as DifficultyLevel);
      }
    }
  }, [user, hashKey, myArticles]);

  const loadMyArticles = async () => {
    const { data } = await supabase
      .from('user_articles')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setMyArticles(data);
  };

  // Save or update article
  const handleSave = useCallback(async () => {
    if (!title.trim() || !content.trim() || !user) {
      setMessage({ type: 'error', text: '标题和内容不能为空' });
      return;
    }
    setSaving(true);
    setMessage(null);

    try {
      if (editingId) {
        // Try update first
        const { data: updated, error: updateError } = await supabase.from('user_articles').update({
          title: title.trim(),
          summary: content.trim().substring(0, 250) + (content.length > 250 ? '...' : ''),
          content: content.trim(),
          content_source: source,
          difficulty,
          updated_at: new Date().toISOString(),
        }).eq('id', editingId).select();

        if (updateError) throw updateError;

        // If update matched 0 rows, the article no longer exists in DB — re-insert it
        if (!updated || updated.length === 0) {
          const { error: insertError } = await supabase.from('user_articles').insert({
            id: editingId,
            user_id: user.id,
            title: title.trim(),
            summary: content.trim().substring(0, 250) + (content.length > 250 ? '...' : ''),
            content: content.trim(),
            content_source: source,
            difficulty,
          });
          if (insertError) throw insertError;
        }

        // Clear cached version in IndexedDB so ArticleReader fetches fresh data
        try { await deleteByKey(STORE_NAMES.articles, editingId); } catch { /* ignore */ }

        // Navigate to article detail page
        const updatedId = editingId;
        setEditingId(null);
        setTitle('');
        setContent('');
        setSaving(false);
        window.location.hash = `#/article/${updatedId}`;
        return;
      } else {
        // Insert new
        const { error } = await supabase.from('user_articles').insert({
          user_id: user.id,
          title: title.trim(),
          summary: content.trim().substring(0, 250) + (content.length > 250 ? '...' : ''),
          content: content.trim(),
          content_source: source,
          difficulty,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: '文章添加成功！' });
      }
      setTitle('');
      setContent('');
      await loadMyArticles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '保存失败';
      setMessage({ type: 'error', text: msg });
    } finally {
      setSaving(false);
    }
  }, [title, content, source, difficulty, user, editingId]);

  // Delete article
  const handleDelete = useCallback(async (id: string) => {
    const { error } = await supabase.from('user_articles').delete().eq('id', id);
    if (!error) {
      setMyArticles(prev => prev.filter(a => a.id !== id));
      if (editingId === id) { setEditingId(null); setTitle(''); setContent(''); }
      // Also remove from IndexedDB cache
      try { await deleteByKey(STORE_NAMES.articles, id); } catch { /* ignore */ }
    }
  }, [editingId]);

  // Edit article
  const handleEdit = useCallback((article: UserArticle) => {
    setEditingId(article.id);
    setTitle(article.title);
    setContent(article.content);
    setSource(article.content_source as ContentSource);
    setDifficulty(article.difficulty as DifficultyLevel);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setTitle('');
    setContent('');
  }, []);

  // OCR
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', 'chs');
      formData.append('isOverlayRequired', 'false');
      formData.append('OCREngine', '2');
      formData.append('isTable', 'true');
      formData.append('scale', 'true');

      const resp = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: { 'apikey': 'helloworld' },
        body: formData,
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.ParsedResults?.[0]?.ParsedText) {
          let text = data.ParsedResults[0].ParsedText;
          text = cleanOCRText(text);
          setContent(prev => prev ? prev + '\n\n' + text : text);
          setMessage({ type: 'success', text: `识别成功！提取了 ${text.length} 个字符` });
        } else {
          setMessage({ type: 'error', text: '未能识别图片中的文字' });
        }
      } else {
        setMessage({ type: 'error', text: 'OCR 服务请求失败' });
      }
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'OCR 失败' });
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="min-h-full p-4 md:p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          {editingId ? '✏️ 编辑文章' : '➕ 添加文章'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          私有文章仅自己可见
        </p>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
          }`}>
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* Title */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">标题</label>
          <input
            type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="文章标题"
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Content */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">内容</label>
          <textarea
            value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="粘贴英文文章内容..." rows={10}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
          />
          <p className="text-xs text-gray-400 mt-1">{content.length} 字符</p>
        </div>

        {/* Image OCR */}
        <div className="mb-4 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <div className="flex items-center gap-3">
            <button onClick={() => fileInputRef.current?.click()} disabled={ocrLoading}
              className="px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50">
              {ocrLoading ? '识别中...' : '📷 从图片识别'}
            </button>
            <span className="text-xs text-gray-400">支持中英文混排图片</span>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </div>

        {/* Settings */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">分类</label>
            <select value={source} onChange={(e) => setSource(e.target.value as ContentSource)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
              {Object.entries(CONTENT_SOURCE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">难度</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="beginner">初级</option>
              <option value="intermediate">中级</option>
              <option value="advanced">高级</option>
            </select>
          </div>
        </div>

        {/* Save / Cancel Buttons */}
        <div className="flex gap-3 mb-8">
          <button onClick={handleSave} disabled={saving || (!title.trim() && !content.trim())}
            className="flex-1 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
            {saving ? '保存中...' : editingId ? '更新文章' : '保存文章'}
          </button>
          {editingId && (
            <button onClick={handleCancelEdit}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
              取消
            </button>
          )}
        </div>

        {/* My Articles List */}
        {myArticles.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">
              我的文章 ({myArticles.length})
            </h2>
            <div className="space-y-2">
              {myArticles.map((article) => (
                <div key={article.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{article.title}</p>
                    <p className="text-xs text-gray-400">
                      {CONTENT_SOURCE_LABELS[article.content_source as ContentSource] || article.content_source} · {new Date(article.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button onClick={() => handleEdit(article)}
                      className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors">
                      编辑
                    </button>
                    <button onClick={() => handleDelete(article.id)}
                      className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AddArticle;
