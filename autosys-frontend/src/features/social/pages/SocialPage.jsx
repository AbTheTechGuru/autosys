import { useState, useEffect, useCallback } from 'react';
import { Icon }    from '@/shared/components/ui/Icon';
import { Button }  from '@/shared/components/ui/Button';
import { Spinner } from '@/shared/components/ui/Spinner';
import { cn }      from '@/shared/utils/cn';
import { useToast } from '@/context/ToastContext';
import { socialApi } from '@/services/api';

/* ── Constants ─────────────────────────────────────────────── */
const PLATFORMS = [
  { key:'facebook',  label:'Facebook',  icon:'📘', color:'#1877F2' },
  { key:'instagram', label:'Instagram', icon:'📸', color:'#E1306C' },
  { key:'tiktok',    label:'TikTok',    icon:'🎵', color:'#010101' },
];

const STATUS_COLORS = {
  published: '#16A34A',
  scheduled: '#F59E0B',
  failed:    '#EF4444',
  draft:     '#6B7280',
  pending:   '#F59E0B',
};

const TEMPLATES = [
  { label:'New Arrival',   text:'🚗 Just arrived! {{year}} {{brand}} {{model}} — excellent condition. DM us now! #AutoSys #CarDealer' },
  { label:'Weekend Deal',  text:'💰 Weekend special! Unbeatable price on our latest stock. Limited time only! Call us today 📞 #Deals' },
  { label:'Customer Win',  text:'✅ Congratulations to our happy customer on their new ride! Thank you for choosing us 🙏 #HappyCustomer' },
  { label:'Sold Alert',    text:'🔥 SOLD! Another satisfied customer drives away happy. We have more amazing options — DM us! #JustSold' },
  { label:'CTA Post',      text:'📲 Looking for your dream car? Visit us today or slide into our DMs. We deliver nationwide! 🚘 #CarSales' },
];

/* ── helpers ───────────────────────────────────────────────── */
const mapPost = (p) => ({
  id:           p.id,
  platform:     p.platform,
  content:      p.content,
  status:       p.status,
  likes:        p.likes_count   || 0,
  reach:        p.reach_count   || 0,
  comments:     p.comments_count || 0,
  published_at: p.published_at
    ? new Date(p.published_at).toLocaleString('en-NG', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })
    : null,
  scheduled_at: p.scheduled_at
    ? new Date(p.scheduled_at).toLocaleString('en-NG', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })
    : null,
  error:        p.error_message || null,
  created_at:   p.created_at,
});

/* ── Post card ─────────────────────────────────────────────── */
function PostCard({ post, onDelete }) {
  const pl = PLATFORMS.find((p) => p.key === post.platform);
  return (
    <div className="bg-surface-1 border border-surface-4 rounded-[12px] p-4">
      <div className="flex items-start gap-3">
        <span className="text-[22px] shrink-0">{pl?.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[11.5px] font-bold" style={{ color: pl?.color }}>{pl?.label}</span>
            <span
              className="text-[9.5px] font-bold px-[6px] py-[2px] rounded-full"
              style={{ background:`${STATUS_COLORS[post.status]}18`, color:STATUS_COLORS[post.status] }}
            >
              {post.status}
            </span>
          </div>
          <p className="text-[12px] text-text-secondary leading-[1.5] line-clamp-3">{post.content}</p>
          <div className="flex items-center gap-3 mt-2 text-[10.5px] text-text-muted flex-wrap">
            {post.status === 'published' && (
              <>
                <span>❤️ {post.likes}</span>
                <span>👁️ {post.reach} reach</span>
                <span>💬 {post.comments}</span>
                {post.published_at && <span>{post.published_at}</span>}
              </>
            )}
            {post.status === 'scheduled' && post.scheduled_at && (
              <span>🕐 Scheduled: {post.scheduled_at}</span>
            )}
            {post.status === 'failed' && (
              <span className="text-red-400">⚠️ {post.error || 'Failed to publish'}</span>
            )}
          </div>
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(post.id)}
            className="text-text-muted hover:text-red-400 transition-colors ml-1 shrink-0"
            aria-label="Delete post"
          >
            <Icon name="x" size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Compose panel ─────────────────────────────────────────── */
function ComposePanel({ connectedPlatforms, onPosted }) {
  const toast = useToast();
  const [content,       setContent]   = useState('');
  const [selectedPlats, setPlats]     = useState(['facebook']);
  const [scheduleAt,    setScheduleAt]= useState('');
  const [isPosting,     setPosting]   = useState(false);

  const togglePlatform = (key) => {
    const isConnected = connectedPlatforms.includes(key);
    if (!isConnected) { toast(`${key} is not connected`, 'warning'); return; }
    setPlats((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handlePost = async () => {
    if (!content.trim() || !selectedPlats.length) return;
    setPosting(true);
    try {
      const { data } = await socialApi.createPost({
        platforms:   selectedPlats,
        content:     content.trim(),
        scheduledAt: scheduleAt || null,
      });
      toast(
        scheduleAt
          ? `Post scheduled for ${selectedPlats.join(', ')}!`
          : `Posted to ${selectedPlats.join(', ')}!`,
        'ok'
      );
      setContent('');
      setScheduleAt('');
      onPosted(data.results || []);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to post', 'danger');
    } finally {
      setPosting(false);
    }
  };

  const charLimit = selectedPlats.includes('tiktok') ? 150 : 2200;

  return (
    <div className="bg-surface-1 border border-surface-4 rounded-[14px] p-5 space-y-4">
      <p className="text-[12px] font-extrabold text-text-muted uppercase tracking-widest">New Post</p>

      {/* Platform selector */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Post to</p>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((pl) => {
            const connected = connectedPlatforms.includes(pl.key);
            const selected  = selectedPlats.includes(pl.key);
            return (
              <button
                key={pl.key}
                onClick={() => togglePlatform(pl.key)}
                className={cn(
                  'flex items-center gap-2 px-3 py-[7px] rounded-[9px] border text-[11.5px] font-bold transition-all',
                  !connected
                    ? 'opacity-40 cursor-not-allowed border-surface-3 text-text-muted'
                    : selected
                      ? 'text-text-primary'
                      : 'border-surface-4 bg-surface-2 text-text-muted hover:border-surface-5'
                )}
                style={selected ? { border:`1px solid ${pl.color}44`, background:`${pl.color}14`, color:pl.color } : {}}
              >
                <span>{pl.icon}</span>
                {pl.label}
                {!connected && <span className="text-[9px]">(Connect)</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div>
        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Content</p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          placeholder="Write your post… Use {{brand}}, {{model}}, {{year}} as placeholders."
          className="w-full bg-surface-2 border border-surface-4 rounded-[10px] px-3 py-2.5 text-[12.5px] text-text-primary outline-none focus:border-gold transition-colors resize-none placeholder:text-text-muted"
        />
        <p className={cn('text-[10.5px] text-right mt-1', content.length > charLimit ? 'text-red-400' : 'text-text-muted')}>
          {content.length}/{charLimit}
        </p>
      </div>

      {/* Quick templates */}
      <div>
        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Quick Templates</p>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              onClick={() => setContent(t.text)}
              className="text-[10.5px] font-bold text-text-muted bg-surface-2 border border-surface-4 px-2 py-1 rounded-[6px] hover:border-gold hover:text-gold transition-colors"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule */}
      <div>
        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Schedule (optional)</p>
        <input
          type="datetime-local"
          value={scheduleAt}
          onChange={(e) => setScheduleAt(e.target.value)}
          className="bg-surface-2 border border-surface-4 rounded-[8px] px-3 py-2 text-[12px] text-text-primary outline-none focus:border-gold transition-colors"
        />
      </div>

      <Button
        onClick={handlePost}
        disabled={!content.trim() || !selectedPlats.length || isPosting}
        className="w-full justify-center"
      >
        {isPosting ? <><Spinner size={13} />Posting…</> : scheduleAt ? '📅 Schedule Post' : '🚀 Post Now'}
      </Button>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────── */
export function SocialPage() {
  const toast = useToast();
  const [posts,      setPosts]     = useState([]);
  const [analytics,  setAnalytics] = useState(null);
  const [filter,     setFilter]    = useState('all');
  const [loading,    setLoading]   = useState(true);
  const [error,      setError]     = useState(null);

  // For now connected platforms come from dealer settings.
  // We default to facebook + instagram until a connect-accounts flow is built.
  const connectedPlatforms = ['facebook', 'instagram'];

  /* fetch posts + analytics */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [postsRes, analyticsRes] = await Promise.allSettled([
        socialApi.getPosts({ limit: 50 }),
        socialApi.getAnalytics(),
      ]);

      if (postsRes.status === 'fulfilled') {
        const raw = postsRes.value.data?.posts ?? [];
        setPosts(raw.map(mapPost));
      }

      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value.data?.analytics ?? null);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* add newly posted items to the top of the list */
  const handlePosted = (results) => {
    const newPosts = (results || []).map((r) => mapPost({
      id:         r.postId || `temp-${Date.now()}-${Math.random()}`,
      platform:   r.platform,
      content:    r.content || '',
      status:     r.status || 'published',
      created_at: new Date().toISOString(),
    }));
    setPosts((prev) => [...newPosts, ...prev]);
    // Refresh analytics after posting
    socialApi.getAnalytics().then((res) => setAnalytics(res.data?.analytics ?? null)).catch(() => {});
  };

  /* Stats derived from analytics or posts */
  const published  = posts.filter((p) => p.status === 'published').length;
  const scheduled  = posts.filter((p) => p.status === 'scheduled').length;
  const totalLikes = posts.reduce((s, p) => s + (p.likes || 0), 0);
  const totalReach = posts.reduce((s, p) => s + (p.reach || 0), 0);

  const filtered = filter === 'all' ? posts : posts.filter((p) => p.status === filter);

  return (
    <div className="max-w-[1200px] px-4 md:px-[22px] pt-[22px] pb-[88px] md:pb-[22px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="font-display text-[23px] font-bold flex items-center gap-[10px]">
            <Icon name="globe" size={22} color="#C8973A" /> Social Media
          </h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">
            Auto-post to Facebook, Instagram &amp; TikTok
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
          {loading ? <Spinner size={13} /> : <Icon name="refresh" size={13} />}
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label:'Published',   value:published,                      color:'#16A34A' },
          { label:'Scheduled',   value:scheduled,                      color:'#F59E0B' },
          { label:'Total Likes', value:totalLikes.toLocaleString(),    color:'#EC4899' },
          { label:'Total Reach', value:totalReach.toLocaleString(),    color:'#3B82F6' },
        ].map((s) => (
          <div key={s.label} className="bg-surface-1 border border-surface-4 rounded-[12px] p-4 text-center">
            <p className="text-[24px] font-display font-bold" style={{ color:s.color }}>{s.value}</p>
            <p className="text-[11px] font-bold text-text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: Compose + Connected accounts */}
        <div className="w-full lg:w-[340px] shrink-0">
          <ComposePanel connectedPlatforms={connectedPlatforms} onPosted={handlePosted} />

          {/* Connected accounts */}
          <div className="mt-4 bg-surface-1 border border-surface-4 rounded-[14px] p-4">
            <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-widest mb-3">
              Connected Accounts
            </p>
            {PLATFORMS.map((pl) => {
              const connected = connectedPlatforms.includes(pl.key);
              return (
                <div key={pl.key} className="flex items-center gap-3 py-2 border-b border-surface-4 last:border-0">
                  <span className="text-[18px]">{pl.icon}</span>
                  <div className="flex-1">
                    <p className="text-[12.5px] font-bold text-text-primary">{pl.label}</p>
                    <p className="text-[10.5px] text-text-muted">{connected ? 'Connected' : 'Not connected'}</p>
                  </div>
                  <span className={cn('w-2 h-2 rounded-full', connected ? 'bg-green-500' : 'bg-surface-5')} />
                </div>
              );
            })}
            <button className="w-full mt-3 text-[11px] font-bold text-gold hover:opacity-80 transition-opacity py-1">
              + Connect TikTok →
            </button>
          </div>
        </div>

        {/* Right: Post history */}
        <div className="flex-1">
          {/* Filter tabs */}
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {['all','published','scheduled','failed'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-[5px] text-[11.5px] font-bold rounded-[7px] capitalize transition-colors',
                  filter === f
                    ? 'bg-gold text-[#0A0812]'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-3'
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col gap-3">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="bg-surface-1 border border-surface-4 rounded-[12px] p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-3" />
                    <div className="flex-1">
                      <div className="h-3 bg-surface-3 rounded w-1/4 mb-2" />
                      <div className="h-3 bg-surface-3 rounded w-full mb-1" />
                      <div className="h-3 bg-surface-3 rounded w-3/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-[12px] p-4 text-center">
              <p className="text-red-400 text-[13px] font-bold mb-2">Failed to load posts</p>
              <p className="text-text-muted text-[12px] mb-3">{error}</p>
              <Button variant="ghost" size="sm" onClick={fetchData}>Try Again</Button>
            </div>
          )}

          {/* Posts list */}
          {!loading && !error && (
            <div className="space-y-3">
              {filtered.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-12 text-text-muted bg-surface-1 border border-surface-4 rounded-[14px]">
                  <span className="text-[40px]">📭</span>
                  <p className="text-[13px] font-semibold mt-3">No posts yet</p>
                  <p className="text-[12px] mt-1">Use the compose panel to create your first post</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}