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
import { TableRowSkeleton } from '@/shared/components/ui/Skeleton';
import { useToast } from '@/context/ToastContext';
import { useSalesStore } from '@/store/salesStore';
import { fmtM, fmtN, fmtMileage } from '@/shared/utils/format';
import { validate, vehicleSchema } from '@/schemas';
import { sanitizeObject } from '@/shared/utils/sanitize';
import { G } from '@/shared/utils/tokens';
import { VEHICLE_CONDITION, VEHICLE_STATUS } from '@/shared/constants';

const STATUS_TABS = [
  { key:'All',       label:'All'       },
  { key:'Available', label:'Available' },
  { key:'Reserved',  label:'Reserved'  },
  { key:'Sold',      label:'Sold'      },
];

/* ── Vehicle detail modal ─────────────────────────────────── */
function VehicleModal({ vehicle, onClose, onDelete, deleting }) {
  const [photoTab, setPhotoTab] = useState(false);
  if (!vehicle) return null;
  return (
    <Modal open onClose={onClose} title={vehicle.t} maxWidth={680}>
      {/* Tab switcher */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setPhotoTab(false)}
          className={`px-3 py-1.5 rounded-[7px] text-[12px] font-bold transition-colors ${!photoTab ? 'bg-gold text-[#0A0812]' : 'text-text-muted hover:bg-surface-3'}`}
        >
          Details
        </button>
        <button
          onClick={() => setPhotoTab(true)}
          className={`px-3 py-1.5 rounded-[7px] text-[12px] font-bold transition-colors ${photoTab ? 'bg-gold text-[#0A0812]' : 'text-text-muted hover:bg-surface-3'}`}
        >
          📸 Photos {vehicle.image_urls?.length > 0 ? `(${vehicle.image_urls.length})` : ''}
        </button>
      </div>

      {/* Photos tab */}
      {photoTab && (
        <VehicleImageUploader
          vehicleId={vehicle.id}
          existingUrls={vehicle.image_urls || []}
        />
      )}

      {/* Details tab */}
      {!photoTab && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Photo */}
        <div>
          <div
            className="rounded-[12px] h-[210px] flex items-center justify-center text-[86px] mb-3"
            style={{ background: `linear-gradient(135deg, ${vehicle.color}bb, ${vehicle.color}44)` }}
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
            {[['Year',vehicle.year],['Brand',vehicle.brand],['Model',vehicle.model],
              ['Mileage',fmtMileage(vehicle.mileage)],['Fuel',vehicle.fuel_type||vehicle.fuel],
              ['Trans',vehicle.transmission||vehicle.trans],['Condition',vehicle.condition||vehicle.cond]
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
            <Button variant="ghost" size="sm" className="flex-1 justify-center">
              <Icon name="edit" size={13} />Edit
            </Button>
            <Button variant="danger" size="sm" onClick={onDelete} disabled={deleting}>
              {deleting ? <Spinner size={12} /> : <Icon name="trash" size={13} />}
            </Button>
          </div>
        </div>
      </div>
      )} {/* end details tab */}
    </Modal>
  );
}

/* ── Add vehicle modal ────────────────────────────────────── */
function AddVehicleModal({ open, onClose }) {
  const toast      = useToast();
  const addVehicle = useSalesStore((s) => s.addVehicle);
  const [form, setForm]     = useState({
    brand:'', model:'', year:'', price:'', mileage:'',
    fuel_type:'petrol', transmission:'automatic',
    condition:'foreign_used', status:'available', description:'',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleAdd = async () => {
    setErrors({});
    const { data, errors: errs } = validate(vehicleSchema, sanitizeObject(form));
    if (errs) { setErrors(errs); return; }
    setSaving(true);
    try {
      await addVehicle(data);
      toast('Vehicle added!', 'ok');
      onClose();
      setForm({ brand:'', model:'', year:'', price:'', mileage:'', fuel_type:'petrol', transmission:'automatic', condition:'foreign_used', status:'available', description:'' });
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to add vehicle', 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add New Vehicle" maxWidth={600}>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          {[['Brand *','brand','Toyota'],['Model *','model','Camry'],['Year *','year','2023'],
            ['Price (₦) *','price','18500000'],['Mileage (km) *','mileage','42000']
          ].map(([l,k,p]) => (
            <Field key={k} label={l} error={errors[k]}>
              <Input
                placeholder={p}
                type={['price','mileage','year'].includes(k) ? 'number' : 'text'}
                value={form[k]}
                onChange={set(k)}
              />
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
          <Field label="Transmission" error={errors.transmission}>
            <Select value={form.transmission} onChange={set('transmission')}>
              <option value="automatic">Automatic</option>
              <option value="manual">Manual</option>
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

        <Field label="Description">
          <Input
            placeholder="Optional notes about this vehicle…"
            value={form.description}
            onChange={set('description')}
          />
        </Field>

        <div className="flex gap-2 justify-end mt-1">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="gold" onClick={handleAdd} disabled={saving}>
            {saving ? <><Spinner size={13} />Saving…</> : <><Icon name="plus" size={13} />Add Vehicle</>}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Page ─────────────────────────────────────────────────── */
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

  const [addOpen,   setAddOpen]  = useState(false);
  const [detailVeh, setDetail]   = useState(null);
  const [deleting,  setDeleting] = useState(false);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const filtered  = getFiltered();
  const available = vehicles.filter((v) => v.status === 'Available').length;

  const handleDelete = async (vehicle) => {
    if (!window.confirm(`Delete "${vehicle.t}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await removeVehicle(vehicle.id);
      setDetail(null);
      toast('Vehicle deleted', 'ok');
    } catch {
      toast('Failed to delete vehicle', 'danger');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold">Inventory</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">
            {vehicles.length} vehicles · {available} available
          </p>
        </div>
        <div className="flex gap-2">
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

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-surface-2 border border-surface-4 rounded-[14px] overflow-hidden animate-pulse">
              <div className="h-[142px] bg-surface-3" />
              <div className="p-[14px]">
                <div className="h-4 bg-surface-4 rounded w-3/4 mb-2" />
                <div className="h-5 bg-surface-4 rounded w-1/2 mb-2" />
                <div className="h-3 bg-surface-4 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon="car"
          title="No vehicles found"
          desc="Add your first vehicle to get started."
          action={() => setAddOpen(true)}
          actionLabel="Add Vehicle"
        />
      )}

      {/* Grid view */}
      {!isLoading && viewMode === 'grid' && filtered.length > 0 && (
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
                  <span>{v.fuel_type||v.fuel}</span><span>·</span>
                  <span>{fmtMileage(v.mileage)}</span><span>·</span>
                  <span>{v.condition||v.cond}</span>
                </div>
                <div className="flex gap-2 text-[10.5px] text-text-muted">
                  <span>👁 {v.views}</span><span>·</span>
                  <span>💬 {v.inq}</span><span>·</span>
                  <span>📅 {v.days}d</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* List view */}
      {!isLoading && viewMode === 'list' && filtered.length > 0 && (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden mb-6">
            {filtered.map((v) => (
              <button
                key={v.id}
                className="bg-surface-2 border border-surface-4 rounded-[12px] p-4 text-left w-full hover:border-[rgba(200,151,58,.22)] transition-colors"
                onClick={() => setDetail(v)}
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
                  <span>{v.fuel_type||v.fuel}</span><span>·</span>
                  <span>{fmtMileage(v.mileage)}</span><span>·</span>
                  <span>{v.condition||v.cond}</span>
                </div>
              </button>
            ))}
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
                    <td className="px-[14px] py-3" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="danger"
                        size="xs"
                        onClick={() => handleDelete(v)}
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
      <AddVehicleModal open={addOpen} onClose={() => setAddOpen(false)} />
      <VehicleModal
        vehicle={detailVeh}
        onClose={() => setDetail(null)}
        deleting={deleting}
        onDelete={() => handleDelete(detailVeh)}
      />
    </div>
  );
}

/* ─── VehicleImageUploader ──────────────────────────────────── */
// Add this inside InventoryPage.jsx after the existing imports.
// It is used inside VehicleModal to manage photos.

export function VehicleImageUploader({ vehicleId, existingUrls = [], onUpdated }) {
  const toast   = useToast();
  const updateV = useSalesStore((s) => s.updateVehicle);

  const [urls,       setUrls]       = useState(existingUrls);
  const [uploading,  setUploading]  = useState(false);
  const [deleting,   setDeleting]   = useState(null); // url being deleted

  const handleFiles = async (files) => {
    if (!files?.length) return;
    const allowed = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, 10 - urls.length);
    if (!allowed.length) { toast('Only image files are allowed', 'warning'); return; }

    setUploading(true);
    try {
      // Convert each file to base64
      const images = await Promise.all(
        allowed.map((file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload  = () => resolve({ base64: reader.result, type: file.type, name: file.name });
            reader.onerror = reject;
            reader.readAsDataURL(file);
          }),
        ),
      );

      const { vehicleImageApi } = await import('@/services/api');
      const { data } = await vehicleImageApi.uploadImages(vehicleId, images);
      const newUrls = data.urls || [];
      const merged  = [...urls, ...newUrls];
      setUrls(merged);
      updateV(vehicleId, { image_urls: merged });
      onUpdated?.(merged);
      toast(`${newUrls.length} photo${newUrls.length > 1 ? 's' : ''} uploaded!`, 'ok');
    } catch (err) {
      toast(err.response?.data?.message || 'Upload failed', 'danger');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (url) => {
    setDeleting(url);
    try {
      const { vehicleImageApi } = await import('@/services/api');
      await vehicleImageApi.deleteImage(vehicleId, url);
      const filtered = urls.filter((u) => u !== url);
      setUrls(filtered);
      updateV(vehicleId, { image_urls: filtered });
      onUpdated?.(filtered);
      toast('Photo removed', 'ok');
    } catch {
      toast('Failed to remove photo', 'danger');
    } finally {
      setDeleting(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <p className="text-[11px] font-extrabold uppercase tracking-[1.8px] text-text-muted mb-2">
        Photos ({urls.length}/10)
      </p>

      {/* Existing photos grid */}
      {urls.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
          {urls.map((url) => (
            <div key={url} className="relative group rounded-[8px] overflow-hidden aspect-square bg-surface-3">
              <img src={url} alt="Vehicle" className="w-full h-full object-cover" />
              <button
                onClick={() => handleDelete(url)}
                disabled={!!deleting}
                className="absolute top-1 right-1 w-[22px] h-[22px] rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                {deleting === url
                  ? <span className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin" />
                  : <span className="text-white text-[10px] font-bold">×</span>
                }
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {urls.length < 10 && (
        <label
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex flex-col items-center justify-center border-2 border-dashed border-surface-4 rounded-[10px] py-5 px-4 cursor-pointer hover:border-gold transition-colors"
        >
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading}
          />
          {uploading
            ? <><span className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin mb-2" /><span className="text-[12px] text-gold font-bold">Uploading…</span></>
            : <><span className="text-[26px] mb-1">📸</span><span className="text-[12.5px] font-bold text-text-secondary">Click or drag photos here</span><span className="text-[11px] text-text-muted mt-1">JPG, PNG, WEBP · max 10 photos</span></>
          }
        </label>
      )}
    </div>
  );
}
