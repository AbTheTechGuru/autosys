import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Icon }   from '@/shared/components/ui/Icon';
import { Tabs }   from '@/shared/components/ui/Tabs';
import { Spinner } from '@/shared/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { fmtM }    from '@/shared/utils/format';
import { G }       from '@/shared/utils/tokens';
import { paymentsApi } from '@/services/api';

const STATUS_COLORS = { Success:'#16A34A', Pending:'#F59E0B', Failed:'#EF4444', success:'#16A34A', pending:'#F59E0B', failed:'#EF4444' };
const PAY_TABS = [{ key:'transactions',label:'Transactions'},{ key:'analytics',label:'Analytics'}];

export function PaymentsPage() {
  const toast = useToast();
  const [tab,    setTab]    = useState('transactions');
  const [txns,   setTxns]   = useState([]);
  const [summary,setSummary]= useState(null);
  const [loading,setLoading]= useState(true);
  const [anim,   setAnim]   = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [txnsRes, sumRes] = await Promise.allSettled([
        paymentsApi.getTransactions({ limit:20 }),
        paymentsApi.getSummary(),
      ]);
      if (txnsRes.status==='fulfilled') setTxns(txnsRes.value.data.transactions ?? txnsRes.value.data ?? []);
      if (sumRes.status==='fulfilled')  setSummary(sumRes.value.data);
    } catch (err) {
      toast(err.response?.data?.message||'Failed to load payments','danger');
    } finally {
      setLoading(false);
      setTimeout(()=>setAnim(true),200);
    }
  }, []);

  useEffect(()=>{ fetchData(); },[fetchData]);

  const handleExport = async () => {
    try {
      const rows = [['ID','Customer','Amount','Status','Gateway','Date'],...txns.map(t=>[t.id||t.reference,t.customer||t.lead?.name||'—',t.amount||t.amt,t.status,t.gateway||t.gw||'—',t.created_at||t.d||'—'])];
      const csv  = rows.map(r=>r.join(',')).join('\n');
      const blob = new Blob([csv],{type:'text/csv'});
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a'); a.href=url; a.download='transactions.csv'; a.click();
      toast('Exported!','ok');
    } catch { toast('Export failed','danger'); }
  };

  const sum = summary || {};
  const totalRev  = sum.total_revenue  || sum.total || 0;
  const successCt = sum.success_count  || txns.filter(t=>t.status?.toLowerCase()==='success').length;
  const pendingCt = sum.pending_count  || txns.filter(t=>t.status?.toLowerCase()==='pending').length;
  const failCt    = sum.failed_count   || txns.filter(t=>t.status?.toLowerCase()==='failed').length;

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold">Payments</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">Paystack · Flutterwave · Live mode</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>{loading?<Spinner size={12}/>:<Icon name="refresh" size={12}/>}</Button>
          <Button variant="ghost" size="sm" onClick={handleExport}><Icon name="dl" size={13}/>Export</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          ['Total Revenue',  loading?'…':fmtM((totalRev||0)/100), G.ok, 'pay'],
          ['Successful',     loading?'…':successCt,               G.g,  'check'],
          ['Pending',        loading?'…':pendingCt,               G.wa, 'activity'],
          ['Failed',         loading?'…':failCt,                  G.er, 'x'],
        ].map(([l,v,c,ic])=>(
          <div key={l} className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
            <div className="flex justify-between items-start mb-2"><div className="text-[10.5px] text-text-secondary font-extrabold uppercase tracking-[1px]">{l}</div><Icon name={ic} size={16} color={c}/></div>
            {loading?<div className="h-7 bg-surface-4 rounded w-20 animate-pulse"/>:<div className="font-display text-[26px] font-bold" style={{color:c}}>{v}</div>}
          </div>
        ))}
      </div>

      <Tabs tabs={PAY_TABS} active={tab} onChange={setTab} className="mb-5"/>

      {tab==='transactions'&&(
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {loading&&Array(3).fill(0).map((_,i)=><div key={i} className="h-20 bg-surface-2 border border-surface-4 rounded-[12px] animate-pulse"/>)}
            {!loading&&txns.map((t,i)=>(
              <div key={t.id||i} className="bg-surface-2 border border-surface-4 rounded-[12px] p-4">
                <div className="flex justify-between items-start mb-2">
                  <div><p className="font-bold text-[13px]">{t.customer||t.lead?.name||'—'}</p><p className="text-[11px] text-text-muted">{t.id||t.reference||'—'}</p></div>
                  <span className="text-[11px] font-bold px-2 py-[2px] rounded-[5px]" style={{color:STATUS_COLORS[t.status]||G.t2,background:`${STATUS_COLORS[t.status]||G.t2}18`}}>{t.status}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="font-extrabold" style={{color:G.ok}}>{fmtM((t.amount||t.amt||0)/100)}</span>
                  <span className="text-text-muted">{t.gateway||t.gw||'—'} · {t.created_at?new Date(t.created_at).toLocaleDateString('en-NG',{day:'numeric',month:'short'}):t.d||'—'}</span>
                </div>
              </div>
            ))}
            {!loading&&txns.length===0&&<p className="text-center text-text-muted py-8">No transactions yet</p>}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-surface-2 border border-surface-4 rounded-[14px] overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-surface-4" style={{background:G.s3}}>{['ID','Customer','Vehicle','Amount','Gateway','Method','Status','Date'].map(h=><th key={h} className="text-left py-3 px-3 text-[10.5px] font-extrabold uppercase tracking-[1px] text-text-muted">{h}</th>)}</tr></thead>
              <tbody>
                {loading&&Array(4).fill(0).map((_,i)=><tr key={i}><td colSpan={8} className="px-3 py-3"><div className="h-8 bg-surface-3 rounded animate-pulse"/></td></tr>)}
                {!loading&&txns.map((t,i)=>(
                  <tr key={t.id||i} className="border-b border-surface-4 last:border-0 hover:bg-surface-3 transition-colors">
                    <td className="py-3 px-3 font-mono text-[11px] text-text-muted">{(t.id||t.reference||'—').toString().slice(-8)}</td>
                    <td className="py-3 px-3 font-semibold text-[13px]">{t.customer||t.lead?.name||'—'}</td>
                    <td className="py-3 px-3 text-[12px] text-text-muted">{t.vehicle||t.car||'—'}</td>
                    <td className="py-3 px-3 font-extrabold" style={{color:G.ok}}>{fmtM((t.amount||t.amt||0)/100)}</td>
                    <td className="py-3 px-3 text-[12px]">{t.gateway||t.gw||'—'}</td>
                    <td className="py-3 px-3 text-[12px] text-text-muted">{t.method||'—'}</td>
                    <td className="py-3 px-3"><span className="text-[11px] font-bold px-2 py-[2px] rounded-[5px]" style={{color:STATUS_COLORS[t.status]||G.t2,background:`${STATUS_COLORS[t.status]||G.t2}18`}}>{t.status}</span></td>
                    <td className="py-3 px-3 text-[12px] text-text-muted">{t.created_at?new Date(t.created_at).toLocaleDateString('en-NG',{day:'numeric',month:'short'}):t.d||'—'}</td>
                  </tr>
                ))}
                {!loading&&txns.length===0&&<tr><td colSpan={8} className="py-8 text-center text-text-muted">No transactions yet</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab==='analytics'&&(
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-5">
            <h3 className="font-bold text-[15px] mb-4">Gateway Performance</h3>
            {loading?<div className="space-y-3">{Array(3).fill(0).map((_,i)=><div key={i} className="h-8 bg-surface-3 rounded animate-pulse"/>)}</div>:(
              (sum.by_gateway||[{name:'Paystack',pct:65,color:G.ok},{name:'Flutterwave',pct:30,color:G.bl},{name:'Manual',pct:5,color:G.t2}]).map((g,i)=>(
                <div key={i} className="mb-3">
                  <div className="flex justify-between text-[12.5px] mb-1"><span className="text-text-secondary">{g.name}</span><span className="font-extrabold">{g.pct}%</span></div>
                  <div className="h-[5px] bg-surface-5 rounded-full overflow-hidden"><div className="h-full rounded-full transition-[width] duration-[1s]" style={{width:anim?`${g.pct}%`:'0%',background:g.color}}/></div>
                </div>
              ))
            )}
          </div>
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-5">
            <h3 className="font-bold text-[15px] mb-4">Payment Methods</h3>
            {loading?<div className="space-y-3">{Array(3).fill(0).map((_,i)=><div key={i} className="h-8 bg-surface-3 rounded animate-pulse"/>)}</div>:(
              (sum.by_method||[{name:'Bank Transfer',pct:55,color:G.g},{name:'Card',pct:30,color:G.pu},{name:'USSD',pct:15,color:G.wa}]).map((m,i)=>(
                <div key={i} className="mb-3">
                  <div className="flex justify-between text-[12.5px] mb-1"><span className="text-text-secondary">{m.name}</span><span className="font-extrabold">{m.pct}%</span></div>
                  <div className="h-[5px] bg-surface-5 rounded-full overflow-hidden"><div className="h-full rounded-full transition-[width] duration-[1s]" style={{width:anim?`${m.pct}%`:'0%',background:m.color}}/></div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
