import { useEffect, useRef, useState } from 'react';
import { Button }  from '@/shared/components/ui/Button';
import { Icon }    from '@/shared/components/ui/Icon';
import { Input, Field, Textarea } from '@/shared/components/ui/Input';
import { LiveDot } from '@/shared/components/ui/LiveDot';
import { Spinner } from '@/shared/components/ui/Spinner';
import { Tabs }    from '@/shared/components/ui/Tabs';
import { useToast }      from '@/context/ToastContext';
import { aiApi } from '@/services/api/index';
import { G }  from '@/shared/utils/tokens';
import { cn } from '@/shared/utils/cn';

const TOOL_TABS = [
  { key:'desc',   label:'Description' },
  { key:'price',  label:'Pricing'     },
  { key:'social', label:'Social'      },
];

const QUICK_PROMPTS = [
  "Best price for 2021 Camry in Lagos?",
  "How to increase my conversion rate?",
  "Write Instagram caption for BMW X5",
  "Which cars are trending in Nigeria?",
  "Respond to customer asking 20% off",
  "30-day marketing plan for my dealership",
];

/* ── Chat bubble ─────────────────────────────────────────────── */
function Bubble({ message }) {
  const isMe = message.role === 'user';
  return (
    <div className={cn('flex', isMe ? 'justify-end' : 'justify-start gap-[7px]')}>
      {!isMe && (
        <div
          className="w-[24px] h-[24px] rounded-[6px] flex items-center justify-center shrink-0 mt-[2px]"
          style={{ background: `linear-gradient(135deg,${G.pu},${G.g})` }}
          aria-hidden="true"
        >
          <Icon name="ai" size={12} color="#fff" />
        </div>
      )}
      <div
        className="max-w-[78%] px-[13px] py-[9px] text-[13px] leading-[1.62] whitespace-pre-wrap"
        style={{
          borderRadius: isMe ? '13px 13px 4px 13px' : '13px 13px 13px 4px',
          background:   isMe ? `linear-gradient(135deg,${G.g},${G.gd})` : G.s3,
          color:        isMe ? G.bg : G.t0,
          border:       isMe ? 'none' : `1px solid ${G.s4}`,
        }}
      >
        {message.text}
      </div>
    </div>
  );
}

export function AiPage() {
  const toast = useToast();

  /* ── Chat state ───────────────────────────────────────────── */
  const [msgs,    setMsgs]    = useState([{ role:'assistant', text:"Hello! I'm AutoSys AI, powered by Claude.\n\nI help Nigerian car dealers with:\n• Vehicle descriptions & smart pricing\n• Lead follow-up messages\n• Social media content\n• Market strategy & analytics\n\nWhat would you like help with today?" }]);
  const [inp,     setInp]     = useState('');
  const [chatLoad,setChatLoad]= useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs, chatLoad]);

  const sendMessage = async () => {
    if (!inp.trim() || chatLoad) return;
    const text = inp;
    setInp('');
    const history = [...msgs, { role:'user', text }];
    setMsgs(history);
    setChatLoad(true);
    try {
      const { data } = await aiApi.chat(history.map((m) => ({ role: m.role, content: m.text })));
      const reply = data.text;
      setMsgs((m) => [...m, { role:'assistant', text: reply }]);
    } catch {
      setMsgs((m) => [...m, { role:'assistant', text:'⚠️ Connection error. Please try again.' }]);
    }
    setChatLoad(false);
  };

  /* ── Tool state ───────────────────────────────────────────── */
  const [tool,    setTool]    = useState('desc');
  const [toolRes, setToolRes] = useState('');
  const [toolLoad,setToolLoad]= useState(false);
  const [df, setDf] = useState({ brand:'Toyota', model:'Camry', year:'2022', mileage:'42000', condition:'foreign_used', features:'Leather seats, sunroof, Apple CarPlay' });
  const setField = (k) => (e) => setDf((f) => ({ ...f, [k]: e.target.value }));

  const runTool = async () => {
    setToolLoad(true);
    setToolRes('');
    try {
      let result = '';
      if (tool === 'desc')   { const { data } = await aiApi.description(df); result = data.text; }
      if (tool === 'price')  { const { data } = await aiApi.pricing(df); result = data.text; }
      if (tool === 'social') { const { data } = await aiApi.social({ ...df }); result = data.text; }
      setToolRes(result);
    } catch {
      setToolRes('Error generating. Please try again.');
    }
    setToolLoad(false);
  };

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">
      {/* Header */}
      <div className="flex items-center gap-[10px] mb-5">
        <div
          className="w-[36px] h-[36px] rounded-[9px] flex items-center justify-center border"
          style={{ background: G.pul, borderColor:`${G.pu}28` }}
        >
          <Icon name="ai" size={18} color={G.pu} />
        </div>
        <div>
          <h2 className="font-display text-[23px] font-bold">AI Assistant</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">Powered by Claude · Your dealership intelligence engine</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4 items-start">
        {/* Chat window */}
        <div className="bg-surface-2 border border-surface-4 rounded-[14px] overflow-hidden flex flex-col" style={{ height:580 }}>
          {/* Chat header */}
          <div className="px-4 py-[13px] border-b border-surface-4 flex items-center gap-[9px]">
            <div className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center shrink-0" style={{ background:`linear-gradient(135deg,${G.pu},${G.g})` }}>
              <Icon name="ai" size={15} color="#fff" />
            </div>
            <div>
              <div className="font-extrabold text-[13.5px]">AutoSys AI</div>
              <div className="text-[10px] flex items-center gap-[3px]" style={{ color:G.ok }}>
                <LiveDot />Claude · Online
              </div>
            </div>
          </div>

          {/* Quick prompts */}
          <div className="px-3 py-[9px] border-b border-surface-4 flex gap-[5px] overflow-x-auto">
            {QUICK_PROMPTS.slice(0, 4).map((p) => (
              <button
                key={p}
                onClick={() => setInp(p)}
                className="text-[10px] font-bold text-text-secondary bg-surface-3 border border-surface-4 rounded-[7px] px-2 py-[3px] cursor-pointer hover:bg-surface-4 transition-colors whitespace-nowrap shrink-0"
              >
                ⚡ {p.length > 26 ? p.slice(0,26)+'…' : p}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-[14px] py-[13px] flex flex-col gap-[10px]" role="log" aria-live="polite">
            {msgs.map((m, i) => <Bubble key={i} message={m} />)}
            {chatLoad && (
              <div className="flex gap-[7px]">
                <div className="w-[24px] h-[24px] rounded-[6px] flex items-center justify-center" style={{ background:`linear-gradient(135deg,${G.pu},${G.g})` }}>
                  <Icon name="ai" size={12} color="#fff" />
                </div>
                <div className="flex gap-1 px-[13px] py-[9px] bg-surface-3 rounded-[13px_13px_13px_4px] border border-surface-4">
                  {[0,1,2].map((i) => (
                    <div key={i} className="w-[5px] h-[5px] rounded-full bg-gold animate-pulse-dot" style={{ animationDelay:`${i*0.2}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="px-[13px] py-[11px] border-t border-surface-4 flex gap-[7px]">
            <input
              className="flex-1 bg-surface-3 border border-surface-4 rounded-[9px] px-[13px] py-[9px] text-text-primary font-sans text-[13.5px] font-semibold outline-none focus:border-gold transition-colors placeholder:text-text-muted placeholder:font-normal"
              placeholder="Ask anything…"
              value={inp}
              onChange={(e) => setInp(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              aria-label="Chat input"
            />
            <Button variant="gold" onClick={sendMessage} disabled={chatLoad} style={{ padding:'9px 13px' }}>
              {chatLoad ? <Spinner size={15} /> : <Icon name="arr" size={15} />}
            </Button>
          </div>
        </div>

        {/* Tools panel */}
        <div className="flex flex-col gap-4">
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4">
            <div className="font-display text-[16px] font-bold mb-3">AI Tools</div>
            <Tabs tabs={TOOL_TABS} active={tool} onChange={(k) => { setTool(k); setToolRes(''); }} className="w-full mb-3" />

            {/* Vehicle form fields */}
            <div className="flex flex-col gap-[9px]">
              {[['Make','make','Toyota'],['Model','model','Camry'],['Year','year','2022'],['Mileage (km)','mileage','42000']].map(([l,k,p]) => (
                <div key={k}>
                  <label className="block text-[10px] font-extrabold uppercase tracking-[1px] text-text-muted mb-[3px]">{l}</label>
                  <Input placeholder={p} value={df[k]} onChange={setField(k)} className="text-[12.5px] py-[7px] px-[10px]" />
                </div>
              ))}
              {tool === 'desc' && (
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-[1px] text-text-muted mb-[3px]">Key Features</label>
                  <Textarea rows={2} value={df.features} onChange={setField('features')} className="text-[12.5px] py-[7px] px-[10px]" />
                </div>
              )}
            </div>

            <Button variant="gold" size="sm" className="w-full justify-center mt-3" onClick={runTool} disabled={toolLoad}>
              {toolLoad ? <><Spinner size={12} />Generating…</> : <><Icon name="ai" size={13} />Generate</>}
            </Button>

            {toolRes && (
              <>
                <div className="h-[1px] bg-surface-4 my-[10px]" />
                <div
                  className="bg-surface-3 rounded-[8px] p-[11px] text-[12.5px] leading-[1.65] text-text-primary border border-surface-4 whitespace-pre-wrap max-h-[200px] overflow-y-auto"
                  role="region"
                  aria-label="Generated content"
                >
                  {toolRes}
                </div>
                <div className="flex gap-[6px] mt-2">
                  <Button variant="ghost" size="xs" className="flex-1 justify-center" onClick={() => { navigator.clipboard?.writeText(toolRes); toast('Copied!'); }}>
                    <Icon name="copy" size={11} />Copy
                  </Button>
                  <Button variant="ok" size="xs" className="flex-1 justify-center" onClick={() => toast('Applied!')}>
                    <Icon name="check" size={11} />Apply
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Quick prompts panel */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4">
            <div className="font-display text-[15px] font-bold mb-3">Quick Prompts</div>
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                onClick={() => setInp(q)}
                className="w-full flex items-center gap-2 text-[11px] font-bold text-text-secondary bg-transparent border border-surface-4 rounded-[8px] px-3 py-[6px] mb-[5px] cursor-pointer hover:bg-surface-3 hover:text-text-primary transition-all text-left"
              >
                <Icon name="zap" size={10} color={G.g} />
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
