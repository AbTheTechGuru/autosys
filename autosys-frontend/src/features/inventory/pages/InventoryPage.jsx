import { useState, useEffect } from 'react';
import { Button }  from '@/shared/components/ui/Button';
import { Badge }   from '@/shared/components/ui/Badge';
import { Icon }    from '@/shared/components/ui/Icon';
import { Modal }   from '@/shared/components/ui/Modal';
import { Input, Select, Field } from '@/shared/components/ui/Input';
import { SearchBar } from '@/shared/components/ui/Input';
import { Tabs }    from '@/shared/components/ui/Tabs';
import { CardGridSkeleton, TableRowSkeleton } from '@/shared/components/ui/Skeleton';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ResponsiveTable } from '@/shared/components/ui/ResponsiveTable';
import { useToast } from '@/context/ToastContext';
import { useSalesStore } from '@/store/salesStore';
import { fmtM, fmtN, fmtMileage } from '@/shared/utils/format';
import { validate, vehicleSchema, toFuelType, toTrans, toCondition } from '@/schemas';
import { sanitizeObject } from '@/shared/utils/sanitize';
import { G } from '@/shared/utils/tokens';
import { FUEL_TYPES, TRANSMISSION, VEHICLE_CONDITION, VEHICLE_STATUS } from '@/shared/constants';

const STATUS_TABS = [
  { key:'All',       label:'All'       },
  { key:'Available', label:'Available' },
  { key:'Reserved',  label:'Reserved'  },
  { key:'Sold',      label:'Sold'      },
];

/* ── Vehicle detail modal ────────────────────────────────────── */
function VehicleModal({ vehicle, onClose, onDelete }) {
  if (!vehicle) return null;
  return (
    <Modal open onClose={onClose} title={vehicle.t} maxWidth={680}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Photo */}
        <div>
          <div
            className="rounded-[12px] h-[210px] flex items-center justify-center text-[86px] mb-3"
            style={{ background: `linear-gradient(135deg, ${vehicle.color}bb, ${vehicle.color}44)` }}
            aria-label={`${vehicle.brand} ${vehicle.model} photo`}
          >
            {vehicle.e}
          </div>
          <div className="flex gap-2">
            {[vehicle.e,'🔧','📐','🏎️'].map((e, i) => (
              <div
                key={i}
                className="w-[60px] h-[44px] rounded-[8px] bg-surface-3 flex items-center justify-center text-[22px] cursor-pointer border-2 transition-colors hover:border-gold"
                style={{ borderColor: i === 0 ? G.g : 'transparent' }}
              >
                {e}
              </div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div>
          <Badge className="mb-3">{vehicle.status}</Badge>
          <div className="font-display text-[26px] font-bold text-gold mb-4">{fmtN(vehicle.price)}</div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {[['Year',vehicle.year],['Brand',vehicle.brand],['Model',vehicle.model],['Mileage',fmtMileage(vehicle.mileage)],['Fuel',vehicle.fuel_type||vehicle.fuel],['Trans',vehicle.transmission||vehicle.trans],['Condition',vehicle.condition||vehicle.cond]].map(([k,v]) => (
              <div key={k} className="bg-surface-3 rounded-[7px] px-[10px] py-2 border border-surface-4">
                <div className="text-[9.5px] text-text-muted uppercase tracking-[.8px] mb-[1px]">{k}</div>
                <div className="text-[13px] font-extrabold">{v}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {[['Views',vehicle.views,G.bl],['Inquiries',vehicle.inq,G.g],['Days',vehicle.days,G.t1]].map(([l,v,c]) => (
              <div key={l} className="bg-surface-3 border border-surface-4 rounded-[9px] p-[11px] text-center">
                <div className="font-display text-[20px] font-bold" style={{ color:c }}>{v}</div>
                <div className="text-[10px] text-text-secondary mt-[2px]">{l}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="ok" size="sm" className="flex-1 justify-center" onClick={() => {}}>
              <Icon name="wa" size={13} />WhatsApp
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 justify-center">
              <Icon name="edit" size={13} />Edit
            </Button>
            <Button variant="danger" size="sm" onClick={onDelete}>
              <Icon name="trash" size={13} />
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ── Add vehicle modal ────────────────────────────────────────── */
function AddVehicleModal({ open, onClose }) {
  const toast      = useToast();
  const addVehicle = useSalesStore((s) => s.addVehicle);
  const [form,   setForm]   = useState({ brand:'', model:'', year:'', price:'', mileage:'', fuel_type:'petrol', transmission:'automatic', condition:'foreign-used', status:'available', description:'' });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleAdd = () => {
    setErrors({});
    const { data, errors: errs } = validate(vehicleSchema, sanitizeObject(form));
    if (errs) { setErrors(errs); return; }
    addVehicle(data);
    toast('Vehicle added!');
    onClose();
    setForm({ brand:'', model:'', year:'', price:'', mileage:'', fuel_type:'petrol', transmission:'automatic', condition:'foreign-used', status:'available', description:'' });
  };

  return (
    <Modal open={open} onClose={onClose} title="Add New Vehicle" maxWidth={600}>
      <div className="flex flex-col gap-3">
<div className="grid grid-cols-2 gap-3">
          {[['Brand *','brand','Toyota'],['Model *','model','Camry'],['Year *','year','2023'],['Price (₦) *','price','18500000'],['Mileage (km) *','mileage','42000']].map(([l,k,p]) => (
            <Field key={k} label={l} error={errors[k]}>
              <Input placeholder={p} type={['price','mileage','year'].includes(k)?'number':'text'} value={form[k]} onChange={set(k)} />
            </Field>
          ))}
          <Field label="Fuel" error={errors.fuel_type}>
            <Select value={form.fuel_type} onChange={set('fuel_type')}>
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="hybrid">Hybrid</option>
              <option value="electric">Electric</option>
            </Select>
          </Field>
          <Field label="Condition" error={errors.condition}>
            <Select value={form.condition} onChange={set('condition')}>
              {VEHICLE_CONDITION.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Status" error={errors.status}>
            <Select value={form.status} onChange={set('status')}>
              {VEHICLE_STATUS.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
        </div>

        <div
          className="border-2 border-dashed border-surface-4 rounded-[11px] p-6 text-center cursor-pointer hover:border-gold hover:bg-[rgba(200,151,58,.04)] transition-all"
          role="button" tabIndex={0} aria-label="Upload vehicle photos"
        >
          <Icon name="img" size={20} color="#4E4B58" style={{ margin:'0 auto 7px' }} />
          <div className="text-[13px] text-text-secondary">Upload vehicle photos (PNG, JPG)</div>
        </div>

        <div className="flex gap-2 justify-end mt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="gold" onClick={handleAdd}>
            <Icon name="plus" size={13} />Add Vehicle
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */
export function InventoryPage() {
  const toast        = useToast();
  const vehicles     = useSalesStore((s) => s.vehicles);
  const viewMode     = useSalesStore((s) => s.viewMode);
  const statusFilter = useSalesStore((s) => s.statusFilter);
  const searchQuery  = useSalesStore((s) => s.searchQuery);
  const setViewMode  = useSalesStore((s) => s.setViewMode);
  const setFilter    = useSalesStore((s) => s.setStatusFilter);
  const setSearch    = useSalesStore((s) => s.setSearch);
  const removeVehicle = useSalesStore((s) => s.removeVehicle);
  const getFiltered   = useSalesStore((s) => s.getFilteredVehicles);
  const fetchVehicles = useSalesStore((s) => s.fetchVehicles);

  const [addOpen,    setAddOpen]  = useState(false);
  const [bulkOpen,   setBulkOpen]  = useState(false);

  // Fetch real data on mount; seed data shown immediately for instant UX
  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);
  const [detailVeh,  setDetail]   = useState(null);

  const filtered = getFiltered();
  const available = vehicles.filter((v) => v.status === 'Available').length;

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold">Inventory</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">
            {filtered.length} vehicles · {available} available
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm"><Icon name="upload" size={13} />Import CSV</Button>
          <Button variant="ghost" size="sm" onClick={() => setBulkOpen(true)}><Icon name="dl" size={13}/>Bulk Import</Button>
          <Button variant="gold"  size="sm" onClick={() => setAddOpen(true)}>
            <Icon name="plus" size={13} />Add Vehicle
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap items-start sm:items-center">
        <SearchBar
          placeholder="Search vehicles…"
          value={searchQuery}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-[280px]"
        />
        <Tabs
          tabs={STATUS_TABS}
          active={statusFilter}
          onChange={setFilter}
        />
        <div className="flex gap-1 ml-auto">
          {[['grid','grid'],['list','list']].map(([v, ic]) => (
            <Button
              key={v}
              variant={viewMode === v ? 'solid' : 'ghost'}
              size="sm"
              style={{ padding:'6px 9px' }}
              onClick={() => setViewMode(v)}
              aria-label={`${v} view`}
            >
              <Icon name={ic} size={14} />
            </Button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <EmptyState
          icon="car"
          title="No vehicles found"
          desc="Try adjusting your search or filters."
          action={() => setAddOpen(true)}
          actionLabel="Add Vehicle"
        />
      )}

      {/* Grid view */}
      {viewMode === 'grid' && filtered.length > 0 && (
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
          {filtered.map((v) => (
            <article
              key={v.id}
              className="bg-surface-2 border border-surface-4 rounded-[14px] overflow-hidden cursor-pointer
                         transition-all duration-200 hover:border-[rgba(200,151,58,.32)] hover:-translate-y-[3px]
                         hover:shadow-[0_14px_42px_rgba(0,0,0,.4)]"
              onClick={() => setDetail(v)}
            >
              <div
                className="h-[142px] flex items-center justify-center text-[56px] relative"
                style={{ background: `linear-gradient(135deg, ${v.color}bb, ${v.color}44)` }}
              >
                {v.e}
                <span className="absolute top-2 right-2">
                  <Badge>{v.status}</Badge>
                </span>
              </div>
              <div className="p-[14px]">
                <h3 className="font-extrabold text-[13.5px] mb-1 truncate">{v.t}</h3>
                <div className="font-display text-[19px] text-gold mb-2">{fmtM(v.price)}</div>
                <div className="flex gap-2 text-[11.5px] text-text-secondary mb-2">
                  <span>{v.fuel_type||v.fuel}</span><span>·</span><span>{fmtMileage(v.mileage)}</span><span>·</span><span>{v.condition||v.cond}</span>
                </div>
                <div className="flex gap-2 text-[10.5px] text-text-muted">
                  <span>👁 {v.views}</span><span>·</span><span>💬 {v.inq}</span><span>·</span><span>📅 {v.days}d</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && filtered.length > 0 && (
        <>
        /* ── Mobile card list (md: hidden) ─── */
        <div className="flex flex-col gap-3 md:hidden mb-6">
          {isLoading
            ? Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-surface-2 border border-surface-4 rounded-[12px] p-4 animate-pulse">
                  <div className="h-5 bg-surface-5 rounded w-1/2 mb-2" />
                  <div className="h-4 bg-surface-4 rounded w-3/4 mb-1" />
                  <div className="h-4 bg-surface-4 rounded w-1/2" />
                </div>
              ))
            : filtered.map((v) => (
                <button
                  key={v.id}
                  className="bg-surface-2 border border-surface-4 rounded-[12px] p-4 text-left w-full hover:border-[rgba(200,151,58,.22)] transition-colors"
                  onClick={() => setSelected(v)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-[46px] h-[46px] rounded-[10px] flex items-center justify-center text-[24px] shrink-0"
                      style={{ background: `${v.color}33` }}
                    >
                      {v.e}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-[14px] truncate">{v.t}</div>
                      <div className="text-gold font-extrabold text-[13px]">{fmtN(v.price)}</div>
                    </div>
                    <Badge>{v.status}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11.5px] text-text-secondary">
                    <span>{v.fuel_type || v.fuel}</span>
                    <span>·</span>
                    <span>{fmtMileage(v.mileage)}</span>
                    <span>·</span>
                    <span>{v.condition || v.cond}</span>
                  </div>
                </button>
              ))
          }
        </div> 

                <div className="hidden md:block border border-surface-4 rounded-[12px] overflow-x-auto mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Vehicle','Price','Mileage','Fuel','Condition','Status','Views',''].map((h) => (
                  <th key={h} className="text-left px-[14px] py-[9px] text-[9.5px] font-extrabold uppercase tracking-[1px] text-text-muted bg-surface-3 border-b border-surface-4 first:pl-[18px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-[rgba(33,33,46,.4)] last:border-0 hover:bg-[rgba(255,255,255,.01)] cursor-pointer"
                  onClick={() => setDetail(v)}
                >
                  <td className="px-[18px] py-3">
                    <div className="flex items-center gap-[9px]">
                      <span className="text-[22px]">{v.e}</span>
                      <div>
                        <div className="font-extrabold text-[13px]">{v.t}</div>
                        <div className="text-[11px] text-text-muted">{v.year}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-[14px] py-3 text-gold font-extrabold">{fmtM(v.price)}</td>
                  <td className="px-[14px] py-3 text-text-secondary">{fmtMileage(v.mileage)}</td>
                  <td className="px-[14px] py-3">{v.fuel_type||v.fuel}</td>
                  <td className="px-[14px] py-3">{v.condition||v.cond}</td>
                  <td className="px-[14px] py-3"><Badge>{v.status}</Badge></td>
                  <td className="px-[14px] py-3 text-text-secondary">{v.views}</td>
                  <td
                    className="px-[14px] py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={() => { removeVehicle(v.id); toast('Vehicle removed', 'danger'); }}
                      aria-label={`Delete ${v.t}`}
                    >
                      <Icon name="trash" size={11} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Modals */}
      <BulkImportModal open={bulkOpen} onClose={() => setBulkOpen(false)} onImported={(vehicles) => { vehicles.forEach(v => useSalesStore.getState().updateVehicle(v.id, v)); fetchVehicles(); }} />
      <AddVehicleModal open={addOpen} onClose={() => setAddOpen(false)} />
      <VehicleModal
        vehicle={detailVeh}
        onClose={() => setDetail(null)}
        onDelete={() => {
          removeVehicle(detailVeh.id);
          setDetail(null);
          toast('Vehicle removed', 'danger');
        }}
      />
    </div>
  );
}

/* ── Bulk Import Modal ─────────────────────────────────────── */
function BulkImportModal({ open, onClose, onImported }) {
  const toast = useToast();
  const addVehicle = useSalesStore(s=>s.addVehicle);
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress]   = useState(0);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const rows = text.split('\n').filter(Boolean);
      const headers = rows[0].split(',').map(h=>h.trim().toLowerCase().replace(/\s+/g,'_'));
      const parsed = rows.slice(1).map(row => {
        const vals = row.split(',');
        return Object.fromEntries(headers.map((h,i)=>[h,vals[i]?.trim()||'']));
      }).filter(r=>r.brand&&r.model);
      setPreview(parsed.slice(0,5));
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setProgress(0);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const rows  = e.target.result.split('\n').filter(Boolean);
      const hdrs  = rows[0].split(',').map(h=>h.trim().toLowerCase().replace(/\s+/g,'_'));
      const data  = rows.slice(1).map(r=>Object.fromEntries(hdrs.map((h,i)=>[h,r.split(',')[i]?.trim()||'']))).filter(r=>r.brand&&r.model);
      const saved = [];
      for (let i=0;i<data.length;i++) {
        try {
          const v = await addVehicle({
            brand:        data[i].brand,
            model:        data[i].model,
            year:         Number(data[i].year)||2020,
            price:        Number(data[i].price)||0,
            mileage:      Number(data[i].mileage||data[i].km)||0,
            fuel_type:    data[i].fuel_type||data[i].fuel||'petrol',
            transmission: data[i].transmission||'automatic',
            condition:    data[i].condition||'foreign-used',
            status:       data[i].status||'available',
            description:  data[i].description||data[i].notes||'',
          });
          saved.push(v);
        } catch {}
        setProgress(Math.round(((i+1)/data.length)*100));
      }
      toast(`Imported ${saved.length}/${data.length} vehicles!`, 'ok');
      onImported(saved);
      onClose();
      setImporting(false);
      setFile(null);
      setPreview([]);
      setProgress(0);
    };
    reader.readAsText(file);
  };

  return (
    <Modal open={open} onClose={onClose} title="Bulk Import Vehicles" maxWidth={580}>
      <div className="space-y-4">
        <div className="bg-surface-3 border border-surface-4 rounded-[10px] p-3">
          <p className="text-[11.5px] font-bold text-text-secondary mb-1">CSV Format Required</p>
          <code className="text-[10.5px] font-mono text-gold block">brand,model,year,price,mileage,fuel_type,transmission,condition,status</code>
          <code className="text-[10.5px] font-mono text-text-muted block mt-1">Toyota,Camry,2022,18500000,42000,petrol,automatic,foreign-used,available</code>
        </div>

        <label className="flex flex-col items-center justify-center border-2 border-dashed border-surface-4 rounded-[10px] py-6 px-4 cursor-pointer hover:border-gold transition-colors">
          <input type="file" accept=".csv" className="hidden" onChange={e=>handleFile(e.target.files[0])}/>
          <span className="text-[28px] mb-2">📂</span>
          <span className="text-[12.5px] font-bold text-text-secondary">{file?file.name:'Click to upload CSV file'}</span>
          <span className="text-[11px] text-text-muted mt-1">CSV files only</span>
        </label>

        {preview.length>0&&(
          <div>
            <p className="text-[11px] font-bold text-text-muted mb-2">Preview (first 5 rows)</p>
            <div className="overflow-x-auto border border-surface-4 rounded-[8px]">
              <table className="w-full text-[11px]">
                <thead><tr className="bg-surface-3 border-b border-surface-4">{['Brand','Model','Year','Price','Condition'].map(h=><th key={h} className="px-3 py-2 text-left text-text-muted font-bold">{h}</th>)}</tr></thead>
                <tbody>{preview.map((r,i)=><tr key={i} className="border-b border-surface-4 last:border-0"><td className="px-3 py-1.5">{r.brand}</td><td className="px-3 py-1.5">{r.model}</td><td className="px-3 py-1.5">{r.year}</td><td className="px-3 py-1.5">{r.price}</td><td className="px-3 py-1.5">{r.condition}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        )}

        {importing&&(
          <div>
            <div className="flex justify-between text-[12px] mb-1"><span className="text-text-muted">Importing…</span><span className="font-bold text-gold">{progress}%</span></div>
            <div className="h-2 bg-surface-3 rounded-full overflow-hidden"><div className="h-full bg-gold rounded-full transition-[width] duration-300" style={{width:`${progress}%`}}/></div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1" disabled={importing}>Cancel</Button>
          <Button variant="gold" onClick={handleImport} disabled={!file||importing} className="flex-1">
            {importing?<><Spinner size={13}/>Importing {progress}%…</>:<><Icon name="dl" size={13}/>Import Vehicles</>}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
