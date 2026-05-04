import { useEffect, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Badge }  from '@/shared/components/ui/Badge';
import { Icon }   from '@/shared/components/ui/Icon';
import { Tabs }   from '@/shared/components/ui/Tabs';
import { BarChart } from '@/shared/components/charts/BarChart';
import { useToast } from '@/context/ToastContext';
import { fmtM }     from '@/shared/utils/format';
import { G }        from '@/shared/utils/tokens';
import { MONTHS, REVENUE_DATA } from '@/shared/constants';

const TXNS = [
  { id:'TXN-0041', c:'Biodun Adeyemi', car:'Lexus RX 350',     amt:42000000, gw:'Paystack',     method:'Bank Transfer', status:'Success', d:'Jan 13' },
  { id:'TXN-0040', c:'Chukwudi Eze',   car:'Highlander XLE',   amt:32000000, gw:'Paystack',     method:'Card',          status:'Success', d:'Jan 12' },
  { id:'TXN-0039', c:'Amaka Nwosu',    car:'Mercedes GLE 450', amt:75000000, gw:'Flutterwave',  method:'Bank Transfer', status:'Pending', d:'Jan 15' },
  { id:'TXN-0038', c:'Emeka Okafor',   car:'Toyota Camry',     amt:18500000, gw:'Paystack',     method:'USSD',          status:'Failed',  d:'Jan 14' },
  { id:'TXN-0037', c:'Ngozi Emmanuel', car:'Ford Ranger',      amt:22000000, gw:'Paystack',     method:'Card',          status:'Success', d:'Jan 10' },
];

const PAY_TABS = [
  { key:'transactions', label:'Transactions' },
  { key:'analytics',    label:'Analytics'    },
];

function ProgressBar({ label, pct, color, animated }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-[12.5px] mb-1">
        <span className="text-text-secondary">{label}</span>
        <span className="font-extrabold">{pct}%</span>
      </div>
      <div className="h-[4px] bg-surface-5 rounded-[2px] overflow-hidden">
        <div
          className="h-full rounded-[2px] transition-[width] duration-[1s]"
          style={{ width: animated ? `${pct}%` : '0%', background: `linear-gradient(90deg,${color}80,${color})` }}
        />
      </div>
    </div>
  );
}

export function PaymentsPage() {
  const toast  = useToast();
  const [tab,  setTab]  = useState('transactions');
  const [anim, setAnim] = useState(false);

  useEffect(() => { const t = setTimeout(() => setAnim(true), 200); return () => clearTimeout(t); }, []);

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold">Payments</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">Paystack · Flutterwave · Live mode</p>
        </div>
        <Button variant="ghost" size="sm"><Icon name="dl" size={13} />Export</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[['Total Revenue','₦1.24B',G.ok],['This Month','₦176M',G.g],['Pending','₦75M',G.wa],['Transactions','134',G.bl]].map(([l,v,c]) => (
          <div key={l} className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
            <div className="text-[10.5px] text-text-secondary font-extrabold uppercase tracking-[1px] mb-[5px]">{l}</div>
            <div className="font-display text-[26px] font-bold" style={{ color:c }}>{v}</div>
          </div>
        ))}
      </div>

      <Tabs tabs={PAY_TABS} active={tab} onChange={setTab} className="mb-5" />

      {/* Transactions */}
      {tab === 'transactions' && (
        <>
        {/* ── Mobile payment cards ─── */}
        <div className="flex flex-col gap-3 md:hidden">
          {TXNS.map((t) => (
            <div key={t.id} className="bg-surface-2 border border-surface-4 rounded-[12px] p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-extrabold text-[14px]">{t.c}</div>
                <Badge>{t.status}</Badge>
              </div>
              <div className="text-gold font-extrabold text-[17px] mb-1">{fmtM(t.amt)}</div>
              <div className="flex justify-between text-[12px] text-text-secondary">
                <span>{t.car}</span>
                <span>{t.d}</span>
              </div>
              <div className="mt-2 flex gap-2">
                <span className="text-[11px] px-2 py-[2px] bg-surface-3 border border-surface-4 rounded-[5px] text-text-muted">{t.gw}</span>
                <span className="text-[11px] px-2 py-[2px] bg-surface-3 border border-surface-4 rounded-[5px] text-text-muted">{t.method}</span>
              </div>
            </div>
          ))}
        </div>

                <div className="hidden md:block border border-surface-4 rounded-[12px] overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['ID','Customer','Vehicle','Amount','Gateway','Method','Status','Date','Receipt'].map((h) => (
                  <th key={h} className="text-left px-[14px] py-[9px] text-[9.5px] font-extrabold uppercase tracking-[1px] text-text-muted bg-surface-3 border-b border-surface-4 first:pl-[18px] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TXNS.map((t) => (
                <tr key={t.id} className="border-b border-[rgba(33,33,46,.4)] last:border-0 hover:bg-[rgba(255,255,255,.01)]">
                  <td className="px-[18px] py-3 font-mono text-[11.5px] text-text-secondary">{t.id}</td>
                  <td className="px-[14px] py-3 font-extrabold">{t.c}</td>
                  <td className="px-[14px] py-3 text-[13px]">{t.car}</td>
                  <td className="px-[14px] py-3 text-gold font-extrabold">{fmtM(t.amt)}</td>
                  <td className="px-[14px] py-3">
                    <span className="text-[11px] font-bold px-[7px] py-[2px] bg-surface-3 border border-surface-4 rounded-[5px] text-text-secondary">{t.gw}</span>
                  </td>
                  <td className="px-[14px] py-3 text-[12.5px] text-text-secondary">{t.method}</td>
                  <td className="px-[14px] py-3"><Badge>{t.status}</Badge></td>
                  <td className="px-[14px] py-3 text-[12.5px] text-text-muted">{t.d}</td>
                  <td className="px-[14px] py-3">
                    <Button variant="ghost" size="xs" onClick={() => toast('Downloading…')}>
                      <Icon name="dl" size={11} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Analytics */}
      {tab === 'analytics' && (
        <div className="flex flex-col gap-4">
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
            <div className="font-display text-[18px] font-bold mb-4">Monthly Revenue</div>
            <BarChart data={REVENUE_DATA} labels={MONTHS} height={140} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[20px]">
              <div className="font-display text-[17px] font-bold mb-4">By Payment Method</div>
              {[['Bank Transfer',55,G.g],['Card',30,G.bl],['USSD',10,G.te],['Mobile Money',5,G.pu]].map(([l,p,c]) => (
                <ProgressBar key={l} label={l} pct={p} color={c} animated={anim} />
              ))}
            </div>
            <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[20px]">
              <div className="font-display text-[17px] font-bold mb-4">By Gateway</div>
              {[['Paystack','₦890M',G.ok,'72%'],['Flutterwave','₦350M',G.bl,'28%']].map(([name,v,c,pct]) => (
                <div key={name} className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-[8px] h-[8px] rounded-full" style={{ background:c }} />
                    <span className="text-[13px]">{name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-[13px]">{v}</div>
                    <div className="text-[10.5px] text-text-muted">{pct}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
