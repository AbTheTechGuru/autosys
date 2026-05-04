import { useEffect, useRef, useState } from 'react';
import { Button }  from '@/shared/components/ui/Button';
import { Icon }    from '@/shared/components/ui/Icon';
import { Avatar }  from '@/shared/components/ui/Avatar';
import { LiveDot } from '@/shared/components/ui/LiveDot';
import { Spinner } from '@/shared/components/ui/Spinner';
import { SearchBar } from '@/shared/components/ui/Input';
import { useToast }  from '@/context/ToastContext';
import { aiApi } from '@/services/api/index';
import { cn } from '@/shared/utils/cn';
import { G }  from '@/shared/utils/tokens';

const CONVS = [
  { id:0, name:'Emeka Okafor',  phone:'08012345678', car:'Toyota Camry', unread:2, last:'Is the car still available?', t:'2m',  av:'EO', online:true  },
  { id:1, name:'Amaka Nwosu',   phone:'07098765432', car:'Mercedes GLE 450', unread:0, last:'Can you send the papers?',    t:'15m', av:'AN', online:false },
  { id:2, name:'Fatima Aliyu',  phone:'08133445566', car:'Honda CR-V', unread:1, last:"What's the best price?",       t:'1h',  av:'FA', online:true  },
  { id:3, name:'Biodun Adeyemi',phone:'09011223344', car:'Lexus RX 350', unread:0, last:'Thank you so much! 🙏',        t:'1d',  av:'BA', online:false },
];

const SEED_MSGS = {
  0: [{ from:'customer', text:'Hello, I saw your Toyota Camry. Is it still available?', tm:'9:40' },{ from:'customer', text:"What's your best price? I'm ready to buy today.", tm:'9:41' },{ from:'me', text:'Good morning Emeka! Yes, the 2022 Camry XSE V6 is still available at ₦18.5M. Excellent condition, 42,000km. Shall we schedule a viewing?', tm:'9:45' }],
  1: [{ from:'me', text:'Good morning Amaka! Following up on the Mercedes GLE 450 you inquired about.', tm:'Yesterday' },{ from:'customer', text:'Yes I\'m very interested! Can you send me the papers?', tm:'Yesterday' }],
  2: [{ from:'customer', text:"Hi, what's your best price for the Honda CR-V Hybrid?", tm:'10:15' }],
  3: [{ from:'me', text:'Congratulations on your new Lexus! We\'re honored to serve you. Enjoy! 🚗', tm:'Yesterday' },{ from:'customer', text:'Thank you so much! 🙏', tm:'Yesterday' }],
};

const QUICK_REPLIES = ['Still available! ✅','Great price! 🔥','Come for viewing 🚗','Confirmed ✓'];

export function WhatsAppPage() {
  const toast    = useToast();
  const [selIdx, setSelIdx] = useState(0);
  const [msgs,   setMsgs]   = useState(SEED_MSGS);
  const [text,   setText]   = useState('');
  const [aiLoad, setAiLoad] = useState(false);
  const endRef = useRef(null);

  const conv = CONVS[selIdx];
  const messages = msgs[selIdx] ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, selIdx]);

  const send = () => {
    if (!text.trim()) return;
    setMsgs((m) => ({
      ...m,
      [selIdx]: [...(m[selIdx] ?? []), { from:'me', text, tm:'Now' }],
    }));
    setText('');
    toast('Sent via WhatsApp!');
  };

  const generateReply = async () => {
    setAiLoad(true);
    try {
      const lastMsg = messages.filter((m) => m.from === 'customer').slice(-1)[0]?.text ?? '';
      const { data } = await aiApi.whatsappReply({
        customer_name:    conv.name,
        vehicle_interest: conv.car,
        last_message:     lastMsg,
      });
      const reply = data.text;
      setText(reply);
    } catch {
      setText('Thank you for your interest! The vehicle is still available. Would you like to schedule a viewing this week?');
    }
    setAiLoad(false);
  };

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-[88px] md:pb-[22px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-[23px] font-bold flex items-center gap-[10px]">
            <Icon name="wa" size={22} color="#25D366" /> WhatsApp CRM
          </h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">
            {CONVS.filter((c) => c.unread > 0).length} unread · {CONVS.filter((c) => c.online).length} online
          </p>
        </div>
        <Button variant="gold" size="sm" onClick={() => toast('Broadcast opened!')}>
          <Icon name="wa" size={13} />New Broadcast
        </Button>
      </div>

      {/* Chat layout */}
      <div
        className="border border-surface-4 rounded-[14px] overflow-hidden"
        style={{ height: 'calc(100vh - 220px)', minHeight: 500 }}
      >
        <div className="grid h-full" style={{ gridTemplateColumns: '292px 1fr' }}>
          {/* Conversation list */}
          <div className="bg-surface-2 border-r border-surface-4 flex flex-col overflow-hidden">
            <div className="p-[11px] border-b border-surface-4">
              <SearchBar placeholder="Search contacts…" />
            </div>
            <ul className="flex-1 overflow-y-auto" role="list">
              {CONVS.map((c, i) => (
                <li
                  key={c.id}
                  role="button"
                  aria-current={selIdx === i ? 'page' : undefined}
                  tabIndex={0}
                  onClick={() => setSelIdx(i)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelIdx(i)}
                  className={cn(
                    'flex gap-[10px] px-[13px] py-[11px] cursor-pointer border-b border-surface-4',
                    'border-l-2 transition-all',
                    selIdx === i
                      ? 'bg-[rgba(200,151,58,.1)] border-l-gold'
                      : 'border-l-transparent hover:bg-surface-3/50',
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar initials={c.av} size={36} />
                    {c.online && (
                      <div className="absolute bottom-0 right-0 w-[8px] h-[8px] rounded-full bg-status-ok border-2 border-surface-2" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-[2px]">
                      <div className="text-[13.5px] font-extrabold truncate">{c.name}</div>
                      <div className="text-[10px] text-text-muted shrink-0">{c.t}</div>
                    </div>
                    <div className="text-[11.5px] text-text-secondary truncate mb-[2px]">{c.last}</div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gold">{c.car}</span>
                      {c.unread > 0 && (
                        <span className="w-[17px] h-[17px] rounded-full bg-[#25D366] text-white text-[9.5px] font-extrabold flex items-center justify-center">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Chat panel */}
          <div className="flex flex-col bg-surface-1">
            {/* Chat header */}
            <div
              className="flex items-center gap-3 px-[18px] py-[13px]"
              style={{ background: 'linear-gradient(135deg,#128C7E,#075E54)' }}
            >
              <div className="relative shrink-0">
                <Avatar initials={conv.av} size={36} />
                {conv.online && (
                  <div className="absolute bottom-0 right-0 w-[8px] h-[8px] rounded-full bg-status-ok border-2 border-[#128C7E]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-[14px] text-white">{conv.name}</div>
                <div className="text-[11.5px] text-white/70">
                  {conv.online ? 'Online' : 'Last seen recently'} · {conv.phone}
                </div>
              </div>
              <div className="flex gap-2">
                {['Call','View Lead'].map((l) => (
                  <button
                    key={l}
                    className="text-[11px] font-bold text-white bg-white/15 border-none rounded-[7px] px-[8px] py-[3px] cursor-pointer hover:bg-white/25 transition-colors"
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-[18px] py-4 flex flex-col gap-2">
              {messages.map((m, i) => (
                <div key={i} className={cn('flex', m.from === 'me' ? 'justify-end' : 'justify-start')}>
                  <div className={m.from === 'me' ? 'wa-bubble-out' : 'wa-bubble-in'}>
                    <p className="text-[13.5px] leading-[1.55]" style={{ color: m.from === 'me' ? '#fff' : G.t0 }}>
                      {m.text}
                    </p>
                    <p className="text-[10px] mt-1 text-right" style={{ color: m.from === 'me' ? 'rgba(255,255,255,.6)' : G.t2 }}>
                      {m.tm}{m.from === 'me' && ' ✓✓'}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="px-[15px] py-[11px] border-t border-surface-4 bg-surface-2">
              {/* Quick actions + AI */}
              <div className="flex gap-2 mb-2 flex-wrap">
                <Button variant="ghost" size="xs" onClick={generateReply} disabled={aiLoad}>
                  {aiLoad ? <><Spinner size={11} />Generating…</> : <><Icon name="ai" size={11} color={G.pu} />AI Reply</>}
                </Button>
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => setText(q)}
                    className="text-[10px] font-bold text-text-secondary bg-surface-3 border border-surface-4 rounded-[7px] px-2 py-[3px] cursor-pointer hover:bg-surface-4 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  className="flex-1 bg-surface-3 border border-surface-4 rounded-[9px] px-[13px] py-[9px] text-text-primary font-sans text-[13.5px] font-semibold outline-none focus:border-gold transition-colors placeholder:text-text-muted placeholder:font-normal"
                  placeholder="Type a message…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  aria-label="Message input"
                />
                <button
                  onClick={send}
                  aria-label="Send message"
                  className="px-[15px] py-[9px] rounded-[9px] border-none cursor-pointer flex items-center gap-1 font-bold transition-colors hover:brightness-110"
                  style={{ background: '#25D366', color: '#fff' }}
                >
                  <Icon name="send" size={14} color="#fff" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
