import { create } from 'zustand';
import { crmApi } from '@/services/api/index';
import { G } from '@/shared/utils/tokens';

// ── Seed data (shown instantly before first backend fetch) ────
const SEED_LEADS = [
  { id:'seed-1', name:'Emeka Okafor',   phone:'08012345678', email:'emeka@gmail.com',  car:'Toyota Camry XSE',  stage:'New',       score:85, src:'Website',  date:'Jan 15', agent:'John D.',  budget:20000000, tl:[{a:'Lead created',n:'Via website',t:'Jan 15 · 9:42 AM',i:'phone',c:G.bl}] },
  { id:'seed-2', name:'Amaka Nwosu',    phone:'07098765432', email:'amaka@email.com',  car:'Mercedes GLE 450',  stage:'Contacted', score:92, src:'WhatsApp', date:'Jan 14', agent:'Sarah K.', budget:80000000, tl:[{a:'Lead created',n:'WhatsApp inquiry',t:'Jan 14',i:'wa',c:'#25D366'}] },
  { id:'seed-3', name:'Biodun Adeyemi', phone:'09011223344', email:'biodun@email.com', car:'Lexus RX 350',      stage:'Closed',    score:100,src:'Referral', date:'Jan 10', agent:'John D.',  budget:45000000, tl:[{a:'Lead created',n:'Referral',t:'Jan 10',i:'users',c:G.g},{a:'Deal closed ✓',n:'₦42M received',t:'Jan 13',i:'check',c:G.ok}] },
  { id:'seed-4', name:'Fatima Aliyu',   phone:'08133445566', email:'fatima@email.com', car:'Honda CR-V',        stage:'New',       score:65, src:'Instagram',date:'Jan 15', agent:'Sarah K.', budget:28000000, tl:[{a:'Lead created',n:'Instagram DM',t:'Jan 15',i:'phone',c:G.bl}] },
  { id:'seed-5', name:'Chukwudi Eze',   phone:'07066778899', email:'chukwudi@email.com',car:'Toyota Highlander',stage:'Contacted', score:78, src:'Facebook', date:'Jan 12', agent:'Mike A.',  budget:35000000, tl:[{a:'Lead created',n:'Facebook form',t:'Jan 12',i:'phone',c:G.bl}] },
];

export const useCrmStore = create((set, get) => ({
  leads:         SEED_LEADS,
  selectedLead:  null,
  isLoading:     false,
  error:         null,
  filter:        'all',
  searchQuery:   '',
  // Track whether we've loaded real data (prevent redundant fetches)
  dataLoaded:    false,

  // ── Selectors ─────────────────────────────────────────────
  getFilteredLeads: () => {
    const { leads, filter, searchQuery } = get();
    return leads.filter((l) => {
      const matchesFilter = filter === 'all' || l.stage.toLowerCase() === filter.toLowerCase();
      const matchesSearch = !searchQuery ||
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.car || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.phone || '').includes(searchQuery);
      return matchesFilter && matchesSearch;
    });
  },

  // ── UI state ───────────────────────────────────────────────
  setFilter:    (f)    => set({ filter: f }),
  setSearch:    (q)    => set({ searchQuery: q }),
  selectLead:   (lead) => set({ selectedLead: lead }),
  deselectLead: ()     => set({ selectedLead: null }),

  // ── Local mutations (optimistic) ───────────────────────────
  addLead: (lead) => {
    // Normalise field names for local display
    const newLead = {
      id:               `local-${Date.now()}`,
      name:             lead.name,
      phone:            lead.phone,
      email:            lead.email || '',
      // Support both old (car/src) and new (vehicle_interest/source) field names
      car:              lead.vehicle_interest || lead.car || '',
      vehicle_interest: lead.vehicle_interest || lead.car || '',
      budget:           lead.budget || 0,
      src:              lead.source || lead.src || 'other',
      source:           lead.source || lead.src || 'other',
      stage:            (lead.stage || 'new').charAt(0).toUpperCase() + (lead.stage || 'new').slice(1),
      score:            Math.floor(Math.random() * 40) + 50,
      date:             'Just now',
      agent:            'You',
      tl:               [{ a:'Lead created', n:'Added manually', t:'Just now', i:'phone', c:G.bl }],
    };
    set((s) => ({ leads: [newLead, ...s.leads] }));
    return newLead;
  },

  updateLead: (id, updates) =>
    set((s) => ({
      leads: s.leads.map((l) => l.id === id ? { ...l, ...updates } : l),
      selectedLead: s.selectedLead?.id === id ? { ...s.selectedLead, ...updates } : s.selectedLead,
    })),

  removeLead: (id) =>
    set((s) => ({
      leads:        s.leads.filter((l) => l.id !== id),
      selectedLead: s.selectedLead?.id === id ? null : s.selectedLead,
    })),

  updateStage: (id, stage) => {
    // stage can be 'new' (backend) or 'New' (display) — normalise to display
    const displayStage = stage.charAt(0).toUpperCase() + stage.slice(1).toLowerCase();
    const entry = { a:`Stage → ${displayStage}`, n:`Moved to ${displayStage}`, t:'Just now', i:'bars', c:G.g };
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === id ? { ...l, stage: displayStage, tl: [...(l.tl ?? []), entry] } : l,
      ),
      selectedLead: s.selectedLead?.id === id
        ? { ...s.selectedLead, stage: displayStage, tl: [...(s.selectedLead.tl ?? []), entry] }
        : s.selectedLead,
    }));
  },

  addNote: (id, note) => {
    const entry = { a:'Note added', n:note, t:'Just now', i:'note', c:G.g };
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === id ? { ...l, tl: [...(l.tl ?? []), entry] } : l,
      ),
      selectedLead: s.selectedLead?.id === id
        ? { ...s.selectedLead, tl: [...(s.selectedLead.tl ?? []), entry] }
        : s.selectedLead,
    }));
  },

  // ── Backend fetch ──────────────────────────────────────────
  fetchLeads: async (params) => {
    // Don't double-fetch
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const { data } = await crmApi.getLeads({ limit: 50, ...params });
      const leads = data.leads ?? data;
      if (leads.length > 0) {
        // Map backend field names → frontend convention
        const mapped = leads.map((l) => ({
          id:     l.id,
          name:   l.name,
          phone:  l.phone,
          email:  l.email || '',
          car:    l.vehicle_interest || '',
          stage:  l.stage ? l.stage.charAt(0).toUpperCase() + l.stage.slice(1) : 'New',
          score:  l.ai_score ?? Math.floor(Math.random() * 40) + 50,
          src:    l.source || 'other',
          date:   new Date(l.created_at).toLocaleDateString('en-NG', { day:'numeric', month:'short' }),
          agent:  l.assigned_user?.name || '—',
          budget: l.budget ?? 0,
          tl:     (l.timeline || []).map((e) => ({
            a: e.action,
            n: e.details?.content || e.details?.notes || '',
            t: new Date(e.created_at).toLocaleDateString('en-NG', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }),
            i: 'info',
            c: G.g,
          })),
        }));
        set({ leads: mapped, dataLoaded: true });
      }
    } catch (err) {
      // Don't replace seed data on network error — degrade gracefully
      if (!get().dataLoaded) {
        // First load with no network — keep seeds, just note the error
        set({ error: `Using cached data (${err.message})` });
      } else {
        set({ error: err.message });
      }
    } finally {
      set({ isLoading: false });
    }
  },
}));
