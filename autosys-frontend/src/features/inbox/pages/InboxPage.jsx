import { useState } from 'react';
import { Icon }    from '@/shared/components/ui/Icon';
import { Avatar, toInitials } from '@/shared/components/ui/Avatar';
import { Button }  from '@/shared/components/ui/Button';
import { Badge }   from '@/shared/components/ui/Badge';
import { LiveDot } from '@/shared/components/ui/LiveDot';
import { cn }      from '@/shared/utils/cn';
import { useToast } from '@/context/ToastContext';

/* ── Mock data ──────────────────────────────────────────────── */
const CHANNELS = [
  { key: 'all',      label: 'All',       icon: 'dash',   color: '#C8973A' },
  { key: 'whatsapp', label: 'WhatsApp',  icon: 'wa',     color: '#25D366' },
  { key: 'sms',      label: 'SMS',       icon: 'phone',  color: '#3B82F6' },
  { key: 'email',    label: 'Email',     icon: 'report', color: '#6366F1' },
];

const CONVERSATIONS = [
  { id: 1, name: 'Emeka Okafor',   channel: 'whatsapp', unread: 2, last: 'Is the Camry still available?', time: '2m',   online: true,  phone: '+2348012345678', stage: 'new'       },
  { id: 2, name: 'James Wilson',   channel: 'email',    unread: 1, last: 'Re: Toyota Land Cruiser enquiry', time: '15m', online: false, email: 'james@email.com', stage: 'negotiating' },
  { id: 3, name: 'Fatima Aliyu',   channel: 'sms',      unread: 0, last: "What's the final price?",      time: '1h',   online: true,  phone: '+2348133445566', stage: 'contacted'  },
  { id: 4, name: 'Amaka Nwosu',    channel: 'whatsapp', unread: 3, last: 'Can you send the documents?',  time: '2h',   online: false, phone: '+2347098765432', stage: 'new'        },
  { id: 5, name: 'David Chen',     channel: 'email',    unread: 0, last: 'Thank you for your time!',     time: '1d',   online: false, email: 'dchen@corp.com', stage: 'closed_won' },
  { id: 6, name: 'Biodun Adeyemi', channel: 'sms',      unread: 1, last: 'Please send me your address',  time: '3h',   online: true,  phone: '+2349011223344', stage: 'contacted'  },
];

const THREAD_SEED = {
  1: [
    { id: 1, dir: 'in',  body: 'Hello, I saw your Toyota Camry. Is it still available?',         time: '09:40', ch: 'whatsapp' },
    { id: 2, dir: 'in',  body: "What's your best price? I'm ready to buy today.",               time: '09:41', ch: 'whatsapp' },
    { id: 3, dir: 'out', body: 'Good morning Emeka! Yes, still available at ₦18.5M. Excellent condition, 42,000km. Can we schedule a test drive?', time: '09:45', ch: 'whatsapp' },
  ],
  2: [
    { id: 1, dir: 'in',  body: 'Hi, I sent an enquiry about the Land Cruiser last week.',       time: 'Yesterday', ch: 'email', subject: 'Re: Toyota Land Cruiser enquiry' },
    { id: 2, dir: 'out', body: 'Good afternoon James, yes we still have the 2022 Land Cruiser VX. Would you like full specs?', time: 'Yesterday', ch: 'email' },
  ],
  3: [
    { id: 1, dir: 'in',  body: 'Hi, what is the final price for the Honda CR-V?',              time: '11:00', ch: 'sms' },
    { id: 2, dir: 'out', body: 'Hi Fatima! Best price is ₦14.8M. Fully serviced, ready to drive. Shall I send photos?', time: '11:03', ch: 'sms' },
    { id: 3, dir: 'in',  body: "What's the final price?",                                       time: '12:30', ch: 'sms' },
  ],
};

const CHANNEL_COLORS = { whatsapp: '#25D366', sms: '#3B82F6', email: '#6366F1', call: '#F59E0B' };
const CHANNEL_ICONS  = { whatsapp: 'wa', sms: 'phone', email: 'report', call: 'phone' };

const STAGE_COLORS = {
  new: '#3B82F6', contacted: '#F59E0B', negotiating: '#8B5CF6', closed_won: '#16A34A', closed_lost: '#EF4444',
};

/* ── Thread message bubble ──────────────────────────────────── */
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
        <p className={cn('text-[9.5px] mt-1 font-medium', isOut ? 'text-gold/60 text-right' : 'text-text-muted')}>{msg.time}</p>
      </div>
    </div>
  );
}

/* ── Conversation list item ─────────────────────────────────── */
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
      )}>
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
          <p className="text-[11.5px] text-text-muted truncate">{conv.last}</p>
          {conv.unread > 0 && (
            <span className="ml-auto shrink-0 bg-[#3B82F6] text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
              {conv.unread}
            </span>
          )}
        </div>
        <span className="text-[9.5px] font-bold px-[5px] py-[1px] rounded-full mt-0.5 inline-block"
          style={{ background: `${STAGE_COLORS[conv.stage]}18`, color: STAGE_COLORS[conv.stage] }}>
          {conv.stage?.replace('_', ' ')}
        </span>
      </div>
    </button>
  );
}

/* ── Main Page ──────────────────────────────────────────────── */
export function InboxPage() {
  const toast = useToast();
  const [channel, setChannel]   = useState('all');
  const [selId, setSelId]       = useState(1);
  const [message, setMessage]   = useState('');
  const [sendCh, setSendCh]     = useState('whatsapp');
  const [threads, setThreads]   = useState(THREAD_SEED);

  const filtered = channel === 'all' ? CONVERSATIONS : CONVERSATIONS.filter((c) => c.channel === channel);
  const selected = CONVERSATIONS.find((c) => c.id === selId);
  const thread   = threads[selId] || [];
  const totalUnread = CONVERSATIONS.reduce((s, c) => s + c.unread, 0);

  const send = () => {
    if (!message.trim()) return;
    setThreads((prev) => ({
      ...prev,
      [selId]: [...(prev[selId] || []), {
        id: Date.now(), dir: 'out', body: message, time: 'Now', ch: sendCh,
      }],
    }));
    setMessage('');
    toast(`Sent via ${sendCh.charAt(0).toUpperCase() + sendCh.slice(1)}!`);
  };

  return (
    <div className="max-w-[1400px] px-4 md:px-[22px] pt-[22px] pb-[88px] md:pb-[22px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-[23px] font-bold flex items-center gap-[10px]">
            <Icon name="dash" size={22} color="#C8973A" /> Unified Inbox
          </h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">
            {totalUnread} unread · WhatsApp, SMS, Email in one place
          </p>
        </div>
        <div className="flex gap-2">
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
            <input placeholder="Search conversations…"
              className="w-full bg-surface-2 rounded-[7px] px-3 py-1.5 text-[12px] text-text-primary outline-none placeholder:text-text-muted" />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {filtered.map((c) => (
              <ConvItem key={c.id} conv={c} selected={selId === c.id} onClick={() => setSelId(c.id)} />
            ))}
          </div>
        </div>

        {/* Thread view */}
        <div className="flex-1 bg-surface-1 border border-surface-4 rounded-[14px] flex flex-col overflow-hidden">
          {/* Thread header */}
          {selected && (
            <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-4">
              <Avatar initials={toInitials(selected.name)} size={32} />
              <div className="flex-1">
                <p className="text-[13px] font-bold text-text-primary">{selected.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] text-text-muted">
                    {selected.phone || selected.email}
                  </span>
                  {selected.online && <LiveDot />}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="text-[11px] font-bold text-text-muted hover:text-text-primary bg-surface-2 border border-surface-4 px-3 py-1.5 rounded-[7px] transition-colors">
                  View Lead
                </button>
                <button onClick={() => { if (selected.phone) window.open(`tel:${selected.phone}`); }}
                  className="text-[11px] font-bold text-text-muted hover:text-text-primary bg-surface-2 border border-surface-4 px-3 py-1.5 rounded-[7px] transition-colors">
                  📞 Call
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {thread.map((msg) => <Bubble key={msg.id} msg={msg} />)}
            {thread.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-text-muted">
                <Icon name="dash" size={28} color="#4E4B58" />
                <p className="text-[13px] font-semibold mt-3">No messages yet</p>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-surface-4 p-3">
            {/* Channel selector */}
            <div className="flex gap-1.5 mb-2">
              {(['whatsapp', 'sms', 'email']).map((ch) => (
                <button key={ch} onClick={() => setSendCh(ch)}
                  className={cn('px-2.5 py-[4px] text-[10.5px] font-bold rounded-[6px] border capitalize transition-colors',
                    sendCh === ch
                      ? 'border-gold bg-[rgba(200,151,58,.1)] text-gold'
                      : 'border-surface-4 text-text-muted hover:border-surface-5')}>
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
              <Button onClick={send} disabled={!message.trim()} className="self-end">
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
