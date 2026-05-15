import { create } from 'zustand';
import { salesApi } from '@/services/api/index';

// ── helpers ────────────────────────────────────────────────────
const FUEL_MAP  = { petrol:'Petrol', diesel:'Diesel', hybrid:'Hybrid', electric:'Electric', cng:'CNG' };
const COND_MAP  = { foreign_used:'Foreign Used', locally_used:'Used', brand_new:'New' };
const STAT_MAP  = { available:'Available', reserved:'Reserved', sold:'Sold' };
const EMOJI_MAP = { Toyota:'🚗', Mercedes:'🚙', BMW:'🚙', Lexus:'🚘', Honda:'🚗', Ford:'🛻', Hyundai:'🚗', Kia:'🚗', Volkswagen:'🚙' };

// Backend stores price in kobo — convert to naira for display
const fromKobo = (n) => Math.round((n || 0) / 100);
// Frontend sends naira — convert to kobo for backend
const toKobo   = (n) => Math.round(Number(n) * 100);

const mapVehicle = (v) => ({
  id:           v.id,
  t:            `${v.year} ${v.brand} ${v.model}`,
  brand:        v.brand,
  model:        v.model,
  year:         v.year,
  price:        fromKobo(v.price),
  mileage:      v.mileage || 0,
  fuel:         FUEL_MAP[v.fuel_type]  || v.fuel_type  || '—',
  fuel_type:    v.fuel_type,
  trans:        v.transmission === 'automatic' ? 'Automatic' : 'Manual',
  transmission: v.transmission,
  cond:         COND_MAP[v.condition]  || v.condition   || '—',
  condition:    v.condition,
  status:       STAT_MAP[v.status]     || v.status      || 'Available',
  color:        v.color || '#444',
  e:            EMOJI_MAP[v.brand]     || '🚗',
  views:        v.views_count   || 0,
  inq:          v.inquiry_count || 0,
  days:         v.days_listed   || 0,
  description:  v.description   || '',
  features:     v.features      || [],
  image_urls:   v.image_urls    || [],
});

const SEED_PIPELINE = {
  Lead:        [],
  Negotiation: [],
  Payment:     [],
  Delivered:   [],
};

export const useSalesStore = create((set, get) => ({
  vehicles:     [],
  pipeline:     SEED_PIPELINE,
  viewMode:     'grid',
  statusFilter: 'All',
  searchQuery:  '',
  isLoading:    false,
  error:        null,
  dataLoaded:   false,

  // ── Selectors ──────────────────────────────────────────────
  getFilteredVehicles: () => {
    const { vehicles, statusFilter, searchQuery } = get();
    return vehicles.filter((v) => {
      const matchStatus = statusFilter === 'All' || v.status === statusFilter;
      const q = (searchQuery || '').toLowerCase();
      const matchSearch = !q || v.t.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) || v.model.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  },

  getPipelineTotal: () =>
    Object.values(get().pipeline).flat().reduce((s, c) => s + (c.v || 0), 0),

  // ── UI state ───────────────────────────────────────────────
  setViewMode:     (m) => set({ viewMode: m }),
  setStatusFilter: (f) => set({ statusFilter: f }),
  setSearch:       (q) => set({ searchQuery: q }),

  // ── FETCH vehicles ─────────────────────────────────────────
  fetchVehicles: async (params) => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const { data } = await salesApi.getVehicles({ limit: 100, ...params });
      const raw = data.vehicles ?? data ?? [];
      set({ vehicles: raw.map(mapVehicle), dataLoaded: true });
    } catch (err) {
      set({ error: err.response?.data?.message || err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  // ── ADD vehicle → POST /vehicles ──────────────────────────
  addVehicle: async (form) => {
    const temp = {
      ...mapVehicle({
        ...form,
        id: `temp-${Date.now()}`,
        price: toKobo(form.price),
        mileage: Number(form.mileage),
        year: Number(form.year),
      }),
    };
    set((s) => ({ vehicles: [temp, ...s.vehicles] }));

    try {
      const { data } = await salesApi.createVehicle({
        brand:        form.brand,
        model:        form.model,
        year:         Number(form.year),
        price:        toKobo(form.price),   // send in kobo
        mileage:      Number(form.mileage),
        fuel_type:    form.fuel_type    || 'petrol',
        transmission: form.transmission || 'automatic',
        condition:    form.condition    || 'foreign_used',
        status:       form.status       || 'available',
        description:  form.description  || null,
        color:        form.color        || null,
      });
      const saved = mapVehicle(data.vehicle ?? data);
      set((s) => ({
        vehicles: s.vehicles.map((v) => (v.id === temp.id ? saved : v)),
      }));
      return saved;
    } catch (err) {
      set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== temp.id) }));
      throw err;
    }
  },

  // ── UPDATE vehicle → PUT /vehicles/:id ────────────────────
  updateVehicle: async (id, updates) => {
    set((s) => ({
      vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    }));
    try {
      const payload = { ...updates };
      if (payload.price)   payload.price   = toKobo(payload.price);
      if (payload.mileage) payload.mileage = Number(payload.mileage);
      if (payload.year)    payload.year    = Number(payload.year);
      await salesApi.updateVehicle(id, payload);
    } catch {
      get().fetchVehicles();
    }
  },

  // ── DELETE vehicle → DELETE /vehicles/:id ─────────────────
  removeVehicle: async (id) => {
    set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== id) }));
    try {
      await salesApi.deleteVehicle(id);
    } catch {
      get().fetchVehicles();
    }
  },

  // ── Pipeline mutations (optimistic + backend) ──────────────
  moveDeal: async (dealId, fromCol, toCol) => {
    const { pipeline } = get();
    const deal = pipeline[fromCol]?.find((c) => c.id === dealId);
    if (!deal || fromCol === toCol) return;
    set({
      pipeline: {
        ...pipeline,
        [fromCol]: pipeline[fromCol].filter((c) => c.id !== dealId),
        [toCol]:   [...(pipeline[toCol] ?? []), deal],
      },
    });
    try {
      await salesApi.moveDeal(dealId, toCol.toLowerCase());
    } catch {
      get().fetchPipeline();
    }
  },

  addDeal: (col, deal) =>
    set((s) => ({
      pipeline: {
        ...s.pipeline,
        [col]: [...(s.pipeline[col] ?? []), { ...deal, id: `local-${Date.now()}` }],
      },
    })),

  // ── FETCH pipeline ─────────────────────────────────────────
  fetchPipeline: async () => {
    try {
      const { data } = await salesApi.getDeals({ limit: 100 });
      const deals = data.deals ?? data ?? [];
      if (!deals.length) return;
      const STAGE_MAP = { lead:'Lead', negotiation:'Negotiation', payment:'Payment', delivered:'Delivered' };
      const grouped   = { Lead:[], Negotiation:[], Payment:[], Delivered:[] };
      for (const deal of deals) {
        const col = STAGE_MAP[deal.stage] || 'Lead';
        if (grouped[col]) {
          grouped[col].push({
            id:  deal.id,
            t:   deal.title,
            v:   fromKobo(deal.value),
            c:   (deal.assigned?.name || 'XX').split(' ').map((n) => n[0]).join(''),
            tag: deal.stage === 'delivered' ? 'Done' : deal.stage === 'payment' ? 'Pending' : 'Active',
            ag:  deal.assigned?.name?.split(' ')[0] || '—',
            d:   Math.floor((Date.now() - new Date(deal.updated_at)) / 86400000),
          });
        }
      }
      set({ pipeline: grouped });
    } catch { /* keep current pipeline */ }
  },
}));