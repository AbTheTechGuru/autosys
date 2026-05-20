import { useState, useEffect, useRef } from 'react';
import { Button }  from '@/shared/components/ui/Button';
import { Badge }   from '@/shared/components/ui/Badge';
import { Icon }    from '@/shared/components/ui/Icon';
import { Modal }   from '@/shared/components/ui/Modal';
import { Input, Select, Field } from '@/shared/components/ui/Input';
import { SearchBar } from '@/shared/components/ui/Input';
import { Tabs }    from '@/shared/components/ui/Tabs';
import { Spinner } from '@/shared/components/ui/Spinner';
import { CardGridSkeleton, TableRowSkeleton } from '@/shared/components/ui/Skeleton';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { useToast } from '@/context/ToastContext';
import { useSalesStore } from '@/store/salesStore';
import { salesApi } from '@/services/api/index';
import client from '@/services/api/client';
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

/* ── Photo upload button ─────────────────────────────────────── */
function PhotoUploadZone({ vehicleId, existingPhotos = [], onPhotosUpdated }) {
  const toast    = useToast();
  const fileRef  = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews]   = useState(existingPhotos);

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append('photos', f));

      // TODO: Connect to backend endpoint when available
      // Expected endpoint: POST /vehicles/:id/photos (multipart/form-data)
      // Expected request: FormData with field 'photos' (multiple files)
      // Expected response: { vehicle: { image_urls: string[] } }
      // For now, create object URLs for local preview
      const localPreviews = Array.from(files).map((f) => URL.createObjectURL(f));
      setPreviews((p) => [...p, ...localPreviews]);
      toast(`${files.length} photo${files.length > 1 ? 's' : ''} attached — will upload when endpoint is ready`);

      if (onPhotosUpdated) onPhotosUpdated(localPreviews);
    } catch (err) {
      toast(err.response?.data?.message || 'Upload failed', 'danger');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div
        className="border-2 border-dashed border-surface-4 rounded-[11px] p-6 text-center cursor-pointer hover:border-gold hover:bg-[rgba(200,151,58,.04)] transition-all"
        role="button"
        tabIndex={0}
        aria-label="Upload vehicle photos"
        onClick={() => fileRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        onDragOver={(e) => e.preventDefault()}
      >
        {uploading ? (
          <><Spinner size={20} style={{ margin: '0 auto 7px' }} /><div className="text-[13px] text-text-secondary">Uploading…</div></>
        ) : (
          <>
            <Icon name="img" size={20} color="#4E4B58" style={{ margin: '0 auto 7px' }} />
            <div className="text-[13px] text-text-secondary">Upload vehicle photos (PNG, JPG, WebP)</div>
            <div className="text-[11px] text-text-muted mt-1">Drag &amp; drop or click to browse</div>
          </>
        )}
      </div>
      {previews.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {previews.map((url, i) => (
            <div key={i} className="w-[60px] h-[44px] rounded-[8px] overflow-hidden border border-surface-4 relative">
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Vehicle detail modal ────────────────────────────────────── */
function VehicleModal({ vehicle, onClose, onDelete }) {
  const toast = useToast();
  if (!vehicle) return null;

  const photos = vehicle.image_urls?.length
    ? vehicle.image_urls
    : [null]; // Show emoji placeholder if no photos

  return (
    <Modal open onClose={onClose} title={vehicle.t} maxWidth={680}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Photo */}
        <div>
          <div
            className="rounded-[12px] h-[210px] flex items-center justify-center text-[86px] mb-3 overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${vehicle.color}bb, ${vehicle.color}44)` }}
            aria-label={`${vehicle.brand} ${vehicle.model} photo`}
          >
            {photos[0] ? (
              <img src={photos[0]} alt={vehicle.t} className="w-full h-full object-cover" />
            ) : (
              vehicle.e
            )}
          </div>
          <div className="flex gap-2">
            {[vehicle.e, '🔧', '📐', '🏎️'].map((e, i) => (
              <div key={i}
                className="w-[60px] h-[44px] rounded-[8px] bg-surface-3 flex items-center justify-center text-[22px] cursor-pointer border-2 transition-colors hover:border-gold"
                style={{ borderColor: i === 0 ? G.g : 'transparent' }}>
                {photos[i] ? <img src={photos[i]} alt="" className="w-full h-full object-cover rounded-[6px]" /> : e}
              </div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div>
          <Badge className="mb-3">{vehicle.status}</Badge>
          <div className="font-display text-[26px] font-bold text-gold mb-4">{fmtN(vehicle.price)}</div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              ['Year',vehicle.year],['Brand',vehicle.brand],['Model',vehicle.model],
              ['Mileage',fmtMileage(vehicle.mileage)],['Fuel',vehicle.fuel_type||vehicle.fuel],
              ['Trans',vehicle.transmission||vehicle.trans],['Condition',vehicle.condition||vehicle.cond],
            ].map(([k,v]) => (
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

  const [form, setForm] = useState({
    brand:'', model:'', year:'', price:'', mileage:'',
    fuel_type:'petrol', transmission:'automatic', condition:'foreign_used',
    status:'available', description:'',
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [photoFiles, setPhotoFiles] = useState([]);
  const fileRef = useRef(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleAdd = async () => {
    setErrors({});
    const { data, errors: errs } = validate(vehicleSchema, sanitizeObject(form));
    if (errs) { setErrors(errs); return; }
    setIsSaving(true);
    try {
      await addVehicle(data);
      toast('Vehicle added!');
      onClose();
      setForm({ brand:'', model:'', year:'', price:'', mileage:'', fuel_type:'petrol', transmission:'automatic', condition:'foreign_used', status:'available', description:'' });
      setPhotoFiles([]);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to add vehicle', 'danger');
    } finally {
      setIsSaving(false);
    }
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
              <option value="foreign_used">Foreign Used</option>
              <option value="locally_used">Locally Used</option>
              <option value="brand_new">Brand New</option>
            </Select>
          </Field>
          <Field label="Status" error={errors.status}>
            <Select value={form.status} onChange={set('status')}>
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="sold">Sold</option>
            </Select>
          </Field>
        </div>

        {/* Photo upload */}
        <Field label="Photos">
          <PhotoUploadZone
            onPhotosUpdated={(files) => setPhotoFiles(files)}
          />
        </Field>

        <div className="flex gap-2 justify-end mt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="gold" onClick={handleAdd} disabled={isSaving}>
            {isSaving ? <><Spinner size={13} />Adding…</> : <><Icon name="plus" size={13} />Add Vehicle</>}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── CSV Import modal ─────────────────────────────────────────── */
function CsvImportModal({ open, onClose }) {
  const toast    = useToast();
  const fileRef  = useRef(null);
  const [file,     setFile]     = useState(null);
  const [importing, setImporting] = useState(false);
  const [preview,  setPreview]  = useState([]);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    // Show first few rows as preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = ev.target.result.split('\n').slice(0, 4).map((r) => r.split(','));
      setPreview(rows);
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      // Parse CSV to vehicle objects
      const reader = new FileReader();
      const text   = await new Promise((res) => { reader.onload = (e) => res(e.target.result); reader.readAsText(file); });
      const lines  = text.trim().split('\n');
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const vehicles = lines.slice(1).map((line) => {
        const vals = line.split(',');
        const obj  = {};
        headers.forEach((h, i) => { obj[h] = vals[i]?.trim(); });
        return obj;
      }).filter((v) => v.brand && v.model);

      if (!vehicles.length) {
        toast('No valid vehicle rows found in CSV', 'warning');
        return;
      }

      const { data } = await salesApi.bulkVehicles({ vehicles });
      toast(`${data.imported} vehicle${data.imported > 1 ? 's' : ''} imported!`);
      onClose();
      setFile(null);
      setPreview([]);
    } catch (err) {
      toast(err.response?.data?.message || 'Import failed', 'danger');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Import Vehicles from CSV" maxWidth={540}>
      <div className="flex flex-col gap-4">
        <div className="bg-surface-3 rounded-[10px] p-3 border border-surface-4 text-[12px] text-text-secondary">
          <p className="font-bold mb-1">Expected CSV columns:</p>
          <p className="font-mono text-[11px]">brand, model, year, price, mileage, fuel_type, transmission, condition, status, description</p>
        </div>

        <div
          className="border-2 border-dashed border-surface-4 rounded-[11px] p-6 text-center cursor-pointer hover:border-gold transition-all"
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          <Icon name="upload" size={22} color="#4E4B58" style={{ margin: '0 auto 8px' }} />
          {file ? (
            <><div className="font-bold text-[13px]">{file.name}</div><div className="text-[11px] text-text-muted mt-1">Click to change</div></>
          ) : (
            <><div className="text-[13px] text-text-secondary">Upload your CSV file</div><div className="text-[11px] text-text-muted mt-1">Click or drag &amp; drop</div></>
          )}
        </div>

        {preview.length > 0 && (
          <div className="overflow-x-auto rounded-[9px] border border-surface-4">
            <table className="w-full text-[11px]">
              {preview.map((row, i) => (
                <tr key={i} className={i === 0 ? 'bg-surface-3 font-bold' : 'border-t border-surface-4'}>
                  {row.slice(0, 5).map((cell, j) => (
                    <td key={j} className="px-3 py-2 truncate max-w-[100px]">{cell}</td>
                  ))}
                </tr>
              ))}
            </table>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="gold" onClick={handleImport} disabled={!file || importing}>
            {importing ? <><Spinner size={13} />Importing…</> : <><Icon name="upload" size={13} />Import CSV</>}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */
export function InventoryPage() {
  const toast         = useToast();
  const vehicles      = useSalesStore((s) => s.vehicles);
  const viewMode      = useSalesStore((s) => s.viewMode);
  const statusFilter  = useSalesStore((s) => s.statusFilter);
  const searchQuery   = useSalesStore((s) => s.searchQuery);
  const isLoading     = useSalesStore((s) => s.isLoading);
  const setViewMode   = useSalesStore((s) => s.setViewMode);
  const setFilter     = useSalesStore((s) => s.setStatusFilter);
  const setSearch     = useSalesStore((s) => s.setSearch);
  const removeVehicle = useSalesStore((s) => s.removeVehicle);
  const getFiltered   = useSalesStore((s) => s.getFilteredVehicles);
  const fetchVehicles = useSalesStore((s) => s.fetchVehicles);

  const [addOpen,    setAddOpen]    = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [detailVeh,  setDetail]     = useState(null);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const filtered  = getFiltered();
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
          <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)}>
            <Icon name="upload" size={13} />Import CSV
          </Button>
          <Button variant="gold" size="sm" onClick={() => setAddOpen(true)}>
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
        <Tabs tabs={STATUS_TABS} active={statusFilter} onChange={setFilter} />
        <div className="flex gap-1 ml-auto">
          {[['grid','grid'],['list','list']].map(([v, ic]) => (
            <Button key={v} variant={viewMode === v ? 'solid' : 'ghost'} size="sm"
              style={{ padding:'6px 9px' }} onClick={() => setViewMode(v)} aria-label={`${v} view`}>
              <Icon name={ic} size={14} />
            </Button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && filtered.length === 0 && viewMode === 'grid' && <CardGridSkeleton />}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <EmptyState icon="car" title="No vehicles found"
          desc="Try adjusting your search or filters." action={() => setAddOpen(true)} actionLabel="Add Vehicle" />
      )}

      {/* Grid view */}
      {viewMode === 'grid' && filtered.length > 0 && (
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
          {filtered.map((v) => (
            <article key={v.id}
              className="bg-surface-2 border border-surface-4 rounded-[14px] overflow-hidden cursor-pointer transition-all duration-200 hover:border-[rgba(200,151,58,.32)] hover:-translate-y-[3px] hover:shadow-[0_14px_42px_rgba(0,0,0,.4)]"
              onClick={() => setDetail(v)}>
              <div className="h-[142px] flex items-center justify-center text-[56px] relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${v.color}bb, ${v.color}44)` }}>
                {v.image_urls?.[0]
                  ? <img src={v.image_urls[0]} alt={v.t} className="w-full h-full object-cover" />
                  : v.e}
                <span className="absolute top-2 right-2"><Badge>{v.status}</Badge></span>
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
          {/* Mobile card list */}
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
                  <button key={v.id}
                    className="bg-surface-2 border border-surface-4 rounded-[12px] p-4 text-left w-full hover:border-[rgba(200,151,58,.22)] transition-colors"
                    onClick={() => setDetail(v)}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-[46px] h-[46px] rounded-[10px] flex items-center justify-center text-[24px] shrink-0 overflow-hidden"
                        style={{ background: `${v.color}33` }}>
                        {v.image_urls?.[0]
                          ? <img src={v.image_urls[0]} alt={v.t} className="w-full h-full object-cover" />
                          : v.e}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-[14px] truncate">{v.t}</div>
                        <div className="text-gold font-extrabold text-[13px]">{fmtN(v.price)}</div>
                      </div>
                      <Badge>{v.status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11.5px] text-text-secondary">
                      <span>{v.fuel_type || v.fuel}</span><span>·</span>
                      <span>{fmtMileage(v.mileage)}</span><span>·</span>
                      <span>{v.condition || v.cond}</span>
                    </div>
                  </button>
                ))
            }
          </div>

          {/* Desktop table */}
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
                {isLoading
                  ? Array(5).fill(0).map((_, i) => <TableRowSkeleton key={i} cols={8} />)
                  : filtered.map((v) => (
                    <tr key={v.id}
                      className="border-b border-[rgba(33,33,46,.4)] last:border-0 hover:bg-[rgba(255,255,255,.01)] cursor-pointer"
                      onClick={() => setDetail(v)}>
                      <td className="px-[18px] py-3">
                        <div className="flex items-center gap-[9px]">
                          <div className="w-[32px] h-[32px] rounded-[7px] overflow-hidden flex items-center justify-center text-[18px] shrink-0"
                            style={{ background: `${v.color}33` }}>
                            {v.image_urls?.[0]
                              ? <img src={v.image_urls[0]} alt={v.t} className="w-full h-full object-cover" />
                              : v.e}
                          </div>
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
                      <td className="px-[14px] py-3" onClick={(e) => e.stopPropagation()}>
                        <Button variant="danger" size="xs"
                          onClick={() => { removeVehicle(v.id); toast('Vehicle removed', 'danger'); }}
                          aria-label={`Delete ${v.t}`}>
                          <Icon name="trash" size={11} />
                        </Button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modals */}
      <AddVehicleModal open={addOpen} onClose={() => setAddOpen(false)} />
      <CsvImportModal open={importOpen} onClose={() => { setImportOpen(false); fetchVehicles(); }} />
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
