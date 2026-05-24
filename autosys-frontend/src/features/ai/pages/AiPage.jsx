import { useEffect, useRef, useState, useCallback } from 'react';
import { Button }  from '@/shared/components/ui/Button';
import { Icon }    from '@/shared/components/ui/Icon';
import { Spinner } from '@/shared/components/ui/Spinner';
import { Tabs }    from '@/shared/components/ui/Tabs';
import { LiveDot } from '@/shared/components/ui/LiveDot';
import { useToast } from '@/context/ToastContext';
import { aiApi }    from '@/services/api';
import { G }        from '@/shared/utils/tokens';
import { cn }       from '@/shared/utils/cn';
import { useSalesStore } from '@/store/salesStore';
import { useCrmStore }   from '@/store/crmStore';

/* ══════════════════════════════════════════════════════════════
   AI DEPARTMENTS — fully automated AI teams
   ══════════════════════════════════════════════════════════════ */
const DEPARTMENTS = {
  finance: {
    name:  'AI Finance Team',
    icon:  'pay',
    color: G.ok,
    emoji: '💰',
    role:  'CFO Assistant',
    desc:  'Revenue analysis, pricing strategy, payment recovery, financial forecasting',
    systemPrompt: `You are the AI Finance Team for an Nigerian car dealership. Your role covers:
- Revenue analysis and monthly financial summaries
- Vehicle pricing strategy based on market data
- Payment recovery for pending/failed transactions
- Cash flow forecasting and profitability analysis
- Commission calculations and agent performance
- Cost optimization recommendations
Always respond in clear, actionable financial advice. Format numbers in Nigerian Naira (₦).`,
    quickPrompts: [
      'Analyze my revenue for this month',
      'Which vehicles have the best profit margin?',
      'How do I recover failed payments?',
      'Forecast next month revenue',
      'Calculate agent commission for this week',
      'Which payment gateway has lowest fees?',
    ],
    automations: [
      { id:'fin1', name:'Monthly P&L Report', trigger:'schedule.time', status:'active', lastRun:'Today 8:00 AM', nextRun:'Tomorrow 8:00 AM' },
      { id:'fin2', name:'Failed Payment Recovery', trigger:'payment.failed', status:'active', lastRun:'2h ago', nextRun:'On trigger' },
      { id:'fin3', name:'Low Inventory Alert', trigger:'vehicle.sold', status:'active', lastRun:'1d ago', nextRun:'On trigger' },
      { id:'fin4', name:'Weekly Revenue Summary', trigger:'schedule.time', status:'paused', lastRun:'Last Monday', nextRun:'Paused' },
    ],
  },
  sales: {
    name:  'AI Sales Team',
    icon:  'car',
    color: G.g,
    emoji: '🚗',
    role:  'Sales Director',
    desc:  'Lead scoring, deal coaching, inventory recommendations, closing strategies',
    systemPrompt: `You are the AI Sales Team for a Nigerian car dealership. Your role covers:
- Lead scoring and prioritization (0-100 score)
- Deal stage coaching and next-step recommendations
- Vehicle match recommendations based on customer budget/preferences
- Closing techniques adapted for Nigerian market
- Follow-up message drafting for WhatsApp/SMS
- Competitor pricing analysis
Always be practical, direct, and culturally aware of the Nigerian market. Reference local context where relevant.`,
    quickPrompts: [
      'Score my top leads and rank by priority',
      'How do I close a price-sensitive customer?',
      'Draft a WhatsApp follow-up for a hot lead',
      'Recommend vehicles for ₦20M budget',
      'What cars are trending in Lagos right now?',
      'How to handle a customer who wants 30% discount?',
    ],
    automations: [
      { id:'sal1', name:'Lead Score New Leads', trigger:'lead.created', status:'active', lastRun:'5m ago', nextRun:'On trigger' },
      { id:'sal2', name:'Auto Follow-up (No Reply)', trigger:'lead.no_activity', status:'active', lastRun:'1h ago', nextRun:'On trigger' },
      { id:'sal3', name:'Deal Stage Coach', trigger:'deal.moved', status:'active', lastRun:'30m ago', nextRun:'On trigger' },
      { id:'sal4', name:'Hot Lead Alert', trigger:'lead.updated', status:'active', lastRun:'15m ago', nextRun:'On trigger' },
    ],
  },
  support: {
    name:  'AI Customer Support',
    icon:  'phone',
    color: G.bl,
    emoji: '🎧',
    role:  'Support Manager',
    desc:  'Auto-reply drafting, complaint resolution, FAQ handling, customer satisfaction',
    systemPrompt: `You are the AI Customer Support Manager for a Nigerian car dealership. Your role covers:
- Drafting instant WhatsApp/email replies to customer inquiries
- Resolving complaints professionally and empathetically
- Answering FAQs about vehicle availability, pricing, and policies
- Escalation recommendations for complex issues
- Post-sale follow-up messages to ensure satisfaction
- Vehicle delivery confirmation and documentation guidance
Always be warm, professional, and patient. Use Nigerian-friendly language where appropriate.`,
    quickPrompts: [
      'Customer is angry about delivery delay — draft response',
      'FAQ: How does vehicle financing work?',
      'Customer asking if price is negotiable — how to respond?',
      'Post-sale thank you message template',
      'Customer wants warranty info — draft reply',
      'Handle a negative review on social media',
    ],
    automations: [
      { id:'sup1', name:'Auto WhatsApp Reply', trigger:'message.received', status:'active', lastRun:'2m ago', nextRun:'On trigger' },
      { id:'sup2', name:'Post-Sale Follow-up', trigger:'deal.won', status:'active', lastRun:'1d ago', nextRun:'On trigger' },
      { id:'sup3', name:'Review Request (7 days)', trigger:'deal.won', status:'active', lastRun:'3d ago', nextRun:'On trigger' },
      { id:'sup4', name:'Complaint Escalation Alert', trigger:'message.received', status:'paused', lastRun:'Never', nextRun:'Paused' },
    ],
  },
  marketing: {
    name:  'AI Marketing Team',
    icon:  'globe',
    color: G.pu,
    emoji: '📣',
    role:  'Marketing Director',
    desc:  'Social content, campaign strategy, SEO copy, audience targeting, ad creative',
    systemPrompt: `You are the AI Marketing Team for a Nigerian car dealership. Your role covers:
- Social media content creation for Instagram, Facebook, and TikTok
- WhatsApp broadcast campaign messages
- SEO website copy and vehicle listing descriptions
- Seasonal campaign strategies (Sallah, Christmas, back-to-school)
- Audience targeting recommendations
- Ad creative briefs for paid campaigns
Always write in engaging, culturally relevant Nigerian English. Use emojis where appropriate for social content.`,
    quickPrompts: [
      'Write Instagram caption for Toyota Camry',
      'Create Eid Mubarak car sales promotion',
      'Draft WhatsApp broadcast for new arrivals',
      'Write SEO meta description for our website',
      'Plan a 30-day content calendar',
      'Create Facebook ad copy for end-of-year sales',
    ],
    automations: [
      { id:'mkt1', name:'Auto-Post New Vehicle', trigger:'vehicle.created', status:'active', lastRun:'3h ago', nextRun:'On trigger' },
      { id:'mkt2', name:'Weekly New Arrivals Post', trigger:'schedule.time', status:'active', lastRun:'Monday', nextRun:'Next Monday' },
      { id:'mkt3', name:'Sold Vehicle Celebration Post', trigger:'vehicle.sold', status:'active', lastRun:'Yesterday', nextRun:'On trigger' },
      { id:'mkt4', name:'Lead Re-engagement Campaign', trigger:'lead.no_activity', status:'paused', lastRun:'Never', nextRun:'Paused' },
    ],
  },
};

const DEPT_TABS = [
  { key:'chat',        label:'AI Chat'      },
  { key:'finance',     label:'💰 Finance'   },
  { key:'sales',       label:'🚗 Sales'     },
  { key:'support',     label:'🎧 Support'   },
  { key:'marketing',   label:'📣 Marketing' },
  { key:'tools',       label:'🔧 Tools'     },
];

const TOOL_TABS = [{ key:'desc',label:'Description'},{ key:'price',label:'Pricing'},{ key:'social',label:'Social'}];

/* ── Chat bubble ────────────────────────────────────────────── */
function Bubble({ message, deptColor }) {
  const isMe = message.role==='user';
  return (
    <div className={cn('flex',isMe?'justify-end':'justify-start gap-[7px]')}>
      {!isMe&&<div className="w-[24px] h-[24px] rounded-[6px] flex items-center justify-center shrink-0 mt-[2px]" style={{background:`linear-gradient(135deg,${deptColor||G.pu},${G.g})`}}><Icon name="ai" size={12} color="#fff"/></div>}
      <div className="max-w-[78%] px-[13px] py-[9px] text-[13px] leading-[1.62] whitespace-pre-wrap"
        style={{borderRadius:isMe?'13px 13px 4px 13px':'13px 13px 13px 4px',background:isMe?`linear-gradient(135deg,${G.g},${G.gd})`:`${deptColor||G.s3}18` || G.s3,color:isMe?G.bg:G.t0,border:isMe?'none':`1px solid ${deptColor||G.s4}28`}}>
        {message.text}
      </div>
    </div>
  );
}

/* ── Department Chat ────────────────────────────────────────── */
function DeptChat({ deptKey }) {
  const dept = DEPARTMENTS[deptKey];
  const [msgs,    setMsgs]    = useState([{ role:'assistant', text:`Hello! I'm the ${dept.name}.\n\n${dept.desc}.\n\nAll my responses are automated and data-driven. What would you like help with?` }]);
  const [inp,     setInp]     = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const toast  = useToast();

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'});},[msgs,loading]);

  const send = async (text=inp) => {
    if(!text.trim()||loading)return;
    setInp('');
    const history=[...msgs,{role:'user',text}];
    setMsgs(history);
    setLoading(true);
    try{
      const{data}=await aiApi.chat([
        {role:'user',content:`[SYSTEM: ${dept.systemPrompt}]\n\nUser: ${text}`},
        ...history.slice(1).map(m=>({role:m.role==='user'?'user':'assistant',content:m.text})),
      ]);
      setMsgs(m=>[...m,{role:'assistant',text:data.text||data.reply||'I processed your request.'}]);
    }catch{
      setMsgs(m=>[...m,{role:'assistant',text:'⚠️ Connection error. Please try again.'}]);
    }
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
      <div className="bg-surface-2 border border-surface-4 rounded-[14px] overflow-hidden flex flex-col" style={{height:520}}>
        <div className="px-4 py-3 border-b border-surface-4 flex items-center gap-3" style={{background:`${dept.color}08`}}>
          <div className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center shrink-0" style={{background:`${dept.color}22`}}><span className="text-[16px]">{dept.emoji}</span></div>
          <div><div className="font-extrabold text-[13.5px]">{dept.name}</div><div className="text-[10px] flex items-center gap-[3px]" style={{color:G.ok}}><LiveDot/>{dept.role} · Online</div></div>
        </div>
        <div className="flex-1 overflow-y-auto px-[14px] py-[13px] flex flex-col gap-[10px]">
          {msgs.map((m,i)=><Bubble key={i} message={m} deptColor={dept.color}/>)}
          {loading&&<div className="flex gap-[7px]"><div className="w-[24px] h-[24px] rounded-[6px] flex items-center justify-center" style={{background:`${dept.color}22`}}><span className="text-[12px]">{dept.emoji}</span></div><div className="flex gap-1 px-[13px] py-[9px] bg-surface-3 rounded-[13px_13px_13px_4px] border border-surface-4">{[0,1,2].map(i=><div key={i} className="w-[5px] h-[5px] rounded-full bg-gold animate-pulse" style={{animationDelay:`${i*0.2}s`}}/>)}</div></div>}
          <div ref={endRef}/>
        </div>
        <div className="px-[13px] py-[11px] border-t border-surface-4 flex gap-[7px]">
          <input className="flex-1 bg-surface-3 border border-surface-4 rounded-[9px] px-[13px] py-[9px] text-text-primary font-sans text-[13.5px] font-semibold outline-none transition-colors placeholder:text-text-muted placeholder:font-normal" style={{'--tw-ring-color':dept.color}} placeholder={`Ask ${dept.name}…`} value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} />
          <Button onClick={()=>send()} disabled={loading} style={{background:dept.color,padding:'9px 13px'}}>{loading?<Spinner size={15}/>:<Icon name="arr" size={15} color="#fff"/>}</Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4">
          <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-widest mb-3">Quick Prompts</p>
          {dept.quickPrompts.map(q=>(
            <button key={q} onClick={()=>send(q)} className="w-full flex items-center gap-2 text-[11px] font-bold text-text-secondary bg-transparent border border-surface-4 rounded-[8px] px-3 py-[6px] mb-[5px] cursor-pointer hover:bg-surface-3 hover:text-text-primary transition-all text-left">
              <Icon name="zap" size={10} color={dept.color}/>{q}
            </button>
          ))}
        </div>

        <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4">
          <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-widest mb-3">Active Automations</p>
          {dept.automations.map(a=>(
            <div key={a.id} className="flex items-start gap-2 py-[8px] border-b border-surface-4 last:border-0">
              <span className={`w-2 h-2 rounded-full mt-[5px] shrink-0 ${a.status==='active'?'bg-green-400':'bg-surface-5'}`}/>
              <div className="flex-1 min-w-0">
                <p className="text-[11.5px] font-bold truncate">{a.name}</p>
                <p className="text-[9.5px] text-text-muted">Last: {a.lastRun}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Tools panel ────────────────────────────────────────────── */
function ToolsPanel() {
  const toast = useToast();
  const vehicles = useSalesStore(s=>s.vehicles);
  const leads    = useCrmStore(s=>s.leads);
  const [tool,    setTool]    = useState('desc');
  const [toolRes, setToolRes] = useState('');
  const [loading, setLoading] = useState(false);
  const [df, setDf] = useState({brand:'Toyota',model:'Camry',year:'2022',mileage:'42000',condition:'foreign_used',features:'Leather seats, sunroof, Apple CarPlay'});
  const setField = k=>e=>setDf(f=>({...f,[k]:e.target.value}));

  const runTool=async()=>{
    setLoading(true); setToolRes('');
    try{
      let result='';
      if(tool==='desc')  {const{data}=await aiApi.description(df); result=data.text;}
      if(tool==='price') {const{data}=await aiApi.pricing(df);     result=data.text;}
      if(tool==='social'){const{data}=await aiApi.social({...df}); result=data.text;}
      setToolRes(result);
    }catch{setToolRes('Error generating. Please try again.');}
    setLoading(false);
  };

  // Score all leads
  const scoreLeads=async()=>{
    if(!leads.length){toast('No leads to score','warning');return;}
    toast('Scoring leads in background…','ok');
    for(const lead of leads.slice(0,5)){
      try{await aiApi.scoreLead(lead.id);}catch{}
    }
    toast('Lead scoring complete! Refresh CRM to see scores.','ok');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
      <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-5">
        <h3 className="font-display text-[18px] font-bold mb-4">AI Tools</h3>
        <Tabs tabs={TOOL_TABS} active={tool} onChange={k=>{setTool(k);setToolRes('');}} className="w-full mb-4"/>
        <div className="flex flex-col gap-3">
          {[['Make','brand','Toyota'],['Model','model','Camry'],['Year','year','2022'],['Mileage (km)','mileage','42000']].map(([l,k,p])=>(
            <div key={k}><label className="block text-[10px] font-extrabold uppercase tracking-[1px] text-text-muted mb-[3px]">{l}</label><input placeholder={p} value={df[k]} onChange={setField(k)} className="w-full bg-surface-3 border border-surface-4 rounded-[9px] px-[13px] py-[9px] text-text-primary font-sans text-[12.5px] outline-none focus:border-gold transition-colors"/></div>
          ))}
          {tool==='desc'&&<div><label className="block text-[10px] font-extrabold uppercase tracking-[1px] text-text-muted mb-[3px]">Key Features</label><textarea rows={2} value={df.features} onChange={setField('features')} className="w-full bg-surface-3 border border-surface-4 rounded-[9px] px-[13px] py-[9px] text-text-primary text-[12.5px] outline-none focus:border-gold transition-colors resize-none"/></div>}
        </div>
        <Button variant="gold" size="sm" className="w-full justify-center mt-4" onClick={runTool} disabled={loading}>
          {loading?<><Spinner size={12}/>Generating…</>:<><Icon name="ai" size={13}/>Generate</>}
        </Button>
        {toolRes&&(
          <>
            <div className="h-[1px] bg-surface-4 my-[10px]"/>
            <div className="bg-surface-3 rounded-[8px] p-[11px] text-[12.5px] leading-[1.65] text-text-primary border border-surface-4 whitespace-pre-wrap max-h-[200px] overflow-y-auto">{toolRes}</div>
            <div className="flex gap-[6px] mt-2">
              <Button variant="ghost" size="xs" className="flex-1 justify-center" onClick={()=>{navigator.clipboard?.writeText(toolRes);toast('Copied!','ok');}}>
                <Icon name="copy" size={11}/>Copy
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="space-y-4">
        <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4">
          <h3 className="font-display text-[16px] font-bold mb-3">Batch Actions</h3>
          <div className="space-y-2">
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={scoreLeads}><Icon name="zap" size={13} color={G.g}/>Score All Leads ({leads.length})</Button>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={async()=>{toast('Generating descriptions for all vehicles…','ok');}}><Icon name="car" size={13} color={G.bl}/>Write Descriptions ({vehicles.length} vehicles)</Button>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={()=>toast('Weekly report generating…','ok')}><Icon name="chart" size={13} color={G.ok}/>Generate Weekly Report</Button>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={()=>toast('Social posts queued for all vehicles…','ok')}><Icon name="globe" size={13} color={G.pu}/>Post All New Vehicles to Social</Button>
          </div>
        </div>

        <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4">
          <h3 className="font-display text-[16px] font-bold mb-3">AI Department Status</h3>
          {Object.entries(DEPARTMENTS).map(([key,dept])=>(
            <div key={key} className="flex items-center gap-3 py-[9px] border-b border-surface-4 last:border-0">
              <span className="text-[16px]">{dept.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold truncate">{dept.name}</p>
                <p className="text-[10px] text-text-muted">{dept.automations.filter(a=>a.status==='active').length} active automations</p>
              </div>
              <span className="w-2 h-2 rounded-full bg-green-400"/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── General AI Chat ────────────────────────────────────────── */
function GeneralChat() {
  const toast = useToast();
  const [msgs,    setMsgs]    = useState([{ role:'assistant', text:"Hello! I'm AutoSys AI, powered by Claude.\n\nI help Nigerian car dealers with:\n• Vehicle descriptions & smart pricing\n• Lead follow-up messages\n• Social media content\n• Market strategy & analytics\n\nOr switch to a specialist department above for automated team support." }]);
  const [inp,     setInp]     = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  const QUICK = ["Best price for 2021 Camry in Lagos?","How to increase my conversion rate?","Write Instagram caption for BMW X5","Which cars are trending in Nigeria?","Respond to customer asking 20% off","30-day marketing plan for my dealership"];

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'});},[msgs,loading]);

  const send=async(text=inp)=>{
    if(!text.trim()||loading)return;
    setInp('');
    const history=[...msgs,{role:'user',text}];
    setMsgs(history);
    setLoading(true);
    try{
      const{data}=await aiApi.chat(history.map(m=>({role:m.role,content:m.text})));
      setMsgs(m=>[...m,{role:'assistant',text:data.text}]);
    }catch{
      setMsgs(m=>[...m,{role:'assistant',text:'⚠️ Connection error. Please try again.'}]);
    }
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_310px] gap-4">
      <div className="bg-surface-2 border border-surface-4 rounded-[14px] overflow-hidden flex flex-col" style={{height:520}}>
        <div className="px-4 py-[13px] border-b border-surface-4 flex items-center gap-[9px]">
          <div className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center shrink-0" style={{background:`linear-gradient(135deg,${G.pu},${G.g})`}}><Icon name="ai" size={15} color="#fff"/></div>
          <div><div className="font-extrabold text-[13.5px]">AutoSys AI</div><div className="text-[10px] flex items-center gap-[3px]" style={{color:G.ok}}><LiveDot/>Claude · Online</div></div>
        </div>
        <div className="px-3 py-[9px] border-b border-surface-4 flex gap-[5px] overflow-x-auto">
          {QUICK.slice(0,4).map(p=><button key={p} onClick={()=>setInp(p)} className="text-[10px] font-bold text-text-secondary bg-surface-3 border border-surface-4 rounded-[7px] px-2 py-[3px] cursor-pointer hover:bg-surface-4 transition-colors whitespace-nowrap shrink-0">⚡ {p.length>26?p.slice(0,26)+'…':p}</button>)}
        </div>
        <div className="flex-1 overflow-y-auto px-[14px] py-[13px] flex flex-col gap-[10px]">
          {msgs.map((m,i)=><Bubble key={i} message={m}/>)}
          {loading&&<div className="flex gap-[7px]"><div className="w-[24px] h-[24px] rounded-[6px] flex items-center justify-center" style={{background:`linear-gradient(135deg,${G.pu},${G.g})`}}><Icon name="ai" size={12} color="#fff"/></div><div className="flex gap-1 px-[13px] py-[9px] bg-surface-3 rounded-[13px_13px_13px_4px] border border-surface-4">{[0,1,2].map(i=><div key={i} className="w-[5px] h-[5px] rounded-full bg-gold animate-pulse" style={{animationDelay:`${i*0.2}s`}}/>)}</div></div>}
          <div ref={endRef}/>
        </div>
        <div className="px-[13px] py-[11px] border-t border-surface-4 flex gap-[7px]">
          <input className="flex-1 bg-surface-3 border border-surface-4 rounded-[9px] px-[13px] py-[9px] text-text-primary font-sans text-[13.5px] font-semibold outline-none focus:border-gold transition-colors placeholder:text-text-muted placeholder:font-normal" placeholder="Ask anything…" value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}/>
          <Button variant="gold" onClick={()=>send()} disabled={loading} style={{padding:'9px 13px'}}>{loading?<Spinner size={15}/>:<Icon name="arr" size={15}/>}</Button>
        </div>
      </div>
      <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4">
        <div className="font-display text-[15px] font-bold mb-3">Quick Prompts</div>
        {QUICK.map(q=><button key={q} onClick={()=>setInp(q)} className="w-full flex items-center gap-2 text-[11px] font-bold text-text-secondary bg-transparent border border-surface-4 rounded-[8px] px-3 py-[6px] mb-[5px] cursor-pointer hover:bg-surface-3 hover:text-text-primary transition-all text-left"><Icon name="zap" size={10} color={G.g}/>{q}</button>)}
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────── */
export function AiPage() {
  const [tab, setTab] = useState('chat');

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">
      <div className="flex items-center gap-[10px] mb-5">
        <div className="w-[36px] h-[36px] rounded-[9px] flex items-center justify-center border" style={{background:G.pul,borderColor:`${G.pu}28`}}><Icon name="ai" size={18} color={G.pu}/></div>
        <div>
          <h2 className="font-display text-[23px] font-bold">AI Assistant & Departments</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">Powered by Claude · 4 Automated AI Teams · Everything runs itself</p>
        </div>
      </div>

      {/* Department cards overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {Object.entries(DEPARTMENTS).map(([key,dept])=>(
          <button key={key} onClick={()=>setTab(key)} className={cn('text-left p-4 rounded-[14px] border transition-all hover:-translate-y-[2px]',tab===key?'border-gold bg-[rgba(200,151,58,.06)]':'border-surface-4 bg-surface-2 hover:border-surface-5')}>
            <div className="flex items-center gap-2 mb-2"><span className="text-[20px]">{dept.emoji}</span><span className="w-2 h-2 rounded-full bg-green-400 shrink-0"/></div>
            <p className="text-[12.5px] font-bold text-text-primary">{dept.name}</p>
            <p className="text-[10.5px] text-text-muted mt-[2px]">{dept.automations.filter(a=>a.status==='active').length} automations active</p>
          </button>
        ))}
      </div>

      <Tabs tabs={DEPT_TABS} active={tab} onChange={setTab} className="mb-5"/>

      {tab==='chat'      && <GeneralChat/>}
      {tab==='finance'   && <DeptChat deptKey="finance"/>}
      {tab==='sales'     && <DeptChat deptKey="sales"/>}
      {tab==='support'   && <DeptChat deptKey="support"/>}
      {tab==='marketing' && <DeptChat deptKey="marketing"/>}
      {tab==='tools'     && <ToolsPanel/>}
    </div>
  );
}
