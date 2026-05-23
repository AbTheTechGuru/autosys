import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button }  from '@/shared/components/ui/Button';
import { Icon }    from '@/shared/components/ui/Icon';
import { Toggle }  from '@/shared/components/ui/Toggle';
import { Spinner } from '@/shared/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { useBlogStore } from '@/store/blogStore';
import { G } from '@/shared/utils/tokens';
import { cn } from '@/shared/utils/cn';

/* ── Helpers ─────────────────────────────────────────────────── */
function toSlug(title) {
  return title.toLowerCase()
    .replace(/['']/g, '').replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80);
}
function calcReadTime(html = '') {
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

const inputCls = `w-full bg-surface-2 border border-surface-4 rounded-[9px] px-3 py-2.5
  text-[13px] text-text-primary outline-none transition-colors
  focus:border-[rgba(200,151,58,.5)] placeholder:text-text-muted`;

function FieldLabel({ label, required, hint }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <label className="text-[11px] font-extrabold text-text-muted uppercase tracking-wider">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {hint && <span className="text-[10.5px] text-text-muted italic">{hint}</span>}
    </div>
  );
}

/* ── Rich text toolbar ───────────────────────────────────────── */
function RichToolbar({ onCommand }) {
  const tools = [
    { cmd:'bold',                label:'B',   style:{ fontWeight:'900' } },
    { cmd:'italic',              label:'I',   style:{ fontStyle:'italic' } },
    { cmd:'underline',           label:'U',   style:{ textDecoration:'underline' } },
    { sep:true },
    { cmd:'h2',                  label:'H2',  style:{ fontWeight:'700', fontSize:'12px' } },
    { cmd:'h3',                  label:'H3',  style:{ fontWeight:'700', fontSize:'11px' } },
    { sep:true },
    { cmd:'insertUnorderedList', label:'• —' },
    { cmd:'insertOrderedList',   label:'1.'  },
    { sep:true },
    { cmd:'createLink',          label:'🔗'  },
    { cmd:'blockquote',          label:'❝'   },
    { cmd:'code',                label:'</>',  style:{ fontFamily:'monospace', fontSize:'11px' } },
  ];

  return (
    <div className="flex flex-wrap gap-0.5 px-3 py-2 border-b border-surface-4 bg-surface-3">
      {tools.map((t, i) =>
        t.sep ? (
          <div key={i} className="w-px h-5 bg-surface-4 mx-1 self-center" />
        ) : (
          <button
            key={i}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onCommand(t.cmd); }}
            title={t.cmd}
            className="px-2 py-1 rounded-[5px] text-[11.5px] text-text-secondary hover:bg-surface-4 hover:text-text-primary transition-colors"
            style={t.style || {}}>
            {t.label}
          </button>
        )
      )}
    </div>
  );
}

/* ── Main Editor ─────────────────────────────────────────────── */
export function BlogPostEditor() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const toast     = useToast();
  const isEditing = Boolean(id);

  const savePost        = useBlogStore((s) => s.savePost);
  const categories      = useBlogStore((s) => s.categories);
  const fetchCategories = useBlogStore((s) => s.fetchCategories);

  const [saving,     setSaving]     = useState(false);
  const [isFetching, setIsFetching] = useState(isEditing);
  const [preview,    setPreview]    = useState(false);
  const [tab,        setTab]        = useState('content');
  const [slugManual, setSlugManual] = useState(isEditing);

  const [form, setForm] = useState({
    title:        '',
    slug:         '',
    content:      '',   // ← single source of truth for content
    excerpt:      '',
    featuredImage:'',
    authorName:   'AutoSys Team',
    authorBio:    '',
    status:       'draft',
    categorySlug: '',
    tags:         '',
    featured:     false,
    metaTitle:    '',
    metaDesc:     '',
  });

  // editorRef is used ONLY to initialize the DOM — content state is kept in form.content
  const editorRef        = useRef(null);
  const contentSyncedRef = useRef(false); // prevents double-init

  /* ── Sync form.content → DOM when editor mounts/re-mounts ── */
  // Called by the editor div's ref callback so it fires whenever the
  // div attaches OR detaches — safe even when tab changes hide the div.
  const editorRefCallback = useCallback((node) => {
    editorRef.current = node;
    if (node && !contentSyncedRef.current) {
      // Set initial HTML once
      node.innerHTML = form.content || '';
      contentSyncedRef.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When form.content changes programmatically (e.g. loaded from API)
  // and the editor is mounted, re-sync the DOM
  useEffect(() => {
    if (editorRef.current && contentSyncedRef.current) {
      // Only update DOM if it differs (avoids cursor-jump during typing)
      if (editorRef.current.innerHTML !== form.content) {
        editorRef.current.innerHTML = form.content || '';
      }
    }
  }, [form.content]);

  /* ── Load existing post ──────────────────────────────────── */
  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      setIsFetching(true);
      try {
        const { adminBlogApi } = await import('@/services/api/index');
        const { data } = await adminBlogApi.getById(id);
        const p = data.post ?? data;
        const content = p.content || '';
        setForm({
          title:        p.title          || '',
          slug:         p.slug           || '',
          content,
          excerpt:      p.excerpt        || '',
          featuredImage:p.featured_image || '',
          authorName:   p.author_name    || 'AutoSys Team',
          authorBio:    p.author_bio     || '',
          status:       p.status         || 'draft',
          categorySlug: p.category_slug  || '',
          tags:         (p.tags || []).join(', '),
          featured:     p.featured       || false,
          metaTitle:    p.meta_title     || '',
          metaDesc:     p.meta_desc      || '',
        });
        // Reset sync flag so editor DOM gets re-initialized with loaded content
        contentSyncedRef.current = false;
      } catch (err) {
        toast(err.response?.data?.message || 'Failed to load post', 'danger');
      } finally {
        setIsFetching(false);
      }
    })();
    fetchCategories();
  }, [id, isEditing, fetchCategories, toast]);

  useEffect(() => {
    if (!isEditing) fetchCategories();
  }, [isEditing, fetchCategories]);

  /* ── Auto slug + meta ───────────────────────────────────── */
  useEffect(() => {
    if (!slugManual && form.title)
      setForm((f) => ({ ...f, slug: toSlug(f.title) }));
  }, [form.title, slugManual]);

  useEffect(() => {
    if (!form.metaTitle && form.title)
      setForm((f) => ({ ...f, metaTitle: `${f.title} | AutoSys Blog` }));
  }, [form.title]);

  useEffect(() => {
    if (!form.metaDesc && form.excerpt)
      setForm((f) => ({ ...f, metaDesc: f.excerpt.slice(0, 160) }));
  }, [form.excerpt]);

  /* ── Toolbar commands ───────────────────────────────────── */
  const handleCommand = (cmd) => {
    // Re-focus editor before executing command so selection is preserved
    editorRef.current?.focus();
    if      (cmd === 'h2')        document.execCommand('formatBlock', false, 'h2');
    else if (cmd === 'h3')        document.execCommand('formatBlock', false, 'h3');
    else if (cmd === 'blockquote')document.execCommand('formatBlock', false, 'blockquote');
    else if (cmd === 'code')      document.execCommand('formatBlock', false, 'pre');
    else if (cmd === 'createLink') {
      const url = prompt('Enter URL:');
      if (url) document.execCommand('createLink', false, url);
    } else {
      document.execCommand(cmd, false, null);
    }
    // Sync DOM → state after command
    if (editorRef.current) {
      setForm((f) => ({ ...f, content: editorRef.current.innerHTML }));
    }
  };

  /* ── Read current content safely ───────────────────────── */
  // Always reads from form.content (state). Falls back to DOM only if state is empty.
  const getContent = () =>
    form.content || editorRef.current?.innerHTML || '';

  /* ── Save ───────────────────────────────────────────────── */
  const handleSave = async (publishStatus = null) => {
    if (!form.title.trim()) { toast('Title is required', 'warning'); return; }
    const content     = getContent();
    const finalStatus = publishStatus || form.status;
    setSaving(true);
    try {
      // Use camelCase keys — backend route destructures camelCase
      // blog.api.js toBackend() also handles the mapping as a safety net
      await savePost(isEditing ? id : null, {
        title:        form.title,
        slug:         form.slug || toSlug(form.title),
        content,
        excerpt:      form.excerpt,
        featuredImage:form.featuredImage,
        authorName:   form.authorName,
        authorBio:    form.authorBio,
        status:       finalStatus,
        categorySlug: form.categorySlug,
        tags:         form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        featured:     form.featured,
        metaTitle:    form.metaTitle,
        metaDesc:     form.metaDesc,
        read_time:    calcReadTime(content),
      });
      toast(finalStatus === 'published' ? '🎉 Post published!' : '✅ Draft saved!');
      navigate('/app/admin/blog');
    } catch (err) {
      toast(err.response?.data?.message || 'Save failed', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target ? e.target.value : e }));

  const readTime = calcReadTime(form.content);

  const TABS = [
    { key:'content',  label:'Content',  icon:'note'     },
    { key:'seo',      label:'SEO',      icon:'globe'    },
    { key:'settings', label:'Settings', icon:'settings' },
  ];

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] px-4 md:px-[22px] pt-[22px] pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="font-display text-[22px] font-bold">
            {isEditing ? 'Edit Post' : 'New Post'}
          </h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">
            {readTime} min read · {form.status === 'published' ? '🟢 Published' : '⚫ Draft'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => setPreview((p) => !p)}>
            <Icon name="eye" size={13} />{preview ? 'Edit' : 'Preview'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleSave('draft')} disabled={saving}>
            {saving ? <Spinner size={13} /> : 'Save Draft'}
          </Button>
          <Button variant="gold" size="sm" onClick={() => handleSave('published')} disabled={saving}>
            {saving
              ? <><Spinner size={13} />Saving…</>
              : <><Icon name="globe" size={13} />Publish</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

        {/* ── Left: editor area ──────────────────────────── */}
        <div>
          {/* Tab bar */}
          <div className="flex gap-1 mb-4 p-1 bg-surface-2 border border-surface-4 rounded-[10px] w-fit">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-bold transition-all',
                  tab === t.key ? 'bg-gold text-[#0A0812]' : 'text-text-muted hover:text-text-primary',
                )}>
                <Icon name={t.icon} size={11} color={tab === t.key ? '#0A0812' : '#4E4B58'} />
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Content tab ─────────────────────────────── */}
          {tab === 'content' && !preview && (
            <div className="space-y-4">
              <div>
                <FieldLabel label="Title" required />
                <input
                  className={inputCls}
                  placeholder="How Nigerian Car Dealers Are Closing 3x More Deals…"
                  value={form.title}
                  onChange={set('title')}
                />
              </div>

              <div>
                <FieldLabel label="Slug" hint="auto-generated" />
                <div className="flex gap-2">
                  <input
                    className={cn(inputCls, 'font-mono text-[12px]')}
                    value={form.slug}
                    onChange={(e) => { setSlugManual(true); set('slug')(e); }}
                    placeholder="my-post-slug"
                  />
                  <Button variant="ghost" size="sm"
                    onClick={() => {
                      setSlugManual(false);
                      setForm((f) => ({ ...f, slug: toSlug(f.title) }));
                    }}>
                    Reset
                  </Button>
                </div>
              </div>

              <div>
                <FieldLabel label="Excerpt" hint="shown on listing page" />
                <textarea
                  className={cn(inputCls, 'resize-none')}
                  rows={3}
                  placeholder="A compelling summary that makes readers click…"
                  value={form.excerpt}
                  onChange={set('excerpt')}
                />
              </div>

              {/* ── Rich text editor ──────────────────── */}
              <div>
                <FieldLabel label="Content" required />
                <div className="bg-surface-2 border border-surface-4 rounded-[10px] overflow-hidden">
                  <RichToolbar onCommand={handleCommand} />
                  {/*
                    KEY FIX: contentEditable div uses a ref CALLBACK (not useRef hook directly)
                    so it fires reliably on mount/unmount as tabs change.
                    Content is synced via onInput → form.content (state) as the single source
                    of truth. We never read editorRef.current.innerHTML on save — we use
                    form.content which is always up-to-date.
                  */}
                  <div
                    ref={editorRefCallback}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) => {
                      // Guard: e.currentTarget can be null if element unmounts during event
                      const html = e.currentTarget?.innerHTML ?? '';
                      setForm((f) => ({ ...f, content: html }));
                    }}
                    onBlur={(e) => {
                      // Extra sync on blur (covers mobile keyboards that fire blur not input)
                      const html = e.currentTarget?.innerHTML ?? '';
                      if (html) setForm((f) => ({ ...f, content: html }));
                    }}
                    className="min-h-[400px] px-4 py-4 text-[13.5px] leading-[1.8] text-text-primary outline-none"
                    style={{ wordBreak:'break-word' }}
                    aria-label="Post content editor"
                    aria-multiline="true"
                    role="textbox"
                  />
                </div>
                <p className="text-[10.5px] text-text-muted mt-1 text-right">
                  {readTime} min read · {form.content.replace(/<[^>]+>/g,'').length} chars
                </p>
              </div>
            </div>
          )}

          {/* ── SEO tab ─────────────────────────────────── */}
          {tab === 'seo' && (
            <div className="space-y-4">
              <div>
                <FieldLabel label="Meta Title" hint="max 60 chars" />
                <input
                  className={inputCls}
                  placeholder="Post Title | AutoSys Blog"
                  value={form.metaTitle}
                  onChange={set('metaTitle')}
                  maxLength={60}
                />
                <p className={cn(
                  'text-[10.5px] mt-1 text-right',
                  form.metaTitle.length > 55 ? 'text-yellow-400' : 'text-text-muted',
                )}>
                  {form.metaTitle.length}/60
                </p>
              </div>

              <div>
                <FieldLabel label="Meta Description" hint="max 160 chars" />
                <textarea
                  className={cn(inputCls, 'resize-none')}
                  rows={3}
                  placeholder="Brief search-engine description…"
                  value={form.metaDesc}
                  onChange={set('metaDesc')}
                  maxLength={160}
                />
                <p className={cn(
                  'text-[10.5px] mt-1 text-right',
                  form.metaDesc.length > 150 ? 'text-yellow-400' : 'text-text-muted',
                )}>
                  {form.metaDesc.length}/160
                </p>
              </div>

              <div>
                <FieldLabel label="Tags" hint="comma separated" />
                <input
                  className={inputCls}
                  placeholder="crm, leads, sales, automation"
                  value={form.tags}
                  onChange={set('tags')}
                />
              </div>

              {/* Google preview */}
              <div className="bg-surface-3 border border-surface-4 rounded-[10px] p-4">
                <p className="text-[10.5px] font-bold text-text-muted uppercase tracking-wider mb-2">
                  Google Preview
                </p>
                <p className="text-[15px] font-bold text-[#8ab4f8]">
                  {form.metaTitle || form.title || 'Post Title | AutoSys Blog'}
                </p>
                <p className="text-[12px] text-[#4ade80]">
                  autosys.app/blog/{form.slug || 'post-slug'}
                </p>
                <p className="text-[12.5px] text-text-secondary mt-1">
                  {form.metaDesc || form.excerpt || 'Post description will appear here…'}
                </p>
              </div>
            </div>
          )}

          {/* ── Settings tab ────────────────────────────── */}
          {tab === 'settings' && (
            <div className="space-y-4">
              <div>
                <FieldLabel label="Author Name" />
                <input
                  className={inputCls}
                  placeholder="AutoSys Team"
                  value={form.authorName}
                  onChange={set('authorName')}
                />
              </div>
              <div>
                <FieldLabel label="Author Bio" />
                <textarea
                  className={cn(inputCls, 'resize-none')}
                  rows={2}
                  placeholder="Brief author bio…"
                  value={form.authorBio}
                  onChange={set('authorBio')}
                />
              </div>
              <div>
                <FieldLabel label="Status" />
                <select className={inputCls} value={form.status} onChange={set('status')}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          )}

          {/* ── Preview mode ─────────────────────────────── */}
          {preview && (
            <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-6">
              <h1 className="font-display text-[28px] font-bold mb-2">
                {form.title || 'Untitled Post'}
              </h1>
              <p className="text-text-muted text-[12px] mb-6">
                {form.authorName} · {readTime} min read
              </p>
              {form.featuredImage && (
                <img
                  src={form.featuredImage}
                  alt="Featured"
                  className="w-full h-[240px] object-cover rounded-[12px] mb-6"
                />
              )}
              <div
                className="prose prose-sm prose-invert max-w-none text-[14px] leading-[1.8]"
                dangerouslySetInnerHTML={{
                  __html: form.content || '<p class="text-text-muted italic">No content yet…</p>',
                }}
              />
            </div>
          )}
        </div>

        {/* ── Right sidebar ──────────────────────────────── */}
        <div className="space-y-4">

          {/* Featured image */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4">
            <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-wider mb-3">
              Featured Image
            </p>
            <input
              className={inputCls}
              placeholder="https://images.unsplash.com/…"
              value={form.featuredImage}
              onChange={set('featuredImage')}
            />
            {form.featuredImage && (
              <img
                src={form.featuredImage}
                alt="Preview"
                className="w-full h-[120px] object-cover rounded-[8px] mt-3 border border-surface-4"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
          </div>

          {/* Category */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4">
            <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-wider mb-3">
              Category
            </p>
            <select className={inputCls} value={form.categorySlug} onChange={set('categorySlug')}>
              <option value="">Select a category</option>
              {(categories.length > 0 ? categories : [
                { slug:'sales-crm',  name:'Sales & CRM'  },
                { slug:'marketing',  name:'Marketing'    },
                { slug:'inventory',  name:'Inventory'    },
                { slug:'technology', name:'Technology'   },
              ]).map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Options */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4 space-y-3">
            <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-wider">
              Options
            </p>
            <div className="flex justify-between items-center">
              <span className="text-[13px] font-semibold">Featured post</span>
              <Toggle
                checked={form.featured}
                onChange={(v) => setForm((f) => ({ ...f, featured: v }))}
                label="Featured"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              variant="gold"
              className="w-full justify-center"
              onClick={() => handleSave('published')}
              disabled={saving}>
              {saving
                ? <><Spinner size={13} />Saving…</>
                : <><Icon name="globe" size={13} />Publish Now</>}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-center"
              onClick={() => handleSave('draft')}
              disabled={saving}>
              Save as Draft
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-center text-text-muted"
              onClick={() => navigate('/app/admin/blog')}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
