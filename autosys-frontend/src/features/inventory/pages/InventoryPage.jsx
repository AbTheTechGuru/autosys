import { useState, useEffect } from 'react';
import { Button }  from '@/shared/components/ui/Button';
import { Badge }   from '@/shared/components/ui/Badge';
import { Icon }    from '@/shared/components/ui/Icon';
import { Modal }   from '@/shared/components/ui/Modal';
import { Input, Select, Field } from '@/shared/components/ui/Input';
import { SearchBar } from '@/shared/components/ui/Input';
import { Tabs }    from '@/shared/components/ui/Tabs';
import { Spinner } from '@/shared/components/ui/Spinner';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { useToast } from '@/context/ToastContext';
import { useSalesStore } from '@/store/salesStore';
import { fmtM, fmtN, fmtMileage } from '@/shared/utils/format';
import { G } from '@/shared/utils/tokens';

const STATUS_TABS = [
  { key:'All', label:'All' },
  { key:'Available', label:'Available' },
  { key:'Reserved',  label:'Reserved'  },
  { key:'Sold',      label:'Sold'      },
];

/* ── Inline photo uploader (no backend needed — stores base64 locally until saved) */
function PhotoUploader({ photos, onPhotos }) {
  const [dragging, setDragging] = useState(false);

  const readFiles = (files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 10 - photos.length);
    if (!valid.length) return;
    valid.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        onPhotos(prev => [...prev, { base64: e.target.result, type: file.type, name: file.name, preview: e.target.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div>
      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          {photos.map((p, i) => (
            <div key={i} className="relative aspect-square rounded-[8px] overflow-hidden bg-surface-3 group">
              <img src={p.preview || p.base64} alt="" className="w-full h-full object-cover"/>
              <button onClick={() => onPhotos(prev => prev.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-[11px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">×</button>
            </div>
          ))}
        </div>
      )}
      {photos.length < 10 && (
        <label
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); readFiles(e.dataTransfer.files); }}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[10px] py-5 px-4 cursor-pointer transition-colors ${dragging ? 'border-gold bg-[rgba(200,151,58,.08)]' : 'border-surface-4 hover:border-gold'}`}>
          <input type="file" accept="image/*" multiple className="hidden" onChange={e => readFiles(e.target.files)}/>
          <Icon name="img" size={22} color={dragging ? '#C8973A' : '#4E4B58'}/>
          <p className="text-[12.5px] font-bold text-text-secondary mt-2">
            {dragging ? 'Drop photos here' : 'Upload vehicle photos (PNG, JPG)'}
          </p>
          <p className="text-[11px] text-text-muted mt-1">{photos.length}/10 photos · Click or drag & drop</p>
        </label>
      )}
    </div>
  );
}

/* ── Add Vehicle Modal ────────────────────────────────────── */
function AddVehicleModal({ open, onClose }) {
  const toast      = useToast();
  const addVehicle = useSalesStore(s => s.addVehicle);
  const [photos, setPhotos] = useState([]);
  const [form, setForm]     = useState({
    brand:'', model:'', year:'', price:'', mileage:'',
    fuel_type:'petrol', transmission:'automatic',
    condition:'foreign-used', status:'available', description:'',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleAdd = async () => {
    // Basic validation
    const errs = {};
    if (!form.brand)   errs.brand   = 'Brand is required';
    if (!form.model)   errs.model   = 'Model is required';
    if (!form.year)    errs.year    = 'Year is required';
    if (!form.price)   errs.price   = 'Price is required';
    if (!form.mileage && form.mileage !== 0) errs.mileage = 'Mileage is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const saved = await addVehicle({
        ...form,
        year:    Number(form.year),
        price:   Number(form.price),
        mileage: Number(form.mileage),
      });

      // Upload photos if any were selected
      if (photos.length && saved?.id && !String(saved.id).startsWith('temp-')) {
        try {
          const { vehicleImageApi } = await import('@/services/api');
          await vehicleImageApi.uploadImages(saved.id, photos.map(p => ({
            base64: p.base64, type: p.type, name: p.name,
          })));
        } catch {
          // Photo upload failed silently — vehicle was still created
          toast('Vehicle added! Photos failed to upload — try from the vehicle detail.', 'warning');
        }
      }

      toast('Vehicle added!', 'ok');
      onClose();
      setForm({ brand:'', model:'', year:'', price:'', mileage:'', fuel_type:'petrol', transmission:'automatic', condition:'foreign-used', status:'available', description:'' });
      setPhotos([]);
      setErrors({});
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to add vehicle', 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add New Vehicle" maxWidth={600}>
      <div className="flex flex-col gap-3 max-h-[80vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand *" error={errors.brand}>
            <Input placeholder="Toyota" value={form.brand} onChange={set('brand')}/>
          </Field>
          <Field label="Model *" error={errors.model}>
            <Input placeholder="Camry" value={form.model} onChange={set('model')}/>
          </Field>
          <Field label="Year *" error={errors.year}>
            <Input type="number" placeholder="2023" value={form.year} onChange={set('year')}/>
          </Field>
          <Field label="Price (₦) *" error={errors.price}>
            <Input type="number" placeholder="18500000" value={form.price} onChange={set('price')}/>
          </Field>
          <Field label="Mileage (km) *" error={errors.mileage}>
            <Input type="number" placeholder="42000" value={form.mileage} onChange={set('mileage')}/>
          </Field>
          <Field label="Fuel">
            <Select value={form.fuel_type} onChange={set('fuel_type')}>
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="hybrid">Hybrid</option>
              <option value="electric">Electric</option>
            </Select>
          </Field>
          <Field label="Condition">
            <Select value={form.condition} onChange={set('condition')}>
              <option value="foreign-used">Foreign Used</option>
              <option value="nigerian-used">Nigerian Used</option>
              <option value="brand-new">Brand New</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={set('status')}>
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="sold">Sold</option>
            </Select>
          </Field>
        </div>

        <Field label="Description">
          <Input placeholder="Optional notes about this vehicle…" value={form.description} onChange={set('description')}/>
        </Field>

        {/* Photo upload — works immediately */}
        <div>
          <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-widest mb-2">Vehicle Photos</p>
          <PhotoUploader photos={photos} onPhotos={setPhotos}/>
        </div>

        <div className="flex gap-2 justify-end mt-1">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="gold" onClick={handleAdd} disabled={saving}>
            {saving ? <><Spinner size={13}/>Saving…</> : <><Icon name="plus" size={13}/>Add Vehicle</>}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Bulk Import Modal ────────────────────────────────────── */
function BulkImportModal({ open, onClose }) {
  const toast      = useToast();
  const addVehicle = useSalesStore(s => s.addVehicle);
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress]   = useState(0);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => {
      const rows = e.target.result.split('\n').filter(Boolean);
      const hdrs = rows[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
      const parsed = rows.slice(1).map(row => {
        const vals = row.split(',');
        return Object.fromEntries(hdrs.map((h, i) => [h, vals[i]?.trim() || '']));
      }).filter(r => r.brand && r.model);
      setPreview(parsed.slice(0, 5));
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true); setProgress(0);
    const reader = new FileReader();
    reader.onload = async e => {
      const rows = e.target.result.split('\n').filter(Boolean);
      const hdrs = rows[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
      const data = rows.slice(1).map(r => Object.fromEntries(hdrs.map((h, i) => [h, r.split(',')[i]?.trim() || '']))).filter(r => r.brand && r.model);
      let count = 0;
      for (let i = 0; i < data.length; i++) {
        try {
          await addVehicle({
            brand:        data[i].brand,
            model:        data[i].model,
            year:         Number(data[i].year) || 2020,
            price:        Number(data[i].price) || 0,
            mileage:      Number(data[i].mileage || data[i].km) || 0,
            fuel_type:    data[i].fuel_type || data[i].fuel || 'petrol',
            transmission: data[i].transmission || 'automatic',
            condition:    data[i].condition || 'foreign-used',
            status:       data[i].status || 'available',
            description:  data[i].description || data[i].notes || '',
          });
          count++;
        } catch {}
        setProgress(Math.round(((i + 1) / data.length) * 100));
      }
      toast(`Imported ${count}/${data.length} vehicles!`, 'ok');
      setImporting(false); setFile(null); setPreview([]); setProgress(0);
      onClose();
    };
    reader.readAsText(file);
  };

  return (
    <Modal open={open} onClose={onClose} title="Bulk Import Vehicles" maxWidth={560}>
      <div className="space-y-4">
        <div className="bg-surface-3 border border-surface-4 rounded-[10px] p-3">
          <p className="text-[11.5px] font-bold text-text-secondary mb-1">CSV Format Required</p>
          <code className="text-[10.5px] font-mono text-gold block">brand,model,year,price,mileage,fuel_type,transmission,condition,status</code>
          <code className="text-[10.5px] font-mono text-text-muted block mt-1">Toyota,Camry,2022,18500000,42000,petrol,automatic,foreign-used,available</code>
        </div>

        <label className="flex flex-col items-center justify-center border-2 border-dashed border-surface-4 rounded-[10px] py-6 px-4 cursor-pointer hover:border-gold transition-colors">
          <input type="file" accept=".csv,.txt" className="hidden" onChange={e => handleFile(e.target.files[0])}/>
          <span className="text-[28px] mb-2">📂</span>
          <span className="text-[12.5px] font-bold text-text-secondary">{file ? file.name : 'Click to upload CSV file'}</span>
          <span className="text-[11px] text-text-muted mt-1">CSV files only</span>
        </label>

        {preview.length > 0 && (
          <div className="overflow-x-auto border border-surface-4 rounded-[8px]">
            <table className="w-full text-[11px]">
              <thead><tr className="bg-surface-3 border-b border-surface-4">{['Brand','Model','Year','Price','Condition'].map(h => <th key={h} className="px-3 py-2 text-left text-text-muted font-bold">{h}</th>)}</tr></thead>
              <tbody>{preview.map((r, i) => <tr key={i} className="border-b border-surface-4 last:border-0"><td className="px-3 py-1.5">{r.brand}</td><td className="px-3 py-1.5">{r.model}</td><td className="px-3 py-1.5">{r.year}</td><td className="px-3 py-1.5">{r.price}</td><td className="px-3 py-1.5">{r.condition}</td></tr>)}</tbody>
            </table>
          </div>
        )}

        {importing && (
          <div>
            <div className="flex justify-between text-[12px] mb-1"><span className="text-text-muted">Importing…</span><span className="font-bold text-gold">{progress}%</span></div>
            <div className="h-2 bg-surface-3 rounded-full overflow-hidden"><div className="h-full bg-gold rounded-full transition-[width] duration-300" style={{width:`${progress}%`}}/></div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1" disabled={importing}>Cancel</Button>
          <Button variant="gold" onClick={handleImport} disabled={!file || importing} className="flex-1">
            {importing ? <><Spinner size={13}/>Importing {progress}%…</> : <><Icon name="dl" size={13}/>Import Vehicles</>}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Vehicle detail card ──────────────────────────────────── */
function VehicleCard({ v, onClick }) {
  return (
    <article onClick={onClick}
      className="bg-surface-2 border border-surface-4 rounded-[14px] overflow-hidden cursor-pointer transition-all duration-200 hover:border-[rgba(200,151,58,.32)] hover:-translate-y-[3px] hover:shadow-[0_14px_42px_rgba(0,0,0,.4)]">
      <div className="h-[142px] flex items-center justify-center text-[56px] relative"
        style={{background:`linear-gradient(135deg,${v.color}bb,${v.color}44)`}}>
        {v.image_urls?.[0] ? <img src={v.image_urls[0]} alt={v.t} className="w-full h-full object-cover absolute inset-0"/> : v.e}
        <span className="absolute top-2 right-2"><Badge>{v.status}</Badge></span>
      </div>
      <div className="p-[14px]">
        <h3 className="font-extrabold text-[13.5px] mb-1 truncate">{v.t}</h3>
        <div className="font-display text-[19px] text-gold mb-2">{fmtM(v.price)}</div>
        <div className="flex gap-2 text-[11.5px] text-text-secondary">
          <span>{v.fuel_type || v.fuel}</span><span>·</span>
          <span>{fmtMileage(v.mileage)}</span><span>·</span>
          <span>{v.condition || v.cond}</span>
        </div>
      </div>
    </article>
  );
}

/* ── Main Page ────────────────────────────────────────────── */
export function InventoryPage() {
  const toast         = useToast();
  const vehicles      = useSalesStore(s => s.vehicles);
  const viewMode      = useSalesStore(s => s.viewMode);
  const statusFilter  = useSalesStore(s => s.statusFilter);
  const searchQuery   = useSalesStore(s => s.searchQuery);
  const isLoading     = useSalesStore(s => s.isLoading);
  const setViewMode   = useSalesStore(s => s.setViewMode);
  const setFilter     = useSalesStore(s => s.setStatusFilter);
  const setSearch     = useSalesStore(s => s.setSearch);
  const removeVehicle = useSalesStore(s => s.removeVehicle);
  const getFiltered   = useSalesStore(s => s.getFilteredVehicles);
  const fetchVehicles = useSalesStore(s => s.fetchVehicles);

  const [addOpen,    setAddOpen]    = useState(false);
  const [bulkOpen,   setBulkOpen]   = useState(false);
  const [detailVeh,  setDetail]     = useState(null);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const filtered  = getFiltered();
  const available = vehicles.filter(v => v.status === 'Available').length;

  const handleDelete = async (vehicle) => {
    if (!window.confirm(`Delete "${vehicle.t}"?`)) return;
    await removeVehicle(vehicle.id);
    setDetail(null);
    toast('Vehicle deleted', 'ok');
  };

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold">Inventory</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">{vehicles.length} vehicles · {available} available</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setBulkOpen(true)}><Icon name="dl" size={13}/>Bulk Import</Button>
          <Button variant="gold"  size="sm" onClick={() => setAddOpen(true)}><Icon name="plus" size={13}/>Add Vehicle</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap items-start sm:items-center">
        <SearchBar placeholder="Search vehicles…" value={searchQuery} onChange={e => setSearch(e.target.value)} className="w-full sm:max-w-[280px]"/>
        <Tabs tabs={STATUS_TABS} active={statusFilter} onChange={setFilter}/>
        <div className="flex gap-1 ml-auto">
          {[['grid','grid'],['list','list']].map(([v,ic]) => (
            <Button key={v} variant={viewMode===v?'solid':'ghost'} size="sm" style={{padding:'6px 9px'}} onClick={() => setViewMode(v)} aria-label={`${v} view`}>
              <Icon name={ic} size={14}/>
            </Button>
          ))}
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
          {Array(6).fill(0).map((_,i) => (
            <div key={i} className="bg-surface-2 border border-surface-4 rounded-[14px] overflow-hidden animate-pulse">
              <div className="h-[142px] bg-surface-3"/>
              <div className="p-[14px]"><div className="h-4 bg-surface-4 rounded w-3/4 mb-2"/><div className="h-5 bg-surface-4 rounded w-1/2"/></div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <EmptyState icon="car" title="No vehicles found" desc="Add your first vehicle to get started." action={() => setAddOpen(true)} actionLabel="Add Vehicle"/>
      )}

      {/* Grid view */}
      {!isLoading && viewMode === 'grid' && filtered.length > 0 && (
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
          {filtered.map(v => <VehicleCard key={v.id} v={v} onClick={() => setDetail(v)}/>)}
        </div>
      )}

      {/* List view */}
      {!isLoading && viewMode === 'list' && filtered.length > 0 && (
        <div className="hidden md:block border border-surface-4 rounded-[12px] overflow-x-auto mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr>{['Vehicle','Price','Mileage','Fuel','Condition','Status',''].map(h => (
                <th key={h} className="text-left px-[14px] py-[9px] text-[9.5px] font-extrabold uppercase tracking-[1px] text-text-muted bg-surface-3 border-b border-surface-4 first:pl-[18px]">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.id} className="border-b border-[rgba(33,33,46,.4)] last:border-0 hover:bg-[rgba(255,255,255,.01)] cursor-pointer" onClick={() => setDetail(v)}>
                  <td className="px-[18px] py-3">
                    <div className="flex items-center gap-[9px]">
                      {v.image_urls?.[0] ? <img src={v.image_urls[0]} alt="" className="w-8 h-8 rounded-[6px] object-cover"/> : <span className="text-[22px]">{v.e}</span>}
                      <div><div className="font-extrabold text-[13px]">{v.t}</div><div className="text-[11px] text-text-muted">{v.year}</div></div>
                    </div>
                  </td>
                  <td className="px-[14px] py-3 text-gold font-extrabold">{fmtM(v.price)}</td>
                  <td className="px-[14px] py-3 text-text-secondary">{fmtMileage(v.mileage)}</td>
                  <td className="px-[14px] py-3">{v.fuel_type || v.fuel}</td>
                  <td className="px-[14px] py-3">{v.condition || v.cond}</td>
                  <td className="px-[14px] py-3"><Badge>{v.status}</Badge></td>
                  <td className="px-[14px] py-3" onClick={e => e.stopPropagation()}>
                    <Button variant="danger" size="xs" onClick={() => handleDelete(v)}><Icon name="trash" size={11}/></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddVehicleModal open={addOpen} onClose={() => setAddOpen(false)}/>
      <BulkImportModal open={bulkOpen} onClose={() => setBulkOpen(false)}/>
    </div>
  );
}
