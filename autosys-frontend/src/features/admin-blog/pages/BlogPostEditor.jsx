'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button }  from '@/shared/components/ui/Button';
import { Icon }    from '@/shared/components/ui/Icon';
import { Toggle }  from '@/shared/components/ui/Toggle';
import { Spinner } from '@/shared/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { useBlogStore } from '@/store/blogStore';
import { cn } from '@/shared/utils/cn';

/* ── Helpers ────────────────────────────────────────────────── */
function toSlug(title = '') {
  return title.toLowerCase()
    .replace(/['']/g, '').replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80);
}

function calcReadTime(html = '') {
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, '').trim();
}

/* ── Toolbar command executor ───────────────────────────────── */
// Uses execCommand with proper focus management.
// Falls back gracefully on mobile where some commands are unsupported.
function execCmd(cmd, value = null) {
  try {
    document.execCommand(cmd, false, value);
    return true;
  } catch {
    return false;
  }
}

function applyFormat(cmd, editorEl) {
  if (!editorEl) return;
  editorEl.focus();

  switch (cmd) {
    case 'bold':          execCmd('bold');              break;
    case 'italic':        execCmd('italic');            break;
    case 'underline':     execCmd('underline');         break;
    case 'h2':            execCmd('formatBlock', 'h2'); break;
    case 'h3':            execCmd('formatBlock', 'h3'); break;
    case 'blockquote':    execCmd('formatBlock', 'blockquote'); break;
    case 'ul':            execCmd('insertUnorderedList'); break;
    case 'ol':            execCmd('insertOrderedList');   break;
    case 'strikethrough': execCmd('strikeThrough');      break;
    case 'link': {
      const url = prompt('Enter URL (include https://):');
      if (url) execCmd('createLink', url);
      break;
    }
    case 'unlink':  execCmd('unlink');       break;
    case 'hr':      execCmd('insertHTML', '<hr/>'); break;
    case 'removeFormat': execCmd('removeFormat'); break;
    default: break;
  }
}

/* ── Toolbar ────────────────────────────────────────────────── */
const TOOLBAR_GROUPS = [
  [
    { cmd:'bold',         icon:'B',   label:'Bold',        style:{ fontWeight:'900' }           },
    { cmd:'italic',       icon:'I',   label:'Italic',      style:{ fontStyle:'italic' }         },
    { cmd:'underline',    icon:'U',   label:'Underline',   style:{ textDecoration:'underline' } },
    { cmd:'strikethrough',icon:'S̶',   label:'Strikethrough'                                     },
  ],
  [
    { cmd:'h2', icon:'H2', label:'Heading 2', style:{ fontWeight:'800', fontSize:'11px' } },
    { cmd:'h3', icon:'H3', label:'Heading 3', style:{ fontWeight:'700', fontSize:'10px' } },
    { cmd:'blockquote', icon:'❝', label:'Quote' },
  ],
  [
    { cmd:'ul',  icon:'• —', label:'Bullet list'   },
    { cmd:'ol',  icon:'1.',  label:'Numbered list' },
  ],
  [
    { cmd:'link',         icon:'🔗', label:'Add link'      },
    { cmd:'unlink',       icon:'⛓',  label:'Remove link'   },
    { cmd:'hr',           icon:'—',  label:'Divider'       },
    { cmd:'removeFormat', icon:'✕',  label:'Clear format', style:{ color:'#EF4444' } },
  ],
];

function Toolbar({ editorRef, onAfterCommand }) {
  const run = (cmd) => {
    applyFormat(cmd, editorRef.current);
    // After command, sync innerHTML → state
    setTimeout(() => {
      if (editorRef.current) {
        onAfterCommand(editorRef.current.innerHTML);
      }
    }, 10);
  };

  return (
    <div className="flex flex-wrap gap-0.5 p-2 border-b border-surface-4 bg-surface-3 sticky top-0 z-10">
      {TOOLBAR_GROUPS.map((group, gi) => (
        <div key={gi} className="flex gap-0.5 items-center">
          {group.map((t) => (
            <button
              key={t.cmd}
              type="button"
              title={t.label}
              aria-label={t.label}
              onMouseDown={(e) => {
                // Prevent editor from losing focus on desktop
                e.preventDefault();
                run(t.cmd);
              }}
              onTouchEnd={(e) => {
                // Mobile: use touchEnd so keyboard stays up
                e.preventDefault();
                run(t.cmd);
              }}
              className="min-w-[28px] h-7 px-2 rounded-[5px] text-[12px] font-bold text-text-secondary hover:bg-surface-4 hover:text-text-primary active:bg-gold active:text-[#0A0812] transition-colors select-none"
              style={t.style || {}}>
              {t.icon}
            </button>
          ))}
          {gi < TOOLBAR_GROUPS.length - 1 && (
            <div className="w-px h-5 bg-surface-4 mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Input CSS ──────────────────────────────────────────────── */
const inputCls = `w-full bg-surface-2 border border-surface-4 rounded-[9px] px-3 py-2.5
  text-[13px] text-text-primary outline-none transition-colors
  focus:border-[rgba(200,151,58,.5)] placeholder:text-text-muted`;

function FieldLabel({ label, required, hint }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <label className="text-[11px] font-extrabold text-text-muted uppercase tracking-wider">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {hint && <span className="text-[10.5px] text-text-muted italic">{hint}</span>}
    </div>
  );
}

/* ── Main Editor ────────────────────────────────────────────── */
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
  const [isMobile]   = useState(() => /Mobi|Android/i.test(navigator.userAgent));

  const [form, setForm] = useState({
    title:'', slug:'', content:'', excerpt:'',
    featuredImage:'', authorName:'AutoSys Team', authorBio:'',
    status:'draft', categorySlug:'', tags:'',
    featured:false, metaTitle:'', metaDesc:'',
  });

  const editorRef   = useRef(null);
  const initialised = useRef(false);

  // Set form field helper
  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e?.target ? e.target.value : e }));

  // Called by toolbar after every command
  const syncContentFromEditor = useCallback((html) => {
    setForm((f) => ({ ...f, content: html }));
  }, []);

  /* ── Initialise editor DOM once content loads ─────────────── */
  const editorRefCallback = useCallback((node) => {
    editorRef.current = node;
    if (node && !initialised.current && form.content) {
      node.innerHTML = form.content;
      initialised.current = true;
    }
  }, [form.content]);

  // Re-sync DOM when content loads from API (editing existing post)
  useEffect(() => {
    if (editorRef.current && form.content && !initialised.current) {
      editorRef.current.innerHTML = form.content;
      initialised.current = true;
    }
  }, [form.content]);

  /* ── Load existing post ───────────────────────────────────── */
  useEffect(() => {
    fetchCategories();
    if (!isEditing) return;

    (async () => {
      setIsFetching(true);
      try {
        const { adminBlogApi } = await import('@/services/api/index');
        const { data } = await adminBlogApi.getById(id);
        const p = data.post ?? data;
        initialised.current = false; // allow re-init with loaded content
        setForm({
          title:         p.title          || '',
          slug:          p.slug           || '',
          content:       p.content        || '',
          excerpt:       p.excerpt        || '',
          featuredImage: p.featured_image || '',
          authorName:    p.author_name    || 'AutoSys Team',
          authorBio:     p.author_bio     || '',
          status:        p.status         || 'draft',
          categorySlug:  p.category_slug  || '',
          tags:          (p.tags || []).join(', '),
          featured:      p.featured       || false,
          metaTitle:     p.meta_title     || '',
          metaDesc:      p.meta_desc      || '',
        });
      } catch (err) {
        toast(err.response?.data?.message || 'Failed to load post', 'danger');
      } finally {
        setIsFetching(false);
      }
    })();
  }, [id, isEditing, fetchCategories, toast]);

  /* ── Auto-generate slug ───────────────────────────────────── */
  useEffect(() => {
    if (!slugManual && form.title)
      setForm((f) => ({ ...f, slug: toSlug(f.title) }));
  }, [form.title, slugManual]);

  /* ── Get content safely ───────────────────────────────────── */
  const getContent = () =>
    editorRef.current?.innerHTML || form.content || '';

  /* ── Save ─────────────────────────────────────────────────── */
  const handleSave = async (publishStatus = null) => {
    if (!form.title.trim()) { toast('Title is required', 'warning'); return; }

    // Always sync from DOM before saving
    const content     = getContent();
    const finalStatus = publishStatus || form.status;

    if (!content || !stripHtml(content)) {
      toast('Content cannot be empty', 'warning');
      return;
    }

    setSaving(true);
    try {
      // All keys are camelCase — matches what backend POST/PUT destructures exactly
      await savePost(isEditing ? id : null, {
        title:         form.title,
        slug:          form.slug || toSlug(form.title),
        content,
        excerpt:       form.excerpt,
        featuredImage: form.featuredImage,
        authorName:    form.authorName,
        authorBio:     form.authorBio,
        status:        finalStatus,
        categorySlug:  form.categorySlug,
        tags:          form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        featured:      form.featured,
        metaTitle:     form.metaTitle || `${form.title} | AutoSys Blog`,
        metaDesc:      form.metaDesc  || form.excerpt || '',
        read_time:     calcReadTime(content),
      });
      toast(finalStatus === 'published' ? '🎉 Post published!' : '✅ Draft saved!');
      navigate('/app/admin/blog');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Save failed';
      // Surface 403 clearly so user knows it's a permissions issue
      if (err.response?.status === 403) {
        toast('Permission denied — only Admin/Owner roles can create blog posts', 'danger');
      } else {
        toast(msg, 'danger');
      }
    } finally {
      setSaving(false);
    }
  };

  const readTime = calcReadTime(form.content);

  const TABS = [
    { key:'content',  label:'Content',  icon:'note'    },
    { key:'seo',      label:'SEO',      icon:'globe'   },
    { key:'settings', label:'Settings', icon:'settings'},
  ];

  const CATEGORY_FALLBACK = [
    { slug:'sales-crm',  name:'Sales & CRM'  },
    { slug:'marketing',  name:'Marketing'    },
    { slug:'inventory',  name:'Inventory'    },
    { slug:'technology', name:'Technology'   },
    { slug:'guides',     name:'Guides'       },
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
          <Button variant="ghost" size="sm"
            onClick={() => { syncContentFromEditor(getContent()); handleSave('draft'); }}
            disabled={saving}>
            {saving ? <Spinner size={13} /> : 'Save Draft'}
          </Button>
          <Button variant="gold" size="sm"
            onClick={() => { syncContentFromEditor(getContent()); handleSave('published'); }}
            disabled={saving}>
            {saving ? <><Spinner size={13} />Saving…</> : <><Icon name="globe" size={13} />Publish</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

        {/* Left column */}
        <div>
          {/* Tab bar */}
          <div className="flex gap-1 mb-4 p-1 bg-surface-2 border border-surface-4 rounded-[10px] w-fit">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-bold transition-all',
                  tab === t.key ? 'bg-gold text-[#0A0812]' : 'text-text-muted hover:text-text-primary',
                )}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── CONTENT TAB ─────────────────────────────── */}
          {tab === 'content' && !preview && (
            <div className="space-y-4">
              <div>
                <FieldLabel label="Title" required />
                <input className={inputCls}
                  placeholder="e.g. How to Close 3x More Car Deals in Lagos"
                  value={form.title} onChange={set('title')} />
              </div>

              <div>
                <FieldLabel label="Slug" hint="auto-generated" />
                <div className="flex gap-2">
                  <input className={cn(inputCls, 'font-mono text-[12px]')}
                    value={form.slug}
                    onChange={(e) => { setSlugManual(true); set('slug')(e); }}
                    placeholder="my-post-url" />
                  <Button variant="ghost" size="sm"
                    onClick={() => { setSlugManual(false); setForm((f) => ({ ...f, slug: toSlug(f.title) })); }}>
                    Reset
                  </Button>
                </div>
              </div>

              <div>
                <FieldLabel label="Excerpt" hint="shown in listing cards" />
                <textarea className={cn(inputCls, 'resize-none')} rows={2}
                  placeholder="Brief summary shown on the blog listing page…"
                  value={form.excerpt} onChange={set('excerpt')} />
              </div>

              {/* ── EDITOR ────────────────────────────────── */}
              <div>
                <FieldLabel label="Content" required />
                <div className="bg-surface-2 border border-surface-4 rounded-[10px] overflow-hidden">
                  <Toolbar editorRef={editorRef} onAfterCommand={syncContentFromEditor} />

                  {/*
                    Mobile uses a plain textarea — contentEditable is unreliable
                    on Android (caret jumps, toolbar commands fail silently).
                    Desktop uses contentEditable with rich formatting.
                  */}
                  {isMobile ? (
                    <textarea
                      className="w-full min-h-[360px] px-4 py-4 text-[13px] text-text-primary bg-transparent outline-none resize-none leading-[1.8] placeholder:text-text-muted"
                      placeholder="Write your post content here…"
                      value={stripHtml(form.content)}
                      onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    />
                  ) : (
                    <div
                      ref={editorRefCallback}
                      contentEditable
                      suppressContentEditableWarning
                      spellCheck
                      className="min-h-[400px] px-4 py-4 text-[13.5px] leading-[1.85] text-text-primary outline-none"
                      style={{ wordBreak:'break-word', whiteSpace:'pre-wrap' }}
                      aria-label="Post content editor"
                      aria-multiline="true"
                      role="textbox"
                      onInput={(e) => {
                        const html = e.currentTarget?.innerHTML ?? '';
                        setForm((f) => ({ ...f, content: html }));
                      }}
                      onBlur={(e) => {
                        const html = e.currentTarget?.innerHTML ?? '';
                        if (html) setForm((f) => ({ ...f, content: html }));
                      }}
                      data-placeholder="Write your post content here…"
                    />
                  )}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10.5px] text-text-muted">
                    {isMobile ? '📱 Mobile mode — plain text' : '🖥 Rich text mode'}
                  </span>
                  <span className="text-[10.5px] text-text-muted">
                    {readTime} min read · {stripHtml(form.content).length} chars
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── SEO TAB ─────────────────────────────────── */}
          {tab === 'seo' && (
            <div className="space-y-4">
              <div>
                <FieldLabel label="Meta Title" hint="max 60 chars" />
                <input className={inputCls}
                  placeholder={`${form.title || 'Post Title'} | AutoSys Blog`}
                  value={form.metaTitle} onChange={set('metaTitle')} maxLength={60} />
                <p className={cn('text-[10.5px] mt-1 text-right',
                  form.metaTitle.length > 55 ? 'text-yellow-400' : 'text-text-muted')}>
                  {form.metaTitle.length}/60
                </p>
              </div>
              <div>
                <FieldLabel label="Meta Description" hint="max 160 chars" />
                <textarea className={cn(inputCls, 'resize-none')} rows={3}
                  placeholder="Brief description for Google search results…"
                  value={form.metaDesc} onChange={set('metaDesc')} maxLength={160} />
                <p className={cn('text-[10.5px] mt-1 text-right',
                  form.metaDesc.length > 150 ? 'text-yellow-400' : 'text-text-muted')}>
                  {form.metaDesc.length}/160
                </p>
              </div>
              <div>
                <FieldLabel label="Tags" hint="comma separated" />
                <input className={inputCls}
                  placeholder="crm, leads, sales, automation"
                  value={form.tags} onChange={set('tags')} />
              </div>
              {/* Google preview */}
              <div className="bg-surface-3 border border-surface-4 rounded-[10px] p-4">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Google Preview</p>
                <p className="text-[15px] font-bold text-[#8ab4f8]">
                  {form.metaTitle || form.title || 'Post Title | AutoSys Blog'}
                </p>
                <p className="text-[12px] text-[#4ade80]">
                  autosys.ng/blog/{form.slug || 'post-slug'}
                </p>
                <p className="text-[12.5px] text-text-secondary mt-1">
                  {form.metaDesc || form.excerpt || 'Post description here…'}
                </p>
              </div>
            </div>
          )}

          {/* ── SETTINGS TAB ────────────────────────────── */}
          {tab === 'settings' && (
            <div className="space-y-4">
              <div>
                <FieldLabel label="Author Name" />
                <input className={inputCls} placeholder="AutoSys Team"
                  value={form.authorName} onChange={set('authorName')} />
              </div>
              <div>
                <FieldLabel label="Author Bio" />
                <textarea className={cn(inputCls, 'resize-none')} rows={2}
                  placeholder="Brief bio shown below the post…"
                  value={form.authorBio} onChange={set('authorBio')} />
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

          {/* ── PREVIEW MODE ────────────────────────────── */}
          {preview && (
            <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-6">
              <h1 className="font-display text-[28px] font-bold mb-2">
                {form.title || 'Untitled Post'}
              </h1>
              <p className="text-text-muted text-[12px] mb-6">
                {form.authorName} · {readTime} min read
              </p>
              {form.featuredImage && (
                <img src={form.featuredImage} alt="Featured"
                  className="w-full h-[240px] object-cover rounded-[12px] mb-6"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              )}
              <div
                className="prose prose-sm prose-invert max-w-none text-[14px] leading-[1.85]"
                dangerouslySetInnerHTML={{
                  __html: form.content || '<p class="text-text-muted italic">No content yet…</p>',
                }}
              />
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ─────────────────────────────── */}
        <div className="space-y-4">

          {/* Featured image */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4">
            <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-wider mb-3">
              Featured Image URL
            </p>
            <input className={inputCls}
              placeholder="https://images.unsplash.com/…"
              value={form.featuredImage} onChange={set('featuredImage')} />
            {form.featuredImage && (
              <img src={form.featuredImage} alt="Preview"
                className="w-full h-[120px] object-cover rounded-[8px] mt-3 border border-surface-4"
                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            )}
          </div>

          {/* Category */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4">
            <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-wider mb-3">
              Category
            </p>
            <select className={inputCls} value={form.categorySlug} onChange={set('categorySlug')}>
              <option value="">Select category</option>
              {(categories.length > 0 ? categories : CATEGORY_FALLBACK).map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Options */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4 space-y-3">
            <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-wider">Options</p>
            <div className="flex justify-between items-center">
              <span className="text-[13px] font-semibold">Featured post</span>
              <Toggle checked={form.featured}
                onChange={(v) => setForm((f) => ({ ...f, featured: v }))} label="Featured" />
            </div>
          </div>

          {/* Save buttons */}
          <div className="flex flex-col gap-2">
            <Button variant="gold" className="w-full justify-center" disabled={saving}
              onClick={() => { syncContentFromEditor(getContent()); handleSave('published'); }}>
              {saving ? <><Spinner size={13} />Saving…</> : <><Icon name="globe" size={13} />Publish Now</>}
            </Button>
            <Button variant="ghost" className="w-full justify-center" disabled={saving}
              onClick={() => { syncContentFromEditor(getContent()); handleSave('draft'); }}>
              Save as Draft
            </Button>
            <Button variant="ghost" className="w-full justify-center text-text-muted"
              onClick={() => navigate('/app/admin/blog')}>
              Cancel
            </Button>
          </div>

          {/* Role warning — shown if user might not be admin */}
          <div className="bg-surface-3 border border-surface-4 rounded-[10px] p-3 text-[11.5px] text-text-muted">
            <p className="font-bold mb-1">⚠️ Admin access required</p>
            <p>Your account must have <strong>Owner</strong>, <strong>Admin</strong>, or <strong>Superadmin</strong> role to create or edit posts.</p>
            <p className="mt-1">If saving fails with a permission error, ask your platform admin to update your role in the Users table.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
