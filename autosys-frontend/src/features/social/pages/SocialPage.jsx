import { useState, useEffect, useCallback } from 'react';
import { Icon }    from '@/shared/components/ui/Icon';
import { Button }  from '@/shared/components/ui/Button';
import { Spinner } from '@/shared/components/ui/Spinner';
import { cn }      from '@/shared/utils/cn';
import { useToast } from '@/context/ToastContext';
import { socialApi } from '@/services/api/global.api';

/* ── Constants ──────────────────────────────────────────────── */
const PLATFORMS = [
  { key: 'facebook',  label: 'Facebook',  icon: '📘', color: '#1877F2' },
  { key: 'instagram', label: 'Instagram', icon: '📸', color: '#E1306C' },
  { key: 'tiktok',    label: 'TikTok',    icon: '🎵', color: '#000000' },
];

const STATUS_COLORS = {
  published: '#16A34A', scheduled: '#F59E0B', failed: '#EF4444', draft: '#6B7280',
};

const AUTO_TEMPLATES = [
  'Vehicle listing post',
  'Weekend deals campaign',
  'Customer testimonial',
  'New arrival announcement',
  'Sold — showcase post',
];

/* ── Post card ──────────────────────────────────────────────── */
function PostCard({ post }) {
  const pl = PLATFORMS.find((p) => p.key === post.platform);
  return (
    <div className="bg-surface-1 border border-surface-4 rounded-[12px] p-4">
      <div className="flex items-start gap-3">
        <span className="text-[22px] shrink-0">{pl?.icon ?? '📄'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11.5px] font-bold" style={{ color: pl?.color }}>{pl?.label ?? post.platform}</span>
            <span className="text-[9.5px] font-bold px-[6px] py-[2px] rounded-full"
              style={{ background: `${STATUS_COLORS[post.status] ?? '#6B7280'}18`, color: STATUS_COLORS[post.status] ?? '#6B7280' }}>
              {post.status}
            </span>
          </div>
          <p className="text-[12px] text-text-secondary leading-[1.5] line-clamp-2">{post.content}</p>
          <div className="flex items-center gap-3 mt-2 text-[10.5px] text-text-muted">
            {post.status === 'published' && (
              <>
                <span>❤️ {post.likes ?? 0}</span>
                <span>👁️ {post.reach ?? 0} reach</span>
                <span>{post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Just now'}</span>
              </>
            )}
            {post.status === 'scheduled' && post.scheduled_at && (
              <span>🕐 {new Date(post.scheduled_at).toLocaleString()}</span>
            )}
            {post.status === 'failed' && <span className="text-red-400">⚠️ {post.error ?? 'Failed to post'}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Compose panel ──────────────────────────────────────────── */
function ComposePanel({ connectedPlatforms, onPosted }) {
  const [content, setContent]       = useState('');
  const [selectedPlats, setPlats]   = useState([]);
  const [scheduleAt, setScheduleAt] = useState('');
  const [isPosting, setPosting]     = useState(false);
  const toast = useToast();

  const togglePlatform = (key) =>
    setPlats((prev) => prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]);

  const handlePost = async () => {
    if (!content.trim() || !selectedPlats.length) return;
    setPosting(true);
    try {
      const { data } = await socialApi.post({
        platforms:   selectedPlats,
        content:     content.trim(),
        scheduledAt: scheduleAt || undefined,
      });
      onPosted(data.results ?? []);
      setContent('');
      setScheduleAt('');
      toast(`${scheduleAt ? 'Scheduled' : 'Posted'} to ${selectedPlats.join(', ')}!`);
    } catch (err) {
      toast(err.response?.data?.message || 'Post failed', 'danger');
    } finally {
      setPosting(false);
    }
  };

  const charLimit = selectedPlats.includes('tiktok') ? 150 : 2200;

  return (
    <div className="bg-surface-1 border border-surface-4 rounded-[14px] p-5 space-y-4">
      <p className="text-[12px] font-extrabold text-text-muted uppercase tracking-widest">New Post</p>

      <div className="space-y-2">
        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Post to</p>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((pl) => {
            const isConnected = connectedPlatforms.includes(pl.key);
            const isSelected  = selectedPlats.includes(pl.key);
            return (
              <button key={pl.key}
                onClick={() => isConnected && togglePlatform(pl.key)}
                disabled={!isConnected}
                className={cn(
                  'flex items-center gap-2 px-3 py-[7px] rounded-[9px] border text-[11.5px] font-bold transition-all',
                  !isConnected ? 'opacity-40 cursor-not-allowed border-surface-3 text-text-muted' :
                  isSelected ? 'text-text-primary' : 'border-surface-4 bg-surface-2 text-text-muted hover:border-surface-5'
                )}
                style={isSelected ? { border: `1px solid ${pl.color}44`, background: `${pl.color}14`, color: pl.color } : {}}>
                <span>{pl.icon}</span>
                {pl.label}
                {!isConnected && <span className="text-[9px]">(Connect)</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Content</p>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5}
          placeholder="Write your post… Use {{vehicle.brand}}, {{vehicle.model}}, {{vehicle.year}} as placeholders."
          className="w-full bg-surface-2 border border-surface-4 rounded-[10px] px-3 py-2.5 text-[12.5px] text-text-primary outline-none focus:border-gold transition-colors resize-none placeholder:text-text-muted" />
        <p className={cn('text-[10.5px] text-right mt-1', content.length > charLimit ? 'text-red-400' : 'text-text-muted')}>
          {content.length}/{charLimit}
        </p>
      </div>

      <div>
        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Quick Templates</p>
        <div className="flex flex-wrap gap-1.5">
          {AUTO_TEMPLATES.map((t) => (
            <button key={t}
              onClick={() => setContent(`[${t}]\n\n🚗 Check out our latest vehicle — stunning condition, unbeatable price!\n\n📲 DM us or call for more info.\n\n#CarDealer #AutoSys`)}
              className="text-[10.5px] font-bold text-text-muted bg-surface-2 border border-surface-4 px-2 py-1 rounded-[6px] hover:border-gold hover:text-gold transition-colors">
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Schedule (optional)</p>
        <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)}
          className="bg-surface-2 border border-surface-4 rounded-[8px] px-3 py-2 text-[12px] text-text-primary outline-none focus:border-gold transition-colors" />
      </div>

      <Button
        onClick={handlePost}
        disabled={!content.trim() || !selectedPlats.length || isPosting}
        className="w-full">
        {isPosting ? <><Spinner size={13} /> Posting…</> : (scheduleAt ? '📅 Schedule Post' : '🚀 Post Now')}
      </Button>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────── */
export function SocialPage() {
  const toast = useToast();

  const [posts,    setPosts]    = useState([]);
  const [analytics, setAnalytics] = useState({ published: 0, scheduled: 0, totalLikes: 0, totalReach: 0 });
  const [filter,   setFilter]   = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // TODO: Connect to backend endpoint when available
  // Expected endpoint: GET /social/connected-accounts
  // Expected response: { accounts: [{ platform: 'facebook', connected: true, page_name: '...' }] }
  // For now, defaulting to empty — user must connect via Integrations settings
  const [connectedPlatforms] = useState(['facebook', 'instagram']);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await socialApi.getPosts({ limit: 30 });
      const fetchedPosts = data.posts ?? [];
      setPosts(fetchedPosts);

      // Derive stats from fetched posts
      setAnalytics({
        published:  fetchedPosts.filter((p) => p.status === 'published').length,
        scheduled:  fetchedPosts.filter((p) => p.status === 'scheduled').length,
        totalLikes: fetchedPosts.reduce((s, p) => s + (p.likes ?? 0), 0),
        totalReach: fetchedPosts.reduce((s, p) => s + (p.reach ?? 0), 0),
      });
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load posts', 'danger');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handlePosted = (results) => {
    // Refresh list after posting
    fetchPosts();
  };

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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Published',   value: analytics.published,                    color: '#16A34A' },
          { label: 'Scheduled',   value: analytics.scheduled,                    color: '#F59E0B' },
          { label: 'Total Likes', value: analytics.totalLikes,                   color: '#EC4899' },
          { label: 'Total Reach', value: analytics.totalReach.toLocaleString(),  color: '#3B82F6' },
        ].map((s) => (
          <div key={s.label} className="bg-surface-1 border border-surface-4 rounded-[12px] p-4 text-center">
            <p className="text-[24px] font-display font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] font-bold text-text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: Compose + Connected accounts */}
        <div className="w-full lg:w-[340px] shrink-0">
          <ComposePanel connectedPlatforms={connectedPlatforms} onPosted={handlePosted} />

          <div className="mt-4 bg-surface-1 border border-surface-4 rounded-[14px] p-4">
            <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-widest mb-3">Connected Accounts</p>
            {PLATFORMS.map((pl) => {
              const isConnected = connectedPlatforms.includes(pl.key);
              return (
                <div key={pl.key} className="flex items-center gap-3 py-2 border-b border-surface-4 last:border-0">
                  <span className="text-[18px]">{pl.icon}</span>
                  <div className="flex-1">
                    <p className="text-[12.5px] font-bold text-text-primary">{pl.label}</p>
                    <p className="text-[10.5px] text-text-muted">{isConnected ? 'Connected' : 'Not connected'}</p>
                  </div>
                  <span className={cn('w-2 h-2 rounded-full', isConnected ? 'bg-status-ok' : 'bg-surface-5')} />
                </div>
              );
            })}

            {/* TODO: Connect to backend endpoint when available */}
            {/* Expected endpoint: POST /social/connect */}
            {/* Expected body: { platform: 'tiktok', oauth_code: string } */}
            {/* Expected response: { success: true, account: { platform, page_name } } */}
            <button className="w-full mt-3 text-[11px] font-bold text-gold hover:text-gold/80 transition-colors py-1"
              onClick={() => toast('Connect TikTok via Settings → Integrations')}>
              + Connect TikTok →
            </button>
          </div>
        </div>

        {/* Right: Post history */}
        <div className="flex-1">
          <div className="flex gap-1.5 mb-4">
            {['all', 'published', 'scheduled', 'failed'].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn('px-3 py-[5px] text-[11.5px] font-bold rounded-[7px] capitalize transition-colors',
                  filter === f ? 'bg-gold text-[#0A0812]' : 'text-text-muted hover:text-text-primary hover:bg-surface-3')}>
                {f}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-[90px] bg-surface-2 border border-surface-4 rounded-[12px] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((p) => <PostCard key={p.id} post={p} />)}
              {filtered.length === 0 && (
                <div className="text-center py-12 text-text-muted">
                  <span className="text-[32px]">📭</span>
                  <p className="text-[13px] font-semibold mt-3">No posts yet</p>
                  <p className="text-[12px] mt-1">Compose a post to get started</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
