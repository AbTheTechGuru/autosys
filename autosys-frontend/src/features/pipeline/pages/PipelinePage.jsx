import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Badge }  from '@/shared/components/ui/Badge';
import { Icon }   from '@/shared/components/ui/Icon';
import { Avatar, toInitials } from '@/shared/components/ui/Avatar';
import { useToast }    from '@/context/ToastContext';
import { useSalesStore } from '@/store/salesStore';
import { salesApi }    from '@/services/api/index';
import { fmtM } from '@/shared/utils/format';
import { cn }   from '@/shared/utils/cn';
import { G }    from '@/shared/utils/tokens';

const COL_META = {
  Lead:        { color: G.bl },
  Negotiation: { color: G.wa },
  Payment:     { color: G.g  },
  Delivered:   { color: G.ok },
};

const TAG_COLOR = { Hot: G.er, Warm: G.wa, New: G.bl, Pending: G.g, Done: G.ok, Active: G.bl };

function DealCard({ card, colKey, onDragStart }) {
  const c = COL_META[colKey]?.color ?? G.g;
  return (
    <article
      className="kanban-card bg-surface-3 border border-surface-4 rounded-[9px] p-3
                 transition-all duration-[180ms] select-none cursor-grab active:cursor-grabbing
                 hover:border-[rgba(200,151,58,.4)] hover:-translate-y-[2px]
                 hover:shadow-[0_8px_22px_rgba(0,0,0,.35)]"
      draggable
      onDragStart={onDragStart}
      aria-label={`Deal: ${card.t}, ${fmtM(card.v)}`}
    >
      <div className="flex justify-between items-start mb-[6px]">
        <Badge>{card.tag}</Badge>
        <Avatar initials={card.c} size={20} />
      </div>
      <div className="text-[12.5px] font-extrabold mb-[3px]">{card.t}</div>
      <div className="font-display text-[16px]" style={{ color: c }}>{fmtM(card.v)}</div>
      <div className="text-[10px] text-text-muted mt-[5px]">
        {card.d === 0 ? 'Today' : `${card.d}d`} · {card.ag}
      </div>
    </article>
  );
}

function KanbanColumn({ colKey, cards, onDrop, onDragOver, onDragLeave, isOver, onAddDeal, onDragStart }) {
  const { color } = COL_META[colKey] ?? { color: G.g };
  const total     = cards.reduce((s, c) => s + c.v, 0);
  return (
    <div
      className={cn(
        'flex flex-col bg-surface-2 border rounded-[13px] min-w-[226px] flex-1',
        'transition-[border-color,background] duration-[180ms]',
        isOver ? 'border-[rgba(200,151,58,.5)] bg-[rgba(200,151,58,.04)]' : 'border-surface-4',
      )}
      style={{ borderTop: `3px solid ${color}` }}
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
      role="list"
      aria-label={`${colKey} column`}
    >
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <span className="font-extrabold text-[13px]" style={{ color }}>{colKey}</span>
        <span className="text-[10px] font-extrabold px-[7px] py-[2px] rounded-[5px]"
          style={{ background:`${color}1A`, color }}>
          {cards.length}
        </span>
      </div>
      <div className="text-[10.5px] text-text-muted px-3 pb-2">{fmtM(total)}</div>
      <div className="flex flex-col gap-[7px] px-3 pb-3 flex-1 min-h-[90px]" role="list">
        {cards.map((card) => (
          <DealCard key={card.id} card={card} colKey={colKey}
            onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({ id: card.id, fromCol: colKey }));
            onDragStart({ id: card.id, fromCol: colKey });
          }} />
        ))}
        <Button variant="ghost" size="xs" className="justify-center mt-1"
          onClick={() => onAddDeal(colKey)}>
          <Icon name="plus" size={11} />Add
        </Button>
      </div>
    </div>
  );
}

export function PipelinePage() {
  const toast        = useToast();
  const pipeline     = useSalesStore((s) => s.pipeline);
  const moveDeal     = useSalesStore((s) => s.moveDeal);
  const addDeal      = useSalesStore((s) => s.addDeal);
  const total        = useSalesStore((s) => s.getPipelineTotal());
  const fetchPipeline = useSalesStore((s) => s.fetchPipeline);

  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);

  // Fetch real deals from backend on mount
  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);

  const handleDrop = async (toCol, dragData) => {
    // Accept dragData directly from the drop event to avoid stale state
    const d = dragData || drag;
    if (!d || d.fromCol === toCol) { setDrag(null); setOver(null); return; }
    // Optimistic move
    moveDeal(d.id, d.fromCol, toCol);
    toast(`Moved to ${toCol}!`);

    // Persist to backend (skip for seed/local IDs)
    if (!d.id.startsWith('dp-') && !d.id.startsWith('local-')) {
      const STAGE_MAP = { Lead:'lead', Negotiation:'negotiation', Payment:'payment', Delivered:'delivered' };
      try {
        await salesApi.moveDeal(d.id, STAGE_MAP[toCol] ?? toCol.toLowerCase());
      } catch (err) {
        toast(err.response?.data?.message || 'Stage update failed', 'danger');
        // Revert
        moveDeal(d.id, toCol, d.fromCol);
      }
    }
    setDrag(null);
    setOver(null);
  };

  const handleAddDeal = async (col) => {
    const title = window.prompt(`New deal title for ${col} stage:`);
    if (!title?.trim()) return;
    const valueStr = window.prompt('Deal value (₦):');
    const value    = parseInt(valueStr?.replace(/,/g, '') || '0');

    const optimistic = { id:`local-${Date.now()}`, t:title, v:value, c:'—', tag:'New', ag:'You', d:0 };
    addDeal(col, optimistic);

    const STAGE_MAP = { Lead:'lead', Negotiation:'negotiation', Payment:'payment', Delivered:'delivered' };
    try {
      const { data } = await salesApi.createDeal({
        title,
        value: value * 100, // kobo
        stage: STAGE_MAP[col] ?? 'lead',
      });
      const serverDeal = data.deal ?? data;
      // Replace optimistic with real ID
      useSalesStore.setState((s) => ({
        pipeline: {
          ...s.pipeline,
          [col]: s.pipeline[col].map((c) =>
            c.id === optimistic.id ? { ...optimistic, id: serverDeal.id } : c
          ),
        },
      }));
      toast(`Deal created in ${col}!`);
    } catch (err) {
      toast(err.response?.data?.message || 'Created locally', 'warning');
    }
  };

  const totalCards = Object.values(pipeline).reduce((s, col) => s + col.length, 0);

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold">Sales Pipeline</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">
            {totalCards} deals · Drag to move · Total:{' '}
            <span className="text-gold font-extrabold">{fmtM(total)}</span>
          </p>
        </div>
        <Button variant="gold" size="sm" onClick={() => handleAddDeal('Lead')}>
          <Icon name="plus" size={13} />New Deal
        </Button>
      </div>

      {/* Kanban board */}
      <div
        className="flex gap-3 overflow-x-auto pb-6 -mx-4 md:-mx-0 px-4 md:px-0"
        onDragOver={(e) => e.preventDefault()}
      >
        {Object.entries(pipeline).map(([colKey, cards]) => (
          <KanbanColumn
            key={colKey}
            colKey={colKey}
            cards={cards}
            isOver={over === colKey}
            onDragStart={(d) => setDrag(d)}
            onDragOver={() => setOver(colKey)}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setOver(null);
            }}
            onDrop={(e) => {
              // Read drag data directly from dataTransfer (reliable cross-browser)
              try {
                const raw = e.dataTransfer.getData('text/plain');
                if (raw) {
                  const parsed = JSON.parse(raw);
                  setDrag(parsed);
                  handleDrop(colKey, parsed);
                }
              } catch {}
            }}
            onAddDeal={handleAddDeal}
          />
        ))}
      </div>
    </div>
  );
}

// Drag state is managed via React state + dataTransfer — no global listener needed
