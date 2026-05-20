import { useEffect, useRef, useState, useCallback } from 'react';
import { Button }  from '@/shared/components/ui/Button';
import { Icon }    from '@/shared/components/ui/Icon';
import { Avatar, toInitials } from '@/shared/components/ui/Avatar';
import { LiveDot } from '@/shared/components/ui/LiveDot';
import { Spinner } from '@/shared/components/ui/Spinner';
import { SearchBar } from '@/shared/components/ui/Input';
import { useToast }  from '@/context/ToastContext';
import { inboxApi, aiApi } from '@/services/api/index';
import { cn } from '@/shared/utils/cn';
import { G }  from '@/shared/utils/tokens';

const QUICK_REPLIES = [
  'Still available! ✅',
  'Great price! 🔥',
  'Come for viewing 🚗',
  'Confirmed ✓',
  'Let me check and get back to you.',
];

// Seed conversations shown instantly before backend responds
const SEED_CONVS = [
  { id:'sc-0', lead_id:'sc-0', leads:{ name:'Emeka Okafor',   phone:'08012345678' }, body:'Is the car still available?',     created_at: new Date(Date.now()-120000).toISOString(),  unread_count:2, channel:'whatsapp' },
  { id:'sc-1', lead_id:'sc-1', leads:{ name:'Amaka Nwosu',    phone:'07098765432' }, body:'Can you send the papers?',        created_at: new Date(Date.now()-900000).toISOString(),  unread_count:0, channel:'whatsapp' },
  { id:'sc-2', lead_id:'sc-2', leads:{ name:'Fatima Aliyu',   phone:'08133445566' }, body:"What's the best price?",         created_at: new Date(Date.now()-3600000).toISOString(), unread_count:1, channel:'whatsapp' },
  { id:'sc-3', lead_id:'sc-3', leads:{ name:'Biodun Adeyemi', phone:'09011223344' }, body:'Thank you so much! 🙏',           created_at: new Date(Date.now()-86400000).toISOString(),unread_count:0, channel:'whatsapp' },
];
const SEED_THREADS = {
  'sc-0': [
    { id:'m1', direction:'in',  body:'Hello, I saw your Toyota Camry. Is it still available?',           created_at:new Date(Date.now()-7200000).toISOString() },
    { id:'m2', direction:'in',  body:"What's your best price? I'm ready to buy today.",                  created_at:new Date(Date.now()-7100000).toISOString() },
    { id:'m3', direction:'out', body:'Good morning Emeka! Yes, the 2022 Camry XSE V6 is still available at ₦18.5M. Excellent condition, 42,000km. Shall we schedule a viewing?', created_at:new Date(Date.now()-7000000).toISOString() },
  ],
  'sc-1': [
    { id:'m4', direction:'out', body:'Good morning Amaka! Following up on the Mercedes GLE 450 you enquired about.', created_at:new Date(Date.now()-86400000).toISOString() },
    { id:'m5', direction:'in',  body:"Yes I'm very interested! Can you send me the papers?",                         created_at:new Date(Date.now()-82800000).toISOString() },
  ],
};

export function WhatsAppPage() {
  const toast = useToast();

  const [convs,      setConvs]      = useState(SEED_CONVS);
  const [thread,     setThread]     = useState(SEED_THREADS['sc-0'] ?? []);
  const [selConv,    setSelConv]    = useState(SEED_CONVS[0]);
  const [text,       setText]       = useState('');
  const [aiLoad,     setAiLoad]     = useState(false);
  const [isSending,  setIsSending]  = useState(false);
  const [isLoadingConvs, setIsLoadingConvs] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [searchQ,    setSearchQ]    = useState('');
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread]);

  /* ── Fetch WhatsApp conversations ─────────────────────────── */
  const fetchConvs = useCallback(async () => {
    setIsLoadingConvs(true);
    try {
      const { data } = await inboxApi.getConversations({ channel: 'whatsapp' });
      const fetched = data.conversations ?? [];
      if (fetched.length > 0) {
        setConvs(fetched);
        setSelConv(fetched[0]);
      }
    } catch { /* keep seed */ } finally {
      setIsLoadingConvs(false);
    }
  }, []);

  useEffect(() => { fetchConvs(); }, [fetchConvs]);

  /* ── Fetch thread ─────────────────────────────────────────── */
  useEffect(() => {
    if (!selConv?.lead_id) return;
    // Use seed thread for seed IDs
    if (selConv.lead_id.startsWith('sc-')) {
      setThread(SEED_THREADS[selConv.lead_id] ?? []);
      return;
    }
    setIsLoadingThread(true);
    inboxApi.getThread(selConv.lead_id, 'whatsapp')
      .then(({ data }) => setThread(data.messages ?? []))
      .catch(() => setThread([]))
      .finally(() => setIsLoadingThread(false));
  }, [selConv]);

  /* ── Send ─────────────────────────────────────────────────── */
  const send = async (msgText = text) => {
    if (!msgText.trim() || !selConv?.lead_id) return;
    const optimistic = { id:`local-${Date.now()}`, direction:'out', body:msgText, created_at:new Date().toISOString() };
    setThread((t) => [...t, optimistic]);
    setText('');
    setIsSending(true);
    try {
      await inboxApi.send({ leadId: selConv.lead_id, channel: 'whatsapp', message: msgText });
      toast('Sent via WhatsApp!');
    } catch (err) {
      setThread((t) => t.filter((m) => m.id !== optimistic.id));
      toast(err.response?.data?.message || 'WhatsApp not connected — check Settings → Integrations', 'danger');
      setText(msgText);
    } finally {
      setIsSending(false);
    }
  };

  /* ── AI reply ─────────────────────────────────────────────── */
  const generateAiReply = async () => {
    if (!selConv?.lead_id) return;
    setAiLoad(true);
    try {
      const { data } = await aiApi.followup(selConv.lead_id);
      setText(data.text);
    } catch {
      setText('Thank you for your message! We have the vehicle available and would love to arrange a viewing for you. When would be a good time? 🚗');
    } finally {
      setAiLoad(false);
    }
  };

  const filteredConvs = searchQ
    ? convs.filter((c) => (c.leads?.name || '').toLowerCase().includes(searchQ.toLowerCase()))
    : convs;

  const totalUnread = convs.reduce((s, c) => s + (c.unread_count || 0), 0);
  const lead        = selConv?.leads;

  return (
    <div className="max-w-[1400px] px-4 md:px-[22px] pt-[22px] pb-[88px] md:pb-[22px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-[23px] font-bold flex items-center gap-[10px]">
            <Icon name="wa" size={22} color="#25D366" /> WhatsApp CRM
          </h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">
            {totalUnread > 0 ? `${totalUnread} unread · ` : ''}{convs.length} conversations
          </p>
        </div>
      </div>

      <div className="flex gap-3 h-[calc(100vh-180px)] min-h-[500px]">
        {/* Left: conversation list */}
        <div className="w-[270px] shrink-0 bg-surface-1 border border-surface-4 rounded-[14px] flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-surface-4">
            <SearchBar placeholder="Search…" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} className="text-[12px]" />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {isLoadingConvs
              ? Array(4).fill(0).map((_, i) => <div key={i} className="h-[64px] bg-surface-2 rounded-[10px] animate-pulse my-1" />)
              : filteredConvs.map((c) => {
                const name    = c.leads?.name || 'Unknown';
                const unread  = c.unread_count || 0;
                const preview = (c.body || '').slice(0, 42) + ((c.body || '').length > 42 ? '…' : '');
                const time    = c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '';
                return (
                  <button key={c.id} onClick={() => setSelConv(c)}
                    className={cn('w-full text-left flex items-start gap-3 px-3 py-[10px] rounded-[10px] border transition-all',
                      selConv?.id === c.id
                        ? 'bg-[rgba(37,211,102,.08)] border-[rgba(37,211,102,.25)]'
                        : 'bg-transparent border-transparent hover:bg-surface-2 hover:border-surface-4')}>
                    <Avatar initials={toInitials(name)} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <span className="text-[12.5px] font-bold truncate">{name}</span>
                        <span className="text-[10px] text-text-muted shrink-0">{time}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-[2px]">
                        <p className="text-[11.5px] text-text-muted truncate flex-1">{preview}</p>
                        {unread > 0 && (
                          <span className="shrink-0 bg-[#25D366] text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            }
          </div>
        </div>

        {/* Right: thread + composer */}
        <div className="flex-1 bg-surface-1 border border-surface-4 rounded-[14px] flex flex-col overflow-hidden">
          {selConv && lead ? (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-4"
                style={{ background:'rgba(37,211,102,.04)' }}>
                <div className="w-[34px] h-[34px] rounded-full bg-[#25D366] flex items-center justify-center text-[14px] font-extrabold text-white">
                  {toInitials(lead.name)}
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-text-primary">{lead.name}</p>
                  <p className="text-[10.5px] text-text-muted">{lead.phone || '—'}</p>
                </div>
                {lead.phone && (
                  <button onClick={() => window.open(`tel:${lead.phone}`)}
                    className="text-[11px] font-bold text-text-muted hover:text-text-primary bg-surface-2 border border-surface-4 px-3 py-1.5 rounded-[7px] transition-colors">
                    📞 Call
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3"
                style={{ background:'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.02\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")' }}>
                {isLoadingThread
                  ? <div className="flex justify-center pt-10"><Spinner size={24} /></div>
                  : (
                    <>
                      {thread.map((msg) => {
                        const isOut = msg.direction === 'out';
                        const time  = msg.created_at
                          ? new Date(msg.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
                          : 'Now';
                        return (
                          <div key={msg.id} className={cn('flex mb-3', isOut ? 'justify-end' : 'justify-start')}>
                            <div className={cn('max-w-[72%] px-3 py-2 rounded-[12px] text-[12.5px] leading-[1.5] shadow-sm',
                              isOut
                                ? 'text-[#111] rounded-br-[4px]'
                                : 'bg-surface-2 border border-surface-4 text-text-primary rounded-bl-[4px]')}
                              style={isOut ? { background:'linear-gradient(135deg,#25D366,#20c65a)' } : {}}>
                              <p>{msg.body}</p>
                              <p className={cn('text-[9.5px] mt-1 font-medium', isOut ? 'text-[rgba(0,0,0,.5)] text-right' : 'text-text-muted')}>
                                {time}{isOut ? ' ✓✓' : ''}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      {thread.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-text-muted">
                          <Icon name="wa" size={28} color="#4E4B58" />
                          <p className="text-[13px] font-semibold mt-3">No messages yet</p>
                        </div>
                      )}
                      <div ref={endRef} />
                    </>
                  )
                }
              </div>

              {/* Quick replies */}
              <div className="px-4 pt-2 flex gap-1.5 overflow-x-auto border-t border-surface-4">
                {QUICK_REPLIES.map((qr) => (
                  <button key={qr} onClick={() => send(qr)}
                    className="shrink-0 text-[10.5px] font-bold px-2.5 py-[5px] rounded-full border border-[rgba(37,211,102,.3)] text-[#25D366] bg-[rgba(37,211,102,.07)] hover:bg-[rgba(37,211,102,.14)] transition-colors whitespace-nowrap mb-2">
                    {qr}
                  </button>
                ))}
              </div>

              {/* Composer */}
              <div className="px-3 pb-3">
                <div className="flex gap-2 items-end">
                  <button onClick={generateAiReply} disabled={aiLoad}
                    className="w-8 h-8 rounded-full bg-[rgba(124,58,237,.15)] border border-[rgba(124,58,237,.3)] flex items-center justify-center shrink-0 transition-colors hover:bg-[rgba(124,58,237,.25)]">
                    {aiLoad ? <Spinner size={13} /> : <Icon name="ai" size={13} color={G.pu} />}
                  </button>
                  <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Type a WhatsApp message… (Enter to send)"
                    className="flex-1 bg-surface-2 border border-surface-4 rounded-[10px] px-3 py-2 text-[12.5px] text-text-primary outline-none focus:border-[#25D366] transition-colors resize-none placeholder:text-text-muted" />
                  <Button onClick={() => send()} disabled={!text.trim() || isSending}
                    style={{ background:'linear-gradient(135deg,#25D366,#20c65a)', border:'none', color:'#111' }}
                    className="self-end">
                    {isSending ? <Spinner size={13} /> : 'Send'}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-text-muted">
              <Icon name="wa" size={32} color="#4E4B58" />
              <p className="text-[14px] font-semibold mt-4">Select a conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
