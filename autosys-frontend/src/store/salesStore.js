import { create } from 'zustand';
import { salesApi } from '@/services/api/index';

const SEED_VEHICLES = [
  { id:'sv-1', t:'2022 Toyota Camry XSE V6',   brand:'Toyota',   model:'Camry',      year:2022, price:18500000, mileage:42000, fuel:'Petrol', trans:'Automatic', cond:'Foreign Used', status:'Available', color:'#1E3A5F', e:'🚗', views:284, inq:12, days:8  },
  { id:'sv-2', t:'2023 Mercedes-Benz GLE 450', brand:'Mercedes', model:'GLE 450',    year:2023, price:75000000, mileage:8000,  fuel:'Petrol', trans:'Automatic', cond:'Foreign Used', status:'Reserved',  color:'#2D2D2D', e:'🚙', views:621, inq:28, days:3  },
  { id:'sv-3', t:'2021 Toyota Highlander XLE', brand:'Toyota',   model:'Highlander', year:2021, price:32000000, mileage:65000, fuel:'Petrol', trans:'Automatic', cond:'Used',         status:'Available', color:'#8B4513', e:'🚐', views:156, inq:7,  days:15 },
  { id:'sv-4', t:'2022 Lexus RX 350 F-Sport',  brand:'Lexus',    model:'RX 350',     year:2022, price:42000000, mileage:28000, fuel:'Petrol', trans:'Automatic', cond:'Foreign Used', status:'Sold',      color:'#708090', e:'🚘', views:832, inq:41, days:22 },
  { id:'sv-5', t:'2023 Honda CR-V Hybrid',     brand:'Honda',    model:'CR-V',       year:2023, price:25000000, mileage:12000, fuel:'Hybrid', trans:'Automatic', cond:'Foreign Used', status:'Available', color:'#DC143C', e:'🚗', views:198, inq:9,  days:6  },
  { id:'sv-6', t:'2024 BMW X5 xDrive40i',      brand:'BMW',      model:'X5',         year:2024, price:89000000, mileage:2000,  fuel:'Petrol', trans:'Automatic', cond:'Foreign Used', status:'Available', color:'#4a4a4a', e:'🚙', views:445, inq:19, days:1  },
];

const SEED_PIPELINE = {
  Lead:        [{ id:'dp-1', t:'Emeka – Camry XSE',v:18500000,c:'EO',tag:'Hot',    ag:'JD',d:2 },{ id:'dp-7',t:'Adeola – BMW X5',v:89000000,c:'AB',tag:'New',ag:'JD',d:0 }],
  Negotiation: [{ id:'dp-3', t:'Amaka – GLE 450', v:75000000,c:'AN',tag:'Hot',    ag:'SK',d:4 }],
  Payment:     [{ id:'dp-4', t:'Biodun – RX 350',  v:42000000,c:'BA',tag:'Pending',ag:'JD',d:1 }],
  Delivered:   [{ id:'dp-5', t:'Ngozi – Ranger',   v:22000000,c:'NE',tag:'Done',   ag:'SK',d:5 },{ id:'dp-6',t:'Kunle – Tucson',v:16000000,c:'KA',tag:'Done',ag:'JD',d:7 }],
};

// Kobo → naira conversion
const fromKobo = (amount) => Math.round(amount / 100);

export const useSalesStore = create((set, get) => ({
  vehicles:     SEED_VEHICLES,
  pipeline:     SEED_PIPELINE,
  viewMode:     'grid',
  statusFilter: 'All',
  searchQuery:  '',
  isLoading:    false,
  error:        null,
  dataLoaded:   false,

  // ── Selectors ─────────────────────────────────────────────
  getFilteredVehicles: () => {
    const { vehicles, statusFilter, searchQuery } = get();
    return vehicles.filter((v) => {
      const matchStatus = statusFilter === 'All' || v.status === statusFilter;
      const matchSearch = !searchQuery || v.t.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  },

  getPipelineTotal: () =>
    Object.values(get().pipeline).flat().reduce((s, c) => s + c.v, 0),

  // ── UI state ───────────────────────────────────────────────
  setViewMode:     (m) => set({ viewMode: m }),
  setStatusFilter: (f) => set({ statusFilter: f }),
  setSearch:       (q) => set({ searchQuery: q }),

  // ── Vehicle mutations ──────────────────────────────────────
  addVehicle: async (vehicle) => {
    // Optimistically add a temp entry while the API call is in-flight
    const tempId = `temp-${Date.now()}`;
    const temp = {
      ...vehicle,
      id: tempId,
      e: '🚗', color: vehicle.color || '#444', views: 0, inq: 0, days: 0,
      price:   Number(vehicle.price),
      mileage: Number(vehicle.mileage),
    };
    set((s) => ({ vehicles: [temp, ...s.vehicles] }));
    try {
      const { data } = await salesApi.createVehicle({
        brand:        vehicle.brand,
        model:        vehicle.model,
        year:         Number(vehicle.year),
        price:        Number(vehicle.price) * 100, // convert naira → kobo for backend
        mileage:      Number(vehicle.mileage),
        fuel_type:    (vehicle.fuel || 'petrol').toLowerCase(),
        transmission: (vehicle.trans || 'automatic').toLowerCase(),
        condition:    (vehicle.cond || 'foreign_used').toLowerCase().replace(/ /g, '_'),
        status:       (vehicle.status || 'available').toLowerCase(),
        color:        vehicle.color || '#444',
      });
      const saved = data.vehicle ?? data;
      // Replace temp entry with the real persisted record
      const FUEL_MAP = { petrol:'Petrol', diesel:'Diesel', hybrid:'Hybrid', electric:'Electric', cng:'CNG' };
      const COND_MAP = { foreign_used:'Foreign Used', locally_used:'Nigerian Used', brand_new:'Brand New', nigerian_used:'Nigerian Used', new:'Brand New', salvage:'Salvage' };
      const STAT_MAP = { available:'Available', reserved:'Reserved', sold:'Sold' };
      const EMOJI_MAP = { Toyota:'🚗', Mercedes:'🚙', BMW:'🚙', Lexus:'🚘', Honda:'🚗', Ford:'🛻' };
      const mapped = {
        id:      saved.id,
        t:       `${saved.year} ${saved.brand} ${saved.model}`,
        brand:   saved.brand,
        model:   saved.model,
        year:    saved.year,
        price:   fromKobo(saved.price),
        mileage: saved.mileage,
        fuel:         FUEL_MAP[saved.fuel_type]   || saved.fuel_type,
        trans:        saved.transmission === 'automatic' ? 'Automatic' : 'Manual',
        cond:         COND_MAP[saved.condition]   || saved.condition,
        status:  STAT_MAP[saved.status]      || saved.status,
        color:   saved.color || '#444',
        e:       EMOJI_MAP[saved.brand] || '🚗',
        views:   0, inq: 0, days: 0,
      };
      set((s) => ({ vehicles: s.vehicles.map((v) => v.id === tempId ? mapped : v) }));
      return mapped;
    } catch (err) {
      // Roll back optimistic entry on failure
      set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== tempId) }));
      throw err;
    }
  },

  updateVehicle: async (id, updates) => {
    // Optimistic local update
    set((s) => ({ vehicles: s.vehicles.map((v) => v.id === id ? { ...v, ...updates } : v) }));
    try {
      await salesApi.updateVehicle(id, updates);
    } catch (err) {
      // On failure refresh from backend
      get().fetchVehicles();
      throw err;
    }
  },

  removeVehicle: async (id) => {
    set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== id) }));
    try {
      await salesApi.deleteVehicle(id);
    } catch (err) {
      get().fetchVehicles();
      throw err;
    }
  },

  // ── Pipeline mutations ─────────────────────────────────────
  moveDeal: (dealId, fromCol, toCol) => {
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
  },

  addDeal: (col, deal) =>
    set((s) => ({
      pipeline: {
        ...s.pipeline,
        [col]: [...(s.pipeline[col] ?? []), { ...deal, id: `local-${Date.now()}` }],
      },
    })),

  // ── Backend fetch ──────────────────────────────────────────
  fetchVehicles: async (params) => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const { data } = await salesApi.getVehicles({ limit: 50, ...params });
      const vehicles = data.vehicles ?? data;
      if (vehicles.length > 0) {
        const FUEL_MAP  = { petrol:'Petrol', diesel:'Diesel', hybrid:'Hybrid', electric:'Electric', cng:'CNG' };
        const COND_MAP  = { foreign_used:'Foreign Used', locally_used:'Nigerian Used', brand_new:'Brand New', nigerian_used:'Nigerian Used', new:'Brand New', salvage:'Salvage', 'foreign-used':'Foreign Used', 'locally-used':'Nigerian Used', 'brand-new':'Brand New' };
        const STAT_MAP  = { available:'Available', reserved:'Reserved', sold:'Sold' };
        const EMOJI_MAP = { Toyota:'🚗', Mercedes:'🚙', BMW:'🚙', Lexus:'🚘', Honda:'🚗', Ford:'🛻' };

        const mapped = vehicles.map((v) => ({
          id:      v.id,
          t:       `${v.year} ${v.brand} ${v.model}`,
          brand:   v.brand,
          model:   v.model,
          year:    v.year,
          price:   fromKobo(v.price),
          mileage: v.mileage,
          fuel:         FUEL_MAP[v.fuel_type]    || v.fuel_type,
          fuel_type:    v.fuel_type,
          trans:        v.transmission === 'automatic' ? 'Automatic' : 'Manual',
          transmission: v.transmission,
          cond:         COND_MAP[v.condition]    || v.condition,
          condition:    v.condition,
          status:  STAT_MAP[v.status]       || v.status,
          color:   v.color || '#444',
          e:       EMOJI_MAP[v.brand] || '🚗',
          views:   v.views_count    || 0,
          inq:     v.inquiry_count  || 0,
          days:    v.days_listed    || 0,
        }));
        set({ vehicles: mapped, dataLoaded: true });
      }
    } catch (err) {
      if (!get().dataLoaded) set({ error: `Using cached data (${err.message})` });
      else set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPipeline: async () => {
    try {
      const { data } = await salesApi.getDeals({ limit: 100 });
      const deals = data.deals ?? data;
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
    } catch { /* keep seed pipeline */ }
  },
}));
