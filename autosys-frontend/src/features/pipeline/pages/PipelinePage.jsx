import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Badge }  from '@/shared/components/ui/Badge';
import { Icon }   from '@/shared/components/ui/Icon';
import { Avatar, toInitials } from '@/shared/components/ui/Avatar';
import { useToast }   from '@/context/ToastContext';
import { useSalesStore } from '@/store/salesStore';
import { fmtM } from '@/shared/utils/format';
import { cn }    from '@/shared/utils/cn';
import { G }     from '@/shared/utils/tokens';

const COL_META = {
  Lead:        { color: G.bl },
  Negotiation: { color: G.wa },
  Payment:     { color: G.g  },
  Delivered:   { color: G.ok },
};

const TAG_COLOR = {
  Hot:     G.er,
  Warm:    G.wa,
  New:     G.bl,
  Pending: G.g,
  Done:    G.ok,
};

function DealCard({ card, colKey, onDragStart }) {
  const c = COL_META[colKey]?.color ?? G.g;
  return (
    <article
      className="kanban-card bg-surface-3 border border-surface-4 rounded-[9px] p-3
                 transition-all duration-[180ms] select-none
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

function KanbanColumn({ colKey, cards, onDrop, onDragOver, onDragLeave, isOver }) {
  const toast      = useToast();
  const { color }  = COL_META[colKey] ?? { color: G.g };
  const total      = cards.reduce((s, c) => s + c.v, 0);

  return (
    <div
      className={cn(
        'flex flex-col bg-surface-2 border rounded-[13px] min-w-[226px] flex-1',
        'transition-[border-color,background] duration-[180ms]',
        isOver
          ? 'border-[rgba(200,151,58,.5)] bg-[rgba(200,151,58,.04)]'
          : 'border-surface-4',
      )}
      style={{ borderTop: `3px solid ${color}` }}
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
      role="list"
      aria-label={`${colKey} column`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <span className="font-extrabold text-[13px]" style={{ color }}>{colKey}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold px-[7px] py-[2px] rounded-[5px]" style={{ background:`${color}1A`, color }}>
            {cards.length}
          </span>
        </div>
      </div>
      <div className="text-[10.5px] text-text-muted px-3 pb-2">{fmtM(total)}</div>

      {/* Cards */}
      <div className="flex flex-col gap-[7px] px-3 pb-3 flex-1 min-h-[90px]" role="list">
        {cards.map((card) => (
          <DealCard
            key={card.id}
            card={card}
            colKey={colKey}
            onDragStart={() => {}}
          />
        ))}
        <Button variant="ghost" size="xs" className="justify-center mt-1">
          <Icon name="plus" size={11} />Add
        </Button>
      </div>
    </div>
  );
}

export function PipelinePage() {
  const toast    = useToast();
  const pipeline = useSalesStore((s) => s.pipeline);
  const moveDeal = useSalesStore((s) => s.moveDeal);
  const total    = useSalesStore((s) => s.getPipelineTotal());

  const [drag, setDrag] = useState(null); // { id, fromCol }
  const [over, setOver] = useState(null); // colKey

  const handleDragStart = (id, fromCol) => setDrag({ id, fromCol });
  const handleDrop      = (toCol) => {
    if (!drag || drag.fromCol === toCol) { setDrag(null); setOver(null); return; }
    moveDeal(drag.id, drag.fromCol, toCol);
    toast(`Moved to ${toCol}!`);
    setDrag(null);
    setOver(null);
  };

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold">Sales Pipeline</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">
            Drag deals across stages · Total: <span className="text-gold font-extrabold">{fmtM(total)}</span>
          </p>
        </div>
        <Button variant="gold" size="sm"><Icon name="plus" size={13} />New Deal</Button>
      </div>

      {/* Kanban board — horizontal scroll on mobile */}
      <div className="flex gap-3 overflow-x-auto pb-6 -mx-4 md:-mx-0 px-4 md:px-0">
        {Object.entries(pipeline).map(([colKey, cards]) => (
          <KanbanColumn
            key={colKey}
            colKey={colKey}
            cards={cards}
            isOver={over === colKey}
            onDragOver={() => setOver(colKey)}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setOver(null);
            }}
            onDrop={() => handleDrop(colKey)}
          />
        ))}
      </div>
    </div>
  );
}
