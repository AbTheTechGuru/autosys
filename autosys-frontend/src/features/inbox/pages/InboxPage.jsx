import { useState, useEffect, useRef, useCallback } from 'react';
import { Icon }    from '@/shared/components/ui/Icon';
import { Avatar, toInitials } from '@/shared/components/ui/Avatar';
import { Button }  from '@/shared/components/ui/Button';
import { Spinner } from '@/shared/components/ui/Spinner';
import { LiveDot } from '@/shared/components/ui/LiveDot';
import { cn }      from '@/shared/utils/cn';
import { useToast } from '@/context/ToastContext';
import { inboxApi } from '@/services/api/global.api';

/* ── Constants ──────────────────────────────────────────────── */
const CHANNELS = [
  { key: 'all',      label: 'All',      icon: 'dash',   color: '#C8973A' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'wa',     color: '#25D366' },
  { key: 'sms',      label: 'SMS',      icon: 'phone',  color: '#3B82F6' },
  { key: 'email',    label: 'Email',    icon: 'report', color: '#6366F1' },
];

const CHANNEL_COLORS = { whatsapp: '#25D366', sms: '#3B82F6', email: '#6366F1', call: '#F59E0B' };
const CHANNEL_ICONS  = { whatsapp: 'wa', sms: 'phone', email: 'report', call: 'phone' };
const STAGE_COLORS   = {
  new: '#3B82F6', contacted: '#F59E0B', negotiating: '#8B5CF6', closed_won: '#16A34A', closed_lost: '#EF4444',
};

/* ── Bubble ─────────────────────────────────────────────────── */
function Bubble({ msg }) {
  const isOut = msg.direction === 'out' || msg.dir === 'out';
  const ch    = msg.channel || msg.ch || 'whatsapp';
  return (
    <div className={cn('flex mb-3', isOut ? 'justify-end' : 'justify-start')}>
      {!isOut && (
        <div className="w-6 h-6 rounded-full bg-surface-3 border border-surface-4 flex items-center justify-center mr-2 shrink-0 mt-0.5">
          <Icon name={CHANNEL_ICONS[ch] || 'phone'} size={11} color={CHANNEL_COLORS[ch]} />
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
        <p className={cn('text-[9.5px] mt-1 font-medium', isOut ? 'text-gold/60 text-right' : 'text-text-muted')}>
          {msg.time || (msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now')}
        </p>
      </div>
    </div>
  );
}

/* ── Conversation list item ─────────────────────────────────── */
function ConvItem({ conv, selected, onClick }) {
  const ch    = conv.channel;
  const color = CHANNEL_COLORS[ch];
  const name  = conv.leads?.name || conv.name || 'Unknown';
  const stage = conv.leads?.stage || conv.stage;
  const unread = conv.unread_count || conv.unread || 0;

  return (
    <button onClick={onClick}
      className={cn('w-full text-left flex items-start gap-3 px-3 py-[10px] rounded-[10px] border transition-all duration-120',
        selected
          ? 'bg-[rgba(200,151,58,.08)] border-[rgba(200,151,58,.25)]'
          : 'bg-transparent border-transparent hover:bg-surface-2 hover:border-surface-4')}>
      <div className="relative shrink-0">
        <Avatar initials={toInitials(name)} size={36} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 justify-between">
          <span className="text-[12.5px] font-bold text-text-primary truncate">{name}</span>
          <span className="text-[10px] text-text-muted shrink-0">
            {conv.created_at ? new Date(conv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : conv.time || ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-[2px]">
          <span className="shrink-0"><Icon name={CHANNEL_ICONS[ch] || 'phone'} size={10} color={color} /></span>
          <p className="text-[11.5px] text-text-muted truncate flex-1">{conv.body || conv.last || '—'}</p>
          {unread > 0 && (
            <span className="ml-auto shrink-0 bg-[#3B82F6] text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </div>
        {stage && (
          <span className="text-[9.5px] font-bold px-[5px] py-[1px] rounded-full mt-0.5 inline-block"
            style={{ background: `${STAGE_COLORS[stage] || '#6B7280'}18`, color: STAGE_COLORS[stage] || '#6B7280' }}>
            {stage.replace('_', ' ')}
          </span>
        )}
      </div>
    </button>
  );
}

/* ── Main Page ──────────────────────────────────────────────── */
export function InboxPage() {
  const toast = useToast();

  const [channel,  setChannel]  = useState('all');
  const [convs,    setConvs]    = useState([]);
  const [thread,   setThread]   = useState([]);
  const [selConv,  setSelConv]  = useState(null);
  const [message,  setMessage]  = useState('');
  const [sendCh,   setSendCh]   = useState('whatsapp');
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchQ,  setSearchQ]  = useState('');

  const threadRef = useRef(null);

  /* ── Fetch conversations ─────────────────────────────────── */
  const fetchConversations = useCallback(async () => {
    setIsLoadingConvs(true);
    try {
      const params = {};
      if (channel !== 'all') params.channel = channel;
      const { data } = await inboxApi.getConversations(params);
      setConvs(data.conversations ?? []);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load inbox', 'danger');
    } finally {
      setIsLoadingConvs(false);
    }
  }, [channel, toast]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  /* ── Fetch thread for selected conversation ──────────────── */
  useEffect(() => {
    if (!selConv?.lead_id) return;
    setIsLoadingThread(true);
    inboxApi.getThread(selConv.lead_id, channel !== 'all' ? channel : null)
      .then(({ data }) => {
        setThread(data.messages ?? []);
        // Auto-scroll to bottom
        setTimeout(() => {
          threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);
      })
      .catch(() => setThread([]))
      .finally(() => setIsLoadingThread(false));
  }, [selConv, channel]);

  /* ── Send message ────────────────────────────────────────── */
  const send = async () => {
    if (!message.trim() || !selConv?.lead_id) return;
    const lead  = selConv.leads;
    const optimistic = { id: `local-${Date.now()}`, direction: 'out', body: message, channel: sendCh, created_at: new Date().toISOString() };

    setThread((t) => [...t, optimistic]);
    setMessage('');
    setIsSending(true);

    try {
      await inboxApi.send({
        leadId:  selConv.lead_id,
        channel: sendCh,
        message: message.trim(),
      });
      toast(`Sent via ${sendCh.charAt(0).toUpperCase() + sendCh.slice(1)}!`);
    } catch (err) {
      toast(err.response?.data?.message || `${sendCh} not configured — check Settings → Integrations`, 'danger');
      // Remove optimistic on error
      setThread((t) => t.filter((m) => m.id !== optimistic.id));
    } finally {
      setIsSending(false);
    }
  };

  const filtered = searchQ
    ? convs.filter((c) => (c.leads?.name || '').toLowerCase().includes(searchQ.toLowerCase()))
    : convs;

  const totalUnread = convs.reduce((s, c) => s + (c.unread_count || c.unread || 0), 0);
  const selectedLead = selConv?.leads;

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
            <button key={ch.key} onClick={() => setChannel(ch.key)}
              className={cn('flex items-center gap-1.5 px-3 py-[6px] rounded-[8px] text-[11.5px] font-bold transition-colors border',
                channel === ch.key
                  ? 'border-gold bg-[rgba(200,151,58,.1)] text-gold'
                  : 'border-surface-4 bg-surface-2 text-text-muted hover:border-surface-5')}>
              <Icon name={ch.icon} size={12} color={channel === ch.key ? ch.color : '#4E4B58'} />
              {ch.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex gap-3 h-[calc(100vh-180px)] min-h-[480px]">
        {/* Conversation list */}
        <div className="w-[280px] shrink-0 bg-surface-1 border border-surface-4 rounded-[14px] flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-surface-4">
            <input
              placeholder="Search conversations…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="w-full bg-surface-2 rounded-[7px] px-3 py-1.5 text-[12px] text-text-primary outline-none placeholder:text-text-muted" />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {isLoadingConvs ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="h-[68px] bg-surface-2 rounded-[10px] animate-pulse mx-1 my-1" />
              ))
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-[12px]">No conversations yet</div>
            ) : (
              filtered.map((c) => (
                <ConvItem key={c.id} conv={c} selected={selConv?.id === c.id}
                  onClick={() => { setSelConv(c); setSendCh(c.channel || 'whatsapp'); }} />
              ))
            )}
          </div>
        </div>

        {/* Thread view */}
        <div className="flex-1 bg-surface-1 border border-surface-4 rounded-[14px] flex flex-col overflow-hidden">
          {selConv ? (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-4">
                <Avatar initials={toInitials(selectedLead?.name || '?')} size={32} />
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-text-primary">{selectedLead?.name || 'Unknown'}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] text-text-muted">{selectedLead?.phone || selectedLead?.email || '—'}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.open(`/app/crm`, '_self')}
                    className="text-[11px] font-bold text-text-muted hover:text-text-primary bg-surface-2 border border-surface-4 px-3 py-1.5 rounded-[7px] transition-colors">
                    View Lead
                  </button>
                  {selectedLead?.phone && (
                    <button onClick={() => window.open(`tel:${selectedLead.phone}`)}
                      className="text-[11px] font-bold text-text-muted hover:text-text-primary bg-surface-2 border border-surface-4 px-3 py-1.5 rounded-[7px] transition-colors">
                      📞 Call
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-3">
                {isLoadingThread ? (
                  <div className="flex justify-center items-center h-full"><Spinner size={24} /></div>
                ) : (
                  <>
                    {thread.map((msg) => <Bubble key={msg.id} msg={msg} />)}
                    {thread.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-text-muted">
                        <Icon name="dash" size={28} color="#4E4B58" />
                        <p className="text-[13px] font-semibold mt-3">No messages yet</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Composer */}
              <div className="border-t border-surface-4 p-3">
                <div className="flex gap-1.5 mb-2">
                  {['whatsapp', 'sms', 'email'].map((ch) => (
                    <button key={ch} onClick={() => setSendCh(ch)}
                      className={cn('px-2.5 py-[4px] text-[10.5px] font-bold rounded-[6px] border capitalize transition-colors',
                        sendCh === ch ? 'border-gold bg-[rgba(200,151,58,.1)] text-gold' : 'border-surface-4 text-text-muted hover:border-surface-5')}>
                      <Icon name={CHANNEL_ICONS[ch]} size={10} color={sendCh === ch ? CHANNEL_COLORS[ch] : '#4E4B58'} className="inline mr-1" />
                      {ch}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder={`Type a ${sendCh} message… (Enter to send)`}
                    rows={2}
                    className="flex-1 bg-surface-2 border border-surface-4 rounded-[10px] px-3 py-2 text-[12.5px] text-text-primary outline-none focus:border-gold transition-colors resize-none placeholder:text-text-muted" />
                  <Button onClick={send} disabled={!message.trim() || isSending} className="self-end">
                    {isSending ? <Spinner size={13} /> : 'Send'}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-text-muted">
              <Icon name="dash" size={32} color="#4E4B58" />
              <p className="text-[14px] font-semibold mt-4">Select a conversation</p>
              <p className="text-[12px] mt-1">Choose a thread from the left panel</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
