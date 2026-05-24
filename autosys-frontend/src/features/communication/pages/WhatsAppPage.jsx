import { useEffect, useRef, useState, useCallback } from 'react';
import { Button }  from '@/shared/components/ui/Button';
import { Icon }    from '@/shared/components/ui/Icon';
import { Avatar, toInitials } from '@/shared/components/ui/Avatar';
import { Spinner } from '@/shared/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { inboxApi, aiApi } from '@/services/api';
import { cn } from '@/shared/utils/cn';
import { G }  from '@/shared/utils/tokens';

const CH_COLOR = { whatsapp:'#25D366', sms:'#3B82F6', email:'#6366F1' };
const STAGE_COLOR = { new:'#3B82F6', contacted:'#F59E0B', negotiating:'#8B5CF6', closed_won:'#16A34A', closed_lost:'#EF4444' };

const mapConv = (m) => {
  const lead = m.leads||{};
  const diff = Date.now()-new Date(m.created_at);
  const time = diff<60000?'Just now':diff<3600000?`${Math.floor(diff/60000)}m`:diff<86400000?`${Math.floor(diff/3600000)}h`:`${Math.floor(diff/86400000)}d`;
  return { id:lead.id||m.lead_id, lead_id:lead.id||m.lead_id, name:lead.name||'Unknown', phone:lead.phone||null, car:lead.vehicle_interest||'', stage:lead.stage||'new', channel:m.channel||'whatsapp', unread:m.unread_count||0, last:m.body||'', time };
};
const mapMsg = (m) => ({ id:m.id, from:m.direction==='inbound'?'customer':'me', text:m.body||'', tm:m.created_at?new Date(m.created_at).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'}):'Now', status:m.status });

const QUICK_REPLIES = ['Still available! ✅','Great price! 🔥','Come for viewing 🚗','I will send details shortly 📋','Thank you for your interest! 🙏'];

export function WhatsAppPage() {
  const toast = useToast();
  const [convs,  setConvs]  = useState([]);
  const [msgs,   setMsgs]   = useState([]);
  const [selConv,setSelConv]= useState(null);
  const [text,   setText]   = useState('');
  const [aiLoad, setAiLoad] = useState(false);
  const [loading,setLoading]= useState(true);
  const [threadLoad,setThreadLoad]=useState(false);
  const [sending,setSending]=useState(false);
  const endRef = useRef(null);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}); },[msgs]);

  const fetchConvs=useCallback(async()=>{
    setLoading(true);
    try{
      const{data}=await inboxApi.getConversations({channel:'whatsapp',limit:20});
      const mapped=(data.conversations??[]).map(mapConv);
      setConvs(mapped);
      if(mapped.length&&!selConv){setSelConv(mapped[0]);}
    }catch(err){toast(err.response?.data?.message||'Failed to load WhatsApp','danger');}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{fetchConvs();},[fetchConvs]);

  useEffect(()=>{
    if(!selConv?.lead_id)return;
    setThreadLoad(true);
    inboxApi.getThread(selConv.lead_id,'whatsapp')
      .then(({data})=>setMsgs((data.messages??[]).map(mapMsg).reverse()))
      .catch(()=>setMsgs([]))
      .finally(()=>setThreadLoad(false));
  },[selConv]);

  const send = async (msgText=text) => {
    if(!msgText.trim()||!selConv?.lead_id)return;
    setSending(true);
    const opt={id:`temp-${Date.now()}`,from:'me',text:msgText,tm:'Now',status:'sending'};
    setMsgs(prev=>[...prev,opt]); setText('');
    try{
      await inboxApi.send({leadId:selConv.lead_id,channel:'whatsapp',message:msgText});
      setMsgs(prev=>prev.map(m=>m.id===opt.id?{...m,status:'sent'}:m));
      setConvs(prev=>prev.map(c=>c.lead_id===selConv.lead_id?{...c,last:msgText}:c));
    }catch(err){
      setMsgs(prev=>prev.map(m=>m.id===opt.id?{...m,status:'failed'}:m));
      toast(err.response?.data?.message||'Failed to send','danger');
    }finally{setSending(false);}
  };

  const generateAiReply = async () => {
    if(!selConv?.lead_id)return;
    setAiLoad(true);
    try{
      const{data}=await aiApi.whatsappReply({leadId:selConv.lead_id,lastMessage:msgs[msgs.length-1]?.text||''});
      setText(data.text||data.reply||'');
    }catch{toast('AI unavailable','danger');}
    finally{setAiLoad(false);}
  };

  return (
    <div className="max-w-[1400px] px-4 md:px-[22px] pt-[22px] pb-[88px] md:pb-[22px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-[23px] font-bold flex items-center gap-2"><span className="text-[#25D366] text-xl">💬</span> WhatsApp CRM</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">{convs.length} conversations · AI-powered replies</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchConvs} disabled={loading}>{loading?<Spinner size={12}/>:<Icon name="refresh" size={12}/>}</Button>
      </div>

      <div className="flex gap-3 h-[calc(100vh-180px)] min-h-[480px]">
        {/* Sidebar */}
        <div className="w-[280px] shrink-0 bg-surface-1 border border-surface-4 rounded-[14px] flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-surface-4">
            <p className="text-[10px] font-extrabold text-[#25D366] uppercase tracking-widest">WhatsApp Conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {loading&&Array(4).fill(0).map((_,i)=><div key={i} className="flex gap-3 p-2 animate-pulse"><div className="w-9 h-9 rounded-full bg-surface-3 shrink-0"/><div className="flex-1"><div className="h-3 bg-surface-3 rounded w-2/3 mb-1.5"/><div className="h-2.5 bg-surface-3 rounded w-full"/></div></div>)}
            {!loading&&convs.length===0&&<div className="flex flex-col items-center justify-center h-full text-center px-4 py-8"><span className="text-[32px] mb-2">💬</span><p className="text-[12px] text-text-muted">No WhatsApp messages yet</p></div>}
            {!loading&&convs.map(c=>(
              <button key={c.id} onClick={()=>setSelConv(c)} className={cn('w-full text-left flex items-start gap-3 px-3 py-[10px] rounded-[10px] border transition-all',selConv?.id===c.id?'bg-[rgba(37,211,102,.08)] border-[rgba(37,211,102,.25)]':'bg-transparent border-transparent hover:bg-surface-2 hover:border-surface-4')}>
                <Avatar initials={toInitials(c.name)} size={36}/>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center"><span className="text-[12.5px] font-bold truncate">{c.name}</span><span className="text-[10px] text-text-muted shrink-0">{c.time}</span></div>
                  <p className="text-[11.5px] text-text-muted truncate">{c.last}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {c.car&&<span className="text-[9.5px] text-text-muted truncate">🚗 {c.car}</span>}
                    {c.unread>0&&<span className="ml-auto bg-[#25D366] text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">{c.unread}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 bg-surface-1 border border-surface-4 rounded-[14px] flex flex-col overflow-hidden">
          {selConv?(
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-4 shrink-0" style={{background:'rgba(37,211,102,.04)'}}>
                <Avatar initials={toInitials(selConv.name)} size={36}/>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold">{selConv.name}</p>
                  <p className="text-[10.5px] text-text-muted">{selConv.phone||'No phone'} · <span className="capitalize" style={{color:STAGE_COLOR[selConv.stage]||G.bl}}>{(selConv.stage||'new').replace('_',' ')}</span></p>
                </div>
                {selConv.phone&&<a href={`https://wa.me/${selConv.phone?.replace(/[^0-9]/g,'')}`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-[#25D366] bg-[rgba(37,211,102,.1)] border border-[rgba(37,211,102,.2)] px-3 py-1.5 rounded-[7px] transition-colors hover:bg-[rgba(37,211,102,.15)] no-underline">Open WhatsApp ↗</a>}
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{background:'rgba(37,211,102,.015)'}}>
                {threadLoad&&<div className="flex justify-center py-8"><Spinner size={20}/></div>}
                {!threadLoad&&msgs.length===0&&<div className="flex flex-col items-center justify-center h-full text-center text-text-muted"><span className="text-[40px] mb-2">💬</span><p className="text-[13px] font-semibold">No messages yet</p></div>}
                {!threadLoad&&msgs.map(msg=>(
                  <div key={msg.id} className={`flex ${msg.from==='me'?'justify-end':'justify-start'}`}>
                    <div className={`max-w-[70%] px-3 py-2 rounded-[12px] text-[12.5px] leading-[1.5] ${msg.from==='me'?'text-white rounded-br-[4px]':'bg-surface-2 border border-surface-4 text-text-primary rounded-bl-[4px]'}`} style={msg.from==='me'?{background:'#25D366'}:{}}>
                      <p>{msg.text}</p>
                      <div className="flex justify-end gap-1 mt-0.5">
                        <span className={`text-[9px] ${msg.from==='me'?'text-white/70':'text-text-muted'}`}>{msg.tm}</span>
                        {msg.from==='me'&&msg.status==='sent'&&<span className="text-[9px] text-white/70">✓</span>}
                        {msg.from==='me'&&msg.status==='failed'&&<span className="text-[9px] text-red-300">✗</span>}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={endRef}/>
              </div>

              <div className="border-t border-surface-4 p-3 shrink-0">
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  {QUICK_REPLIES.map(r=><button key={r} onClick={()=>send(r)} className="text-[10.5px] font-bold text-[#25D366] bg-[rgba(37,211,102,.08)] border border-[rgba(37,211,102,.2)] px-2 py-[3px] rounded-[6px] hover:bg-[rgba(37,211,102,.15)] transition-colors">{r}</button>)}
                </div>
                <div className="flex gap-2">
                  <textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Type a WhatsApp message… (Enter to send)" rows={2} disabled={sending} className="flex-1 bg-surface-2 border border-surface-4 rounded-[10px] px-3 py-2 text-[12.5px] text-text-primary outline-none focus:border-[#25D366] transition-colors resize-none placeholder:text-text-muted"/>
                  <div className="flex flex-col gap-1">
                    <Button onClick={generateAiReply} disabled={aiLoad} variant="ghost" style={{padding:'7px'}} title="Generate AI reply">{aiLoad?<Spinner size={13}/>:<Icon name="ai" size={13} color={G.pu}/>}</Button>
                    <Button onClick={()=>send()} disabled={!text.trim()||sending} style={{background:'#25D366',padding:'7px'}}>{sending?<Spinner size={13}/>:<Icon name="arr" size={13} color="#fff"/>}</Button>
                  </div>
                </div>
              </div>
            </>
          ):(
            <div className="flex flex-col items-center justify-center h-full text-center text-text-muted p-8">
              <span className="text-[56px] mb-4">💬</span>
              <p className="text-[14px] font-bold text-text-secondary">Select a conversation</p>
              <p className="text-[12px] mt-1">WhatsApp messages from your leads appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
