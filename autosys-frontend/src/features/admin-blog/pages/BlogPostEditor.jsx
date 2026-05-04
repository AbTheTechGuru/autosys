import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Button }  from '@/shared/components/ui/Button';
import { Icon }    from '@/shared/components/ui/Icon';
import { Toggle }  from '@/shared/components/ui/Toggle';
import { useToast } from '@/context/ToastContext';
import { G }       from '@/shared/utils/tokens';
import { DEMO_POSTS, DEMO_CATEGORIES } from '@/store/blogStore';

/* ── Slug generator ──────────────────────────────────────────── */
function toSlug(title) {
  return title.toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

/* ── Auto read time ──────────────────────────────────────────── */
function calcReadTime(html) {
  const text  = html.replace(/<[^>]+>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/* ── Field wrapper ───────────────────────────────────────────── */
function Field({ label, required, hint, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-[11px] font-extrabold text-text-muted uppercase tracking-wider">
          {label}{required && <span className="text-red-400 ml-1">*</span>}
        </label>
        {hint && <span className="text-[10.5px] text-text-muted italic">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const inputCls = `w-full bg-surface-2 border border-surface-4 rounded-[9px] px-3 py-2.5 text-[13px] text-text-primary outline-none transition-colors focus:border-[rgba(200,151,58,.5)] placeholder:text-text-muted`;

/* ── Rich Text Toolbar ───────────────────────────────────────── */
function RichToolbar({ onFormat }) {
  const tools = [
    { cmd:'bold',         icon:'B',    label:'Bold',       style:{ fontWeight:'900' } },
    { cmd:'italic',       icon:'I',    label:'Italic',     style:{ fontStyle:'italic' } },
    { cmd:'underline',    icon:'U',    label:'Underline',  style:{ textDecoration:'underline' } },
    { sep: true },
    { cmd:'h2',           icon:'H2',   label:'Heading 2',  style:{ fontWeight:'700', fontSize:'12px' } },
    { cmd:'h3',           icon:'H3',   label:'Heading 3',  style:{ fontWeight:'700', fontSize:'11px' } },
    { sep: true },
    { cmd:'insertUnorderedList', icon:'• —', label:'Bullet list' },
    { cmd:'insertOrderedList',   icon:'1.',  label:'Numbered list' },
    { sep: true },
    { cmd:'createLink',   icon:'🔗',   label:'Insert link' },
    { cmd:'insertImage',  icon:'🖼',   label:'Insert image URL' },
    { sep: true },
    { cmd:'blockquote',   icon:'❝',    label:'Blockquote' },
    { cmd:'code',         icon:'</>',  label:'Code block', style:{ fontFamily:'monospace', fontSize:'11px' } },
  ];

  const run = (cmd) => {
    if (cmd === 'h2') {
      document.execCommand('formatBlock', false, 'h2');
    } else if (cmd === 'h3') {
      document.execCommand('formatBlock', false, 'h3');
    } else if (cmd === 'blockquote') {
      document.execCommand('formatBlock', false, 'blockquote');
    } else if (cmd === 'code') {
      document.execCommand('formatBlock', false, 'pre');
    } else if (cmd === 'createLink') {
      const url = prompt('Enter URL:');
      if (url) document.execCommand('createLink', false, url);
    } else if (cmd === 'insertImage') {
      const url = prompt('Enter image URL:');
      if (url) document.execCommand('insertImage', false, url);
    } else {
      document.execCommand(cmd, false, null);
    }
    onFormat?.();
  };

  return (
    <div className="flex flex-wrap gap-[2px] p-2 border-b border-surface-4" style={{ background: G.s3 }}>
      {tools.map((t, i) =>
        t.sep ? (
          <div key={i} className="w-px bg-surface-5 mx-1 self-stretch" />
        ) : (
          <button
            key={t.cmd}
            type="button"
            title={t.label}
            onMouseDown={(e) => { e.preventDefault(); run(t.cmd); }}
            className="px-[8px] py-[4px] rounded-[6px] text-[12px] font-bold text-text-secondary hover:text-text-primary hover:bg-surface-4 transition-colors min-w-[28px] text-center"
            style={t.style || {}}
          >
            {t.icon}
          </button>
        )
      )}
    </div>
  );
}

/* ── Rich Text Editor (contentEditable) ──────────────────────── */
function RichEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const isInit    = useRef(false);

  // Set initial content once
  useEffect(() => {
    if (editorRef.current && !isInit.current && value) {
      editorRef.current.innerHTML = value;
      isInit.current = true;
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  return (
    <div className="border border-surface-4 rounded-[10px] overflow-hidden focus-within:border-[rgba(200,151,58,.4)] transition-colors">
      <RichToolbar onFormat={handleInput} />
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className="min-h-[400px] max-h-[600px] overflow-y-auto p-5 outline-none text-[14px] leading-[1.8] text-text-secondary"
        style={{ background: G.s2 }}
        data-placeholder="Start writing your article here… Use the toolbar above to format text, add headings, lists, links, and images."
      />
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #4E4B58;
          pointer-events: none;
        }
        [contenteditable] h2 { color:#F0EDE2; font-size:22px; font-weight:700; margin:1.5em 0 0.5em; font-family:'Domine',serif; }
        [contenteditable] h3 { color:#E2B96A; font-size:18px; font-weight:700; margin:1.2em 0 0.4em; font-family:'Domine',serif; }
        [contenteditable] blockquote { border-left:3px solid #C8973A; padding:0.8em 1.2em; margin:1.2em 0; background:rgba(200,151,58,.06); border-radius:0 8px 8px 0; color:#E2B96A; font-style:italic; }
        [contenteditable] pre { background:#0E0E16; border:1px solid #21212E; border-radius:8px; padding:1em; font-family:'JetBrains Mono',monospace; font-size:13px; color:#F0EDE2; margin:1em 0; overflow-x:auto; }
        [contenteditable] a { color:#C8973A; text-decoration:underline; }
        [contenteditable] ul { margin:0.8em 0 0.8em 1.5em; list-style:disc; }
        [contenteditable] ol { margin:0.8em 0 0.8em 1.5em; list-style:decimal; }
        [contenteditable] li { margin-bottom:0.4em; }
        [contenteditable] strong, [contenteditable] b { color:#F0EDE2; font-weight:700; }
        [contenteditable] img { max-width:100%; border-radius:8px; margin:1em 0; }
      `}</style>
    </div>
  );
}

/* ── SEO Preview ─────────────────────────────────────────────── */
function SeoPreview({ title, desc, slug }) {
  const url = `autosys.ng/blog/${slug || 'your-post-slug'}`;
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[12px] p-4">
      <p className="text-[10.5px] font-extrabold uppercase tracking-[2px] mb-3" style={{ color: G.g }}>
        GOOGLE PREVIEW
      </p>
      <div className="bg-white rounded-[8px] p-4 shadow-sm">
        <p className="text-[12px] text-[#202124] mb-[2px] truncate" style={{ fontFamily:'Arial,sans-serif' }}>
          {url}
        </p>
        <p className="text-[18px] text-[#1a0dab] font-medium mb-1 leading-[1.3] line-clamp-2" style={{ fontFamily:'Arial,sans-serif' }}>
          {title || 'Your Post Title | AutoSys Blog'}
        </p>
        <p className="text-[13px] text-[#4d5156] leading-[1.5] line-clamp-2" style={{ fontFamily:'Arial,sans-serif' }}>
          {desc || 'Your meta description will appear here. Aim for 120-160 characters for best results in Google search.'}
        </p>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1 h-1.5 rounded-full" style={{ background: G.s4 }}>
          <div className="h-full rounded-full transition-all"
            style={{ width:`${Math.min(100, Math.round(((desc||'').length / 160) * 100))}%`,
              background: (desc||'').length > 160 ? G.er : (desc||'').length > 100 ? G.ok : G.wa }} />
        </div>
        <span className="text-[10.5px] text-text-muted whitespace-nowrap">
          {(desc||'').length}/160 chars
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/* Blog Post Editor                                              */
/* ══════════════════════════════════════════════════════════════ */
export function BlogPostEditor() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const toast     = useToast();
  const isEditing = Boolean(id);

  // Find existing post when editing
  const existing = isEditing ? DEMO_POSTS.find((p) => p.id === id) : null;

  const [saving,  setSaving]  = useState(false);
  const [preview, setPreview] = useState(false);
  const [tab,     setTab]     = useState('content');  // content | seo | settings

  // Form state
  const [form, setForm] = useState({
    title:         existing?.title         || '',
    slug:          existing?.slug          || '',
    content:       existing?.content       || '',
    excerpt:       existing?.excerpt       || '',
    featuredImage: existing?.featured_image || '',
    authorName:    existing?.author_name   || 'AutoSys Team',
    authorBio:     existing?.author_bio    || '',
    status:        existing?.status        || 'draft',
    categorySlug:  existing?.category_slug || '',
    tags:          (existing?.tags || []).join(', '),
    featured:      existing?.featured      || false,
    metaTitle:     existing?.meta_title    || '',
    metaDesc:      existing?.meta_desc     || '',
  });

  const [slugManual, setSlugManual] = useState(isEditing);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManual && form.title) {
      setForm((f) => ({ ...f, slug: toSlug(f.title) }));
    }
  }, [form.title, slugManual]);

  // Auto-generate meta title
  useEffect(() => {
    if (!form.metaTitle && form.title) {
      setForm((f) => ({ ...f, metaTitle: `${f.title} | AutoSys Blog` }));
    }
  }, [form.title]);

  // Auto-generate meta desc from excerpt
  useEffect(() => {
    if (!form.metaDesc && form.excerpt) {
      setForm((f) => ({ ...f, metaDesc: f.excerpt.slice(0, 160) }));
    }
  }, [form.excerpt]);

  const readTime = calcReadTime(form.content);

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target ? e.target.value : e }));

  const handleSave = async (publishStatus = null) => {
    if (!form.title) { toast('Title is required'); return; }
    setSaving(true);

    const finalStatus = publishStatus || form.status;
    await new Promise((r) => setTimeout(r, 600)); // Simulate API call

    toast(finalStatus === 'published'
      ? '🎉 Post published successfully!'
      : '✅ Draft saved!'
    );
    setSaving(false);
    navigate('/app/admin/blog');
  };

  const TABS = [
    { key:'content',  label:'Content',  icon:'note'     },
    { key:'seo',      label:'SEO',      icon:'globe'     },
    { key:'settings', label:'Settings', icon:'settings'  },
  ];

  return (
    <div className="max-w-[1400px] px-4 md:px-[22px] pt-[22px] pb-16">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/app/admin/blog" className="text-text-muted hover:text-gold transition-colors">
            <Icon name="arr" size={16} color="currentColor" className="rotate-180" />
          </Link>
          <div>
            <h2 className="font-display text-[20px] font-bold">
              {isEditing ? 'Edit Post' : 'New Post'}
            </h2>
            <p className="text-text-muted text-[12px] mt-[1px]">
              {form.status === 'published' ? '🟢 Published' : '🟡 Draft'} · {readTime} min read · {form.slug || 'no-slug-yet'}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => setPreview(!preview)}>
            <Icon name="eye" size={13} color={G.bl} />{preview ? 'Edit' : 'Preview'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleSave('draft')} disabled={saving}>
            Save Draft
          </Button>
          <Button variant="gold" size="md" onClick={() => handleSave('published')} disabled={saving}>
            {saving ? 'Saving…' : isEditing ? '✓ Update' : '🚀 Publish'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-5">
        {/* ── Main Editor ────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Tab bar */}
          <div className="flex gap-1 p-1 rounded-[10px] border border-surface-4 w-fit" style={{ background: G.s2 }}>
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="flex items-center gap-1.5 px-4 py-[6px] rounded-[8px] text-[12.5px] font-bold transition-all"
                style={tab===t.key ? { background:G.g, color:G.bg } : { color:G.t1 }}>
                <Icon name={t.icon} size={13} color={tab===t.key ? G.bg : G.t1} />
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Content Tab ──────────────────────────────────── */}
          {tab === 'content' && (
            <div className="space-y-5">
              {/* Title */}
              <Field label="Post Title" required>
                <input
                  value={form.title}
                  onChange={set('title')}
                  placeholder="Write an engaging headline that makes people click…"
                  className={`${inputCls} text-[18px] font-bold`}
                />
              </Field>

              {/* Slug */}
              <Field label="URL Slug" hint="auto-generated from title">
                <div className="flex gap-2 items-center">
                  <span className="text-[12px] text-text-muted whitespace-nowrap">autosys.ng/blog/</span>
                  <input
                    value={form.slug}
                    onChange={(e) => { setSlugManual(true); setForm((f) => ({ ...f, slug: toSlug(e.target.value) })); }}
                    placeholder="your-post-url-slug"
                    className={`${inputCls} flex-1 font-mono text-[12.5px]`}
                  />
                  {slugManual && (
                    <Button variant="ghost" size="xs" onClick={() => { setSlugManual(false); setForm((f) => ({ ...f, slug: toSlug(f.title) })); }}>
                      Reset
                    </Button>
                  )}
                </div>
              </Field>

              {/* Excerpt */}
              <Field label="Excerpt" hint="shown on blog listing + SEO description">
                <textarea
                  value={form.excerpt}
                  onChange={set('excerpt')}
                  rows={3}
                  placeholder="A compelling 1-2 sentence summary that makes readers want to click…"
                  className={inputCls}
                />
                <p className="text-[10.5px] text-text-muted text-right">{form.excerpt.length}/300 chars</p>
              </Field>

              {/* Featured Image */}
              <Field label="Featured Image URL">
                <input
                  value={form.featuredImage}
                  onChange={set('featuredImage')}
                  placeholder="https://images.unsplash.com/photo-… or your CDN URL"
                  className={inputCls}
                />
                {form.featuredImage && (
                  <img src={form.featuredImage} alt="preview"
                    className="mt-2 h-[140px] w-full object-cover rounded-[8px] border border-surface-4" />
                )}
              </Field>

              {/* Rich Content Editor */}
              <Field label="Content" required>
                <RichEditor value={form.content} onChange={set('content')} />
                <div className="flex justify-between text-[10.5px] text-text-muted mt-1">
                  <span>{form.content.replace(/<[^>]+>/g,' ').trim().split(/\s+/).filter(Boolean).length} words</span>
                  <span>~{readTime} min read</span>
                </div>
              </Field>
            </div>
          )}

          {/* ── SEO Tab ──────────────────────────────────────── */}
          {tab === 'seo' && (
            <div className="space-y-5">
              <SeoPreview title={form.metaTitle} desc={form.metaDesc} slug={form.slug} />

              <Field label="SEO Title" hint="Recommended: 50-60 chars">
                <input value={form.metaTitle} onChange={set('metaTitle')} className={inputCls}
                  placeholder="Post Title | AutoSys Blog" />
                <p className="text-[10.5px] text-text-muted text-right">{form.metaTitle.length}/60</p>
              </Field>

              <Field label="Meta Description" hint="120-160 chars for best results">
                <textarea value={form.metaDesc} onChange={set('metaDesc')} rows={3}
                  className={inputCls} placeholder="Compelling summary for Google search results…" />
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: G.s4 }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width:`${Math.min(100,Math.round((form.metaDesc.length/160)*100))}%`,
                        background: form.metaDesc.length>160 ? G.er : form.metaDesc.length>100 ? G.ok : G.wa }} />
                  </div>
                  <span className="text-[10.5px] text-text-muted">{form.metaDesc.length}/160</span>
                </div>
              </Field>

              {/* SEO checklist */}
              <div className="bg-surface-2 border border-surface-4 rounded-[12px] p-4">
                <p className="text-[10.5px] font-extrabold uppercase tracking-[2px] mb-3" style={{ color: G.g }}>
                  SEO CHECKLIST
                </p>
                {[
                  { label: 'Title is set',           ok: form.title.length > 10 },
                  { label: 'Slug is URL-friendly',   ok: /^[a-z0-9-]+$/.test(form.slug) },
                  { label: 'Excerpt is set',         ok: form.excerpt.length > 50 },
                  { label: 'Meta description',       ok: form.metaDesc.length >= 120 && form.metaDesc.length <= 160 },
                  { label: 'Featured image set',     ok: form.featuredImage.length > 0 },
                  { label: 'Content has H2 headings', ok: form.content.includes('<h2') },
                  { label: 'Category assigned',      ok: form.categorySlug.length > 0 },
                  { label: 'Tags added',             ok: form.tags.length > 0 },
                ].map(({ label, ok }) => (
                  <div key={label} className="flex items-center gap-2 py-[5px]">
                    <span className="text-[13px]">{ok ? '✅' : '⭕'}</span>
                    <span className="text-[12.5px]" style={{ color: ok ? G.ok : G.t1 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Settings Tab ──────────────────────────────────── */}
          {tab === 'settings' && (
            <div className="space-y-5">
              <Field label="Author Name">
                <input value={form.authorName} onChange={set('authorName')} className={inputCls} />
              </Field>

              <Field label="Author Bio">
                <textarea value={form.authorBio} onChange={set('authorBio')} rows={2}
                  className={inputCls} placeholder="Short bio shown at the end of the article…" />
              </Field>

              <div className="flex items-center justify-between p-4 bg-surface-2 border border-surface-4 rounded-[12px]">
                <div>
                  <p className="text-[13px] font-bold">Featured Post</p>
                  <p className="text-[11.5px] text-text-muted">Show in featured section and landing page blog widget</p>
                </div>
                <Toggle checked={form.featured} onChange={(v) => setForm((f) => ({ ...f, featured: v }))} />
              </div>

              <div className="p-4 bg-surface-2 border border-surface-4 rounded-[12px] space-y-3">
                <p className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-text-muted">Post Status</p>
                {['draft','published'].map((s) => (
                  <label key={s} className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="status" value={s}
                      checked={form.status === s}
                      onChange={() => setForm((f) => ({ ...f, status: s }))}
                      className="accent-gold" />
                    <div>
                      <p className="text-[13px] font-bold capitalize">{s}</p>
                      <p className="text-[11.5px] text-text-muted">
                        {s==='draft' ? 'Only visible to admins' : 'Live on the blog'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ────────────────────────────────────────── */}
        <div className="w-full xl:w-[280px] shrink-0 space-y-4">

          {/* Publish box */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4 space-y-4">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[2px]" style={{ color: G.g }}>
              PUBLISH
            </p>

            <div className="space-y-2">
              <Button variant="gold" className="w-full" onClick={() => handleSave('published')} disabled={saving}>
                {saving ? 'Publishing…' : '🚀 Publish Now'}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => handleSave('draft')} disabled={saving}>
                Save as Draft
              </Button>
            </div>

            <div className="border-t border-surface-4 pt-3 space-y-1.5 text-[12px]">
              <div className="flex justify-between">
                <span className="text-text-muted">Status</span>
                <span className="font-bold capitalize"
                  style={{ color: form.status==='published' ? G.ok : G.wa }}>
                  {form.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Read time</span>
                <span className="font-bold">{readTime} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Word count</span>
                <span className="font-bold">
                  {form.content.replace(/<[^>]+>/g,' ').trim().split(/\s+/).filter(Boolean).length}
                </span>
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4 space-y-3">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[2px]" style={{ color: G.g }}>
              CATEGORY
            </p>
            <div className="space-y-1.5">
              {DEMO_CATEGORIES.map((cat) => (
                <label key={cat.slug} className="flex items-center gap-2 cursor-pointer py-[3px]">
                  <input type="radio" name="category" value={cat.slug}
                    checked={form.categorySlug === cat.slug}
                    onChange={() => setForm((f) => ({ ...f, categorySlug: cat.slug }))}
                    className="accent-gold" />
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.color }} />
                  <span className="text-[12.5px] text-text-secondary">{cat.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4 space-y-3">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[2px]" style={{ color: G.g }}>
              TAGS
            </p>
            <input
              value={form.tags}
              onChange={set('tags')}
              placeholder="crm, leads, whatsapp, nigeria"
              className={inputCls}
            />
            <p className="text-[10.5px] text-text-muted">Comma-separated tags</p>
            {form.tags && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                  <span key={tag} className="text-[10.5px] font-bold px-[7px] py-[3px] rounded-[5px]"
                    style={{ background:'rgba(200,151,58,.1)', color:G.g, border:`1px solid rgba(200,151,58,.25)` }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4 space-y-2">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[2px] mb-2" style={{ color: G.g }}>
              WRITING TIPS
            </p>
            {[
              'Start with a strong hook in the first paragraph',
              'Use H2 headings every 300-400 words',
              'Include at least 1 real statistic or number',
              'End with a clear CTA for the reader',
              'Aim for 800-1500 words for SEO impact',
            ].map((tip) => (
              <div key={tip} className="flex items-start gap-2">
                <span className="text-[10px] mt-[3px]" style={{ color: G.g }}>●</span>
                <p className="text-[11.5px] text-text-muted leading-[1.5]">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
