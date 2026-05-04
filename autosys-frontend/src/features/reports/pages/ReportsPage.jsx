import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Icon }   from '@/shared/components/ui/Icon';
import { Toggle } from '@/shared/components/ui/Toggle';
import { useToast } from '@/context/ToastContext';
import { G } from '@/shared/utils/tokens';

const REPORT_LIST = [
  { icon:'pay',    title:'Sales Revenue Report',     desc:'Monthly & YTD breakdown',              color:G.g  },
  { icon:'phone',  title:'Lead Conversion Report',   desc:'Source attribution, conversion rates', color:G.bl },
  { icon:'car',    title:'Inventory Movement Report',desc:'Stock levels, turnover, aging',        color:G.ok },
  { icon:'users',  title:'Agent Performance Report', desc:'KPIs, deal count, commission',         color:G.pu },
  { icon:'globe',  title:'Website Analytics Report', desc:'Traffic, bounce rate, inquiries',      color:G.wa },
  { icon:'chart',  title:'Financial Summary',        desc:'P&L, cash flow, gateway performance',  color:G.g  },
];

const RECENT_DL = [
  { name:'Sales Report — Jan 2025',     type:'PDF',  date:'Today'     },
  { name:'Lead Report — Jan 2025',      type:'CSV',  date:'Yesterday' },
  { name:'Inventory — Dec 2024',        type:'XLSX', date:'Jan 12'    },
];

export function ReportsPage() {
  const toast = useToast();
  const [sched, setSched] = useState({ weekly:true, monthly:true, daily:false });

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold">Reports</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">Download, schedule, and export reports</p>
        </div>
        <Button variant="gold" size="sm" onClick={() => toast('Report builder opening!')}>
          <Icon name="plus" size={13} />Create Report
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[['YTD Revenue','₦1.24B',G.g],['Units Sold','134',G.bl],['Avg Deal','₦18.7M',G.ok],['Growth','18.4%',G.pu]].map(([l,v,c]) => (
          <div key={l} className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
            <div className="text-[10.5px] text-text-secondary font-extrabold uppercase tracking-[1px] mb-[5px]">{l}</div>
            <div className="font-display text-[26px] font-bold" style={{ color:c }}>{v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        {/* Report list */}
        <div>
          <h3 className="font-display text-[18px] font-bold mb-4">Available Reports</h3>
          <div className="flex flex-col gap-3">
            {REPORT_LIST.map((r) => (
              <div
                key={r.title}
                className="bg-surface-2 border border-surface-4 rounded-[14px] px-4 py-[16px] cursor-pointer hover:border-[rgba(200,151,58,.2)] transition-all"
              >
                <div className="flex items-center gap-[11px]">
                  <div
                    className="w-[36px] h-[36px] rounded-[9px] flex items-center justify-center shrink-0"
                    style={{ background:`${r.color}18` }}
                  >
                    <Icon name={r.icon} size={16} color={r.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-[13.5px]">{r.title}</div>
                    <div className="text-[12px] text-text-secondary">{r.desc}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" size="xs" onClick={() => toast(`${r.title} generated!`)}>
                      <Icon name="eye" size={11} />View
                    </Button>
                    <Button variant="ghost" size="xs" onClick={() => toast('Downloading…')}>
                      <Icon name="dl" size={11} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Scheduled */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[20px]">
            <div className="font-display text-[17px] font-bold mb-4">Scheduled Reports</div>
            {[['Weekly Sales Digest','Every Monday 8AM','weekly'],['Monthly Revenue','1st of month','monthly'],['Daily Lead Summary','Daily at 6PM','daily']].map(([name,desc,key]) => (
              <div key={key} className="flex items-center gap-3 py-[11px] border-b border-surface-4 last:border-0">
                <div className="flex-1">
                  <div className="font-bold text-[13px]">{name}</div>
                  <div className="text-[11.5px] text-text-muted">{desc}</div>
                </div>
                <Toggle
                  checked={sched[key]}
                  onChange={(v) => setSched((s) => ({ ...s, [key]: v }))}
                  label={`Toggle ${name}`}
                />
              </div>
            ))}
          </div>

          {/* Export */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[20px]">
            <div className="font-display text-[17px] font-bold mb-4">Export Data</div>
            <div className="grid grid-cols-2 gap-2">
              {[['Inventory','CSV'],['Leads','CSV'],['Transactions','Excel'],['Analytics','PDF']].map(([d,t]) => (
                <Button key={d} variant="ghost" size="sm" className="justify-center" onClick={() => toast(`Exporting ${d}…`)}>
                  <Icon name="dl" size={12} />{d} ({t})
                </Button>
              ))}
            </div>
          </div>

          {/* Recent downloads */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[20px]">
            <div className="font-display text-[17px] font-bold mb-4">Recent Downloads</div>
            {RECENT_DL.map((dl) => (
              <div key={dl.name} className="flex justify-between items-center py-[10px] border-b border-surface-4 last:border-0">
                <div>
                  <div className="text-[13px] font-semibold">{dl.name}</div>
                  <div className="text-[11px] text-text-muted">{dl.type} · {dl.date}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => toast('Downloading…')} aria-label={`Download ${dl.name}`}>
                  <Icon name="dl" size={12} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
