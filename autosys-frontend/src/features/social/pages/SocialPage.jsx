import { useState } from 'react';
import { Icon }    from '@/shared/components/ui/Icon';
import { Button }  from '@/shared/components/ui/Button';
import { Toggle }  from '@/shared/components/ui/Toggle';
import { cn }      from '@/shared/utils/cn';
import { useToast } from '@/context/ToastContext';

/* ── Constants ──────────────────────────────────────────────── */
const PLATFORMS = [
  { key: 'facebook',  label: 'Facebook',  icon: '📘', color: '#1877F2', connected: true  },
  { key: 'instagram', label: 'Instagram', icon: '📸', color: '#E1306C', connected: true  },
  { key: 'tiktok',    label: 'TikTok',    icon: '🎵', color: '#000000', connected: false },
];

const DEMO_POSTS = [
  { id: '1', platform: 'facebook',  content: '🚗 Just arrived! 2022 Toyota Camry XSE. Excellent condition, only 42K km. DM us now!', status: 'published', published_at: '2 hours ago', likes: 24, reach: 340 },
  { id: '2', platform: 'instagram', content: '🔥 New arrival alert! 2021 Mercedes GLE 450 — pristine condition. Swipe for more photos! 👉', status: 'published', published_at: '5 hours ago', likes: 87, reach: 1240 },
  { id: '3', platform: 'facebook',  content: '💰 Weekend special! 2020 Honda CR-V Hybrid at an unbeatable price. Limited time offer!', status: 'scheduled',  scheduled_at: 'Tomorrow 9:00 AM', likes: 0, reach: 0 },
  { id: '4', platform: 'instagram', content: '✅ Congratulations to our happy customer on their new Lexus RX 350! Thank you for choosing us 🙏', status: 'published', published_at: '1 day ago', likes: 142, reach: 2100 },
  { id: '5', platform: 'tiktok',    content: '🎬 Tour of our 2023 Land Cruiser VX — full specs walkthrough!', status: 'failed',    error: 'TikTok not connected', likes: 0, reach: 0 },
];

const STATUS_COLORS = {
  published: '#16A34A', scheduled: '#F59E0B', failed: '#EF4444', draft: '#6B7280', skipped: '#6B7280',
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
        <span className="text-[22px] shrink-0">{pl?.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11.5px] font-bold" style={{ color: pl?.color }}>{pl?.label}</span>
            <span className="text-[9.5px] font-bold px-[6px] py-[2px] rounded-full"
              style={{ background: `${STATUS_COLORS[post.status]}18`, color: STATUS_COLORS[post.status] }}>
              {post.status}
            </span>
          </div>
          <p className="text-[12px] text-text-secondary leading-[1.5] line-clamp-2">{post.content}</p>
          <div className="flex items-center gap-3 mt-2 text-[10.5px] text-text-muted">
            {post.status === 'published' && (
              <>
                <span>❤️ {post.likes}</span>
                <span>👁️ {post.reach} reach</span>
                <span>{post.published_at}</span>
              </>
            )}
            {post.status === 'scheduled' && <span>🕐 {post.scheduled_at}</span>}
            {post.status === 'failed' && <span className="text-red-400">⚠️ {post.error}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Compose panel ──────────────────────────────────────────── */
function ComposePanel({ onPost }) {
  const [content, setContent]         = useState('');
  const [selectedPlats, setPlats]     = useState(['facebook']);
  const [scheduleAt, setScheduleAt]   = useState('');
  const [isPosting, setPosting]       = useState(false);
  const toast = useToast();

  const togglePlatform = (key) =>
    setPlats((prev) => prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]);

  const handlePost = async () => {
    if (!content || !selectedPlats.length) return;
    setPosting(true);
    await new Promise((r) => setTimeout(r, 1200));
    onPost({ content, platforms: selectedPlats, scheduledAt: scheduleAt });
    setContent('');
    setPosting(false);
    toast(`Posted to ${selectedPlats.join(', ')}!`);
  };

  const charCount = content.length;
  const limit     = selectedPlats.includes('tiktok') ? 150 : 2200;

  return (
    <div className="bg-surface-1 border border-surface-4 rounded-[14px] p-5 space-y-4">
      <p className="text-[12px] font-extrabold text-text-muted uppercase tracking-widest">New Post</p>

      {/* Platform selector */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Post to</p>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((pl) => (
            <button key={pl.key}
              onClick={() => pl.connected && togglePlatform(pl.key)}
              disabled={!pl.connected}
              className={cn(
                'flex items-center gap-2 px-3 py-[7px] rounded-[9px] border text-[11.5px] font-bold transition-all',
                !pl.connected ? 'opacity-40 cursor-not-allowed border-surface-3 text-text-muted' :
                selectedPlats.includes(pl.key)
                  ? 'text-text-primary'
                  : 'border-surface-4 bg-surface-2 text-text-muted hover:border-surface-5'
              )}
              style={selectedPlats.includes(pl.key) ? {
                border: `1px solid ${pl.color}44`,
                background: `${pl.color}14`,
                color: pl.color,
              } : {}}>
              <span>{pl.icon}</span>
              {pl.label}
              {!pl.connected && <span className="text-[9px]">(Connect)</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div>
        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Content</p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          placeholder="Write your post… Use {{vehicle.brand}}, {{vehicle.model}}, {{vehicle.year}} as placeholders."
          className="w-full bg-surface-2 border border-surface-4 rounded-[10px] px-3 py-2.5 text-[12.5px] text-text-primary outline-none focus:border-gold transition-colors resize-none placeholder:text-text-muted" />
        <p className={cn('text-[10.5px] text-right mt-1', charCount > limit ? 'text-red-400' : 'text-text-muted')}>
          {charCount}/{limit}
        </p>
      </div>

      {/* Templates */}
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

      {/* Schedule */}
      <div>
        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Schedule (optional)</p>
        <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)}
          className="bg-surface-2 border border-surface-4 rounded-[8px] px-3 py-2 text-[12px] text-text-primary outline-none focus:border-gold transition-colors" />
      </div>

      <Button
        onClick={handlePost}
        disabled={!content || !selectedPlats.length || isPosting}
        className="w-full">
        {isPosting ? 'Posting…' : scheduleAt ? '📅 Schedule Post' : '🚀 Post Now'}
      </Button>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────── */
export function SocialPage() {
  const [posts, setPosts]   = useState(DEMO_POSTS);
  const [filter, setFilter] = useState('all');

  const addPost = (data) => {
    const newPost = {
      id: String(Date.now()),
      content: data.content,
      platform: data.platforms[0],
      status: data.scheduledAt ? 'scheduled' : 'published',
      published_at: 'Just now',
      likes: 0, reach: 0,
    };
    setPosts((prev) => [newPost, ...prev]);
  };

  const filtered = filter === 'all' ? posts : posts.filter((p) => p.status === filter);

  const stats = {
    published: posts.filter((p) => p.status === 'published').length,
    scheduled: posts.filter((p) => p.status === 'scheduled').length,
    totalLikes: posts.reduce((s, p) => s + (p.likes || 0), 0),
    totalReach: posts.reduce((s, p) => s + (p.reach || 0), 0),
  };

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
          { label: 'Published',  value: stats.published,  color: '#16A34A' },
          { label: 'Scheduled',  value: stats.scheduled,  color: '#F59E0B' },
          { label: 'Total Likes', value: stats.totalLikes, color: '#EC4899' },
          { label: 'Total Reach', value: stats.totalReach.toLocaleString(), color: '#3B82F6' },
        ].map((s) => (
          <div key={s.label} className="bg-surface-1 border border-surface-4 rounded-[12px] p-4 text-center">
            <p className="text-[24px] font-display font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] font-bold text-text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: Compose */}
        <div className="w-full lg:w-[340px] shrink-0">
          <ComposePanel onPost={addPost} />

          {/* Connected accounts */}
          <div className="mt-4 bg-surface-1 border border-surface-4 rounded-[14px] p-4">
            <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-widest mb-3">
              Connected Accounts
            </p>
            {PLATFORMS.map((pl) => (
              <div key={pl.key} className="flex items-center gap-3 py-2 border-b border-surface-4 last:border-0">
                <span className="text-[18px]">{pl.icon}</span>
                <div className="flex-1">
                  <p className="text-[12.5px] font-bold text-text-primary">{pl.label}</p>
                  <p className="text-[10.5px] text-text-muted">{pl.connected ? 'Connected' : 'Not connected'}</p>
                </div>
                <span className={cn('w-2 h-2 rounded-full', pl.connected ? 'bg-status-ok' : 'bg-surface-5')} />
              </div>
            ))}
            <button className="w-full mt-3 text-[11px] font-bold text-gold hover:text-gold/80 transition-colors py-1">
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
          <div className="space-y-3">
            {filtered.map((p) => <PostCard key={p.id} post={p} />)}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-text-muted">
                <span className="text-[32px]">📭</span>
                <p className="text-[13px] font-semibold mt-3">No posts yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
