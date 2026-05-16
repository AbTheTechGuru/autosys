import { useState, useEffect, useRef, useCallback } from 'react';
import { Icon }    from '@/shared/components/ui/Icon';
import { Avatar, toInitials } from '@/shared/components/ui/Avatar';
import { Button }  from '@/shared/components/ui/Button';
import { Spinner } from '@/shared/components/ui/Spinner';
import { LiveDot } from '@/shared/components/ui/LiveDot';
import { cn }      from '@/shared/utils/cn';
import { useToast } from '@/context/ToastContext';
import { inboxApi } from '@/services/api';

/* ── Constants ─────────────────────────────────────────────── */
const CHANNELS = [
  { key: 'all',      label: 'All',      icon: 'dash',   color: '#C8973A' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'wa',     color: '#25D366' },
  { key: 'sms',      label: 'SMS',      icon: 'phone',  color: '#3B82F6' },
  { key: 'email',    label: 'Email',    icon: 'report', color: '#6366F1' },
];

const CHANNEL_COLORS = { whatsapp:'#25D366', sms:'#3B82F6', email:'#6366F1', call:'#F59E0B' };
const CHANNEL_ICONS  = { whatsapp:'wa', sms:'phone', email:'report', call:'phone' };

const STAGE_COLORS = {
  new:'#3B82F6', contacted:'#F59E0B', negotiating:'#8B5CF6',
  closed_won:'#16A34A', closed_lost:'#EF4444',
};

/* ── Map backend message → UI shape ───────────────────────── */
const mapMsg = (m) => ({
  id:      m.id,
  dir:     m.direction === 'inbound' ? 'in' : 'out',
  body:    m.body || m.content || '',
  subject: m.subject || null,
  time:    m.created_at
    ? new Date(m.created_at).toLocaleTimeString('en-NG', { hour:'2-digit', minute:'2-digit' })
    : 'Now',
  ch:      m.channel || 'whatsapp',
  status:  m.status,
});

/* ── Map backend conversation → UI shape ──────────────────── */
const mapConv = (m) => {
  const lead = m.leads || {};
  return {
    id:      lead.id || m.lead_id,
    name:    lead.name || 'Unknown',
    channel: m.channel || 'whatsapp',
    unread:  m.unread_count || 0,
    last:    m.body || '',
    time:    m.created_at
      ? (() => {
          const diff = Date.now() - new Date(m.created_at);
          if (diff < 60000)    return 'Just now';
          if (diff < 3600000)  return `${Math.floor(diff/60000)}m`;
          if (diff < 86400000) return `${Math.floor(diff/3600000)}h`;
          return `${Math.floor(diff/86400000)}d`;
        })()
      : '',
    online:  false,
    phone:   lead.phone || null,
    email:   lead.email || null,
    stage:   lead.stage || 'new',
    lead_id: lead.id || m.lead_id,
  };
};

/* ── Message bubble ────────────────────────────────────────── */
function Bubble({ msg }) {
  const isOut = msg.dir === 'out';
  return (
    <div className={cn('flex mb-3', isOut ? 'justify-end' : 'justify-start')}>
      {!isOut && (
        <div className="w-6 h-6 rounded-full bg-surface-3 border border-surface-4 flex items-center justify-center mr-2 shrink-0 mt-0.5">
          <Icon name={CHANNEL_ICONS[msg.ch] || 'phone'} size={11} color={CHANNEL_COLORS[msg.ch]} />
        </div>
      )}
      <div className={cn(
        'max-w-[75%] px-3 py-2 rounded-[12px] text-[12.5px] leading-[1.5]',
        isOut
          ? 'bg-[rgba(200,151,58,.15)] border border-[rgba(200,151,58,.25)] text-text-primary rounded-br-[4px]'
          : 'bg-surface-2 border border-surface-4 text-text-primary rounded-bl-[4px]'
      )}>
        {msg.subject && <p className="text-[10.5px] font-bold text-text-muted mb-1">{msg.subject}</p>}
        <p>{msg.body}</p>
        <div className="flex items-center justify-end gap-1 mt-1">
          <p className={cn('text-[9.5px] font-medium', isOut ? 'text-gold/60' : 'text-text-muted')}>
            {msg.time}
          </p>
          {isOut && msg.status === 'delivered' && <span className="text-[9px] text-green-400">✓✓</span>}
          {isOut && msg.status === 'sent'      && <span className="text-[9px] text-text-muted">✓</span>}
          {isOut && msg.status === 'failed'    && <span className="text-[9px] text-red-400">✗</span>}
        </div>
      </div>
    </div>
  );
}

/* ── Conversation list item ────────────────────────────────── */
function ConvItem({ conv, selected, onClick }) {
  const color = CHANNEL_COLORS[conv.channel];
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-start gap-3 px-3 py-[10px] rounded-[10px] border transition-all duration-120',
        selected
          ? 'bg-[rgba(200,151,58,.08)] border-[rgba(200,151,58,.25)]'
          : 'bg-transparent border-transparent hover:bg-surface-2 hover:border-surface-4'
      )}
    >
      <div className="relative shrink-0">
        <Avatar initials={toInitials(conv.name)} size={36} />
        {conv.online && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-status-ok border-2 border-surface-1" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 justify-between">
          <span className="text-[12.5px] font-bold text-text-primary truncate">{conv.name}</span>
          <span className="text-[10px] text-text-muted shrink-0">{conv.time}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-[2px]">
          <span className="shrink-0">
            <Icon name={CHANNEL_ICONS[conv.channel]} size={10} color={color} />
          </span>
          <p className="text-[11.5px] text-text-muted truncate flex-1">{conv.last}</p>
          {conv.unread > 0 && (
            <span className="ml-auto shrink-0 bg-[#3B82F6] text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
              {conv.unread}
            </span>
          )}
        </div>
        <span
          className="text-[9.5px] font-bold px-[5px] py-[1px] rounded-full mt-0.5 inline-block capitalize"
          style={{ background:`${STAGE_COLORS[conv.stage] || '#3B82F6'}18`, color:STAGE_COLORS[conv.stage] || '#3B82F6' }}
        >
          {(conv.stage || 'new').replace('_', ' ')}
        </span>
      </div>
    </button>
  );
}

/* ── Empty state ───────────────────────────────────────────── */
function EmptyInbox() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-10">
      <span className="text-[48px] mb-3">📭</span>
      <p className="text-[14px] font-bold text-text-secondary mb-1">No conversations yet</p>
      <p className="text-[12px] text-text-muted">
        Messages from WhatsApp, SMS, and Email will appear here
      </p>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────── */
export function InboxPage() {
  const toast = useToast();
  const bottomRef = useRef(null);

  const [channel,   setChannel]   = useState('all');
  const [convs,     setConvs]     = useState([]);
  const [thread,    setThread]    = useState([]);
  const [selConv,   setSelConv]   = useState(null);
  const [message,   setMessage]   = useState('');
  const [sendCh,    setSendCh]    = useState('whatsapp');
  const [subject,   setSubject]   = useState('');

  const [convsLoading,  setConvsLoading]  = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending,       setSending]       = useState(false);
  const [search,        setSearch]        = useState('');

  /* Scroll to bottom of thread on new messages */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [thread]);

  /* Fetch conversations */
  const fetchConvs = useCallback(async () => {
    setConvsLoading(true);
    try {
      const params = {};
      if (channel !== 'all') params.channel = channel;
      const { data } = await inboxApi.getConversations(params);
      const mapped = (data.conversations ?? []).map(mapConv);
      setConvs(mapped);
      // Auto-select first conversation
      if (mapped.length && !selConv) {
        setSelConv(mapped[0]);
        setSendCh(mapped[0].channel || 'whatsapp');
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load inbox', 'danger');
    } finally {
      setConvsLoading(false);
    }
  }, [channel]);

  useEffect(() => { fetchConvs(); }, [fetchConvs]);

  /* Fetch thread when conversation selected */
  const fetchThread = useCallback(async (conv) => {
    if (!conv?.lead_id) return;
    setThreadLoading(true);
    try {
      const { data } = await inboxApi.getThread(conv.lead_id);
      setThread((data.messages ?? []).map(mapMsg).reverse());
    } catch {
      setThread([]);
    } finally {
      setThreadLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selConv) fetchThread(selConv);
  }, [selConv, fetchThread]);

  /* Send message */
  const send = async () => {
    if (!message.trim() || !selConv?.lead_id) return;
    setSending(true);

    // Optimistic update
    const optimistic = {
      id:      `temp-${Date.now()}`,
      dir:     'out',
      body:    message,
      subject: sendCh === 'email' ? subject : null,
      time:    'Now',
      ch:      sendCh,
      status:  'sending',
    };
    setThread((prev) => [...prev, optimistic]);
    const msg = message;
    setMessage('');

    try {
      await inboxApi.send({
        leadId:  selConv.lead_id,
        channel: sendCh,
        message: msg,
        subject: sendCh === 'email' ? subject : undefined,
      });
      // Replace optimistic with delivered status
      setThread((prev) =>
        prev.map((m) => m.id === optimistic.id ? { ...m, status:'sent' } : m)
      );
      toast(`Sent via ${sendCh}!`, 'ok');

      // Update last message in convs list
      setConvs((prev) =>
        prev.map((c) => c.lead_id === selConv.lead_id ? { ...c, last: msg } : c)
      );
    } catch (err) {
      // Mark as failed
      setThread((prev) =>
        prev.map((m) => m.id === optimistic.id ? { ...m, status:'failed' } : m)
      );
      toast(err.response?.data?.message || `Failed to send via ${sendCh}`, 'danger');
    } finally {
      setSending(false);
    }
  };

  /* Filter convs by search */
  const filtered = convs.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.last || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = convs.reduce((s, c) => s + (c.unread || 0), 0);

  return (
    <div className="max-w-[1400px] px-4 md:px-[22px] pt-[22px] pb-[88px] md:pb-[22px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-[23px] font-bold flex items-center gap-[10px]">
            <Icon name="dash" size={22} color="#C8973A" /> Unified Inbox
          </h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">
            {totalUnread > 0 ? `${totalUnread} unread · ` : ''}WhatsApp, SMS, Email in one place
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {CHANNELS.map((ch) => (
            <button
              key={ch.key}
              onClick={() => { setChannel(ch.key); setSelConv(null); setThread([]); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-[6px] rounded-[8px] text-[11.5px] font-bold transition-colors border',
                channel === ch.key
                  ? 'border-gold bg-[rgba(200,151,58,.1)] text-gold'
                  : 'border-surface-4 bg-surface-2 text-text-muted hover:border-surface-5'
              )}
            >
              <Icon name={ch.icon} size={12} color={channel === ch.key ? ch.color : '#4E4B58'} />
              {ch.label}
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={fetchConvs} disabled={convsLoading}>
            {convsLoading ? <Spinner size={12} /> : <Icon name="refresh" size={12} />}
          </Button>
        </div>
      </div>

      {/* Main panel */}
      <div className="flex gap-3 h-[calc(100vh-180px)] min-h-[480px]">

        {/* Conversation list */}
        <div className="w-[280px] shrink-0 bg-surface-1 border border-surface-4 rounded-[14px] flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-surface-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full bg-surface-2 rounded-[7px] px-3 py-1.5 text-[12px] text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {convsLoading && (
              <div className="flex flex-col gap-2 p-2">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex gap-3 items-start animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-surface-3 shrink-0" />
                    <div className="flex-1">
                      <div className="h-3 bg-surface-3 rounded w-2/3 mb-1.5" />
                      <div className="h-2.5 bg-surface-3 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!convsLoading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
                <span className="text-[32px] mb-2">📭</span>
                <p className="text-[12px] text-text-muted">No conversations found</p>
              </div>
            )}

            {!convsLoading && filtered.map((c) => (
              <ConvItem
                key={c.id}
                conv={c}
                selected={selConv?.id === c.id}
                onClick={() => {
                  setSelConv(c);
                  setSendCh(c.channel || 'whatsapp');
                }}
              />
            ))}
          </div>
        </div>

        {/* Thread view */}
        <div className="flex-1 bg-surface-1 border border-surface-4 rounded-[14px] flex flex-col overflow-hidden">

          {/* Thread header */}
          {selConv ? (
            <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-4 shrink-0">
              <Avatar initials={toInitials(selConv.name)} size={32} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-text-primary">{selConv.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] text-text-muted truncate">
                    {selConv.phone || selConv.email || '—'}
                  </span>
                  {selConv.online && <LiveDot />}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => selConv.phone && window.open(`tel:${selConv.phone}`)}
                  className="text-[11px] font-bold text-text-muted hover:text-text-primary bg-surface-2 border border-surface-4 px-3 py-1.5 rounded-[7px] transition-colors"
                >
                  📞 Call
                </button>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 border-b border-surface-4 text-[13px] text-text-muted">
              Select a conversation
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {threadLoading && (
              <div className="flex justify-center py-8">
                <Spinner size={20} />
              </div>
            )}
            {!threadLoading && thread.length === 0 && selConv && (
              <div className="flex flex-col items-center justify-center h-full text-text-muted">
                <Icon name="dash" size={28} color="#4E4B58" />
                <p className="text-[13px] font-semibold mt-3">No messages yet</p>
                <p className="text-[12px] text-text-muted mt-1">Send the first message below</p>
              </div>
            )}
            {!threadLoading && !selConv && <EmptyInbox />}
            {!threadLoading && thread.map((msg) => <Bubble key={msg.id} msg={msg} />)}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          {selConv && (
            <div className="border-t border-surface-4 p-3 shrink-0">
              {/* Channel selector */}
              <div className="flex gap-1.5 mb-2 flex-wrap">
                {['whatsapp', 'sms', 'email'].map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setSendCh(ch)}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-[4px] text-[10.5px] font-bold rounded-[6px] border capitalize transition-colors',
                      sendCh === ch
                        ? 'border-gold bg-[rgba(200,151,58,.1)] text-gold'
                        : 'border-surface-4 text-text-muted hover:border-surface-5'
                    )}
                  >
                    <Icon name={CHANNEL_ICONS[ch]} size={10} color={sendCh === ch ? CHANNEL_COLORS[ch] : '#4E4B58'} />
                    {ch}
                  </button>
                ))}
              </div>

              {/* Email subject */}
              {sendCh === 'email' && (
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject…"
                  className="w-full bg-surface-2 border border-surface-4 rounded-[8px] px-3 py-1.5 text-[12px] text-text-primary outline-none focus:border-gold transition-colors mb-2 placeholder:text-text-muted"
                />
              )}

              {/* Message input */}
              <div className="flex gap-2">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                  }}
                  placeholder={`Type a ${sendCh} message… (Enter to send, Shift+Enter for new line)`}
                  rows={2}
                  className="flex-1 bg-surface-2 border border-surface-4 rounded-[10px] px-3 py-2 text-[12.5px] text-text-primary outline-none focus:border-gold transition-colors resize-none placeholder:text-text-muted"
                  disabled={sending}
                />
                <Button
                  onClick={send}
                  disabled={!message.trim() || sending}
                  className="self-end"
                >
                  {sending ? <Spinner size={13} /> : 'Send'}
                </Button>
              </div>
              <p className="text-[10px] text-text-muted mt-1">
                {sendCh === 'whatsapp' && !selConv?.phone && '⚠️ This lead has no phone number'}
                {sendCh === 'sms'      && !selConv?.phone && '⚠️ This lead has no phone number'}
                {sendCh === 'email'    && !selConv?.email && '⚠️ This lead has no email address'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
