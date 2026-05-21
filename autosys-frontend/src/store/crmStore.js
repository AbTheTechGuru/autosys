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
  leads:        SEED_LEADS,
  selectedLead: null,
  isLoading:    false,
  error:        null,
  filter:       'all',
  searchQuery:  '',
  dataLoaded:   false,

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

  // ── Add lead (optimistic + backend persist) ────────────────
  addLead: async (leadData) => {
    const optimisticLead = {
      id:               `local-${Date.now()}`,
      name:             leadData.name,
      phone:            leadData.phone,
      email:            leadData.email || '',
      car:              leadData.vehicle_interest || leadData.car || '',
      vehicle_interest: leadData.vehicle_interest || leadData.car || '',
      budget:           Number(leadData.budget) || 0,
      src:              leadData.source || leadData.src || 'other',
      source:           leadData.source || leadData.src || 'other',
      stage:            (leadData.stage || 'new').charAt(0).toUpperCase() + (leadData.stage || 'new').slice(1),
      score:            Math.floor(Math.random() * 40) + 50,
      date:             'Just now',
      agent:            'You',
      tl:               [{ a:'Lead created', n:'Added manually', t:'Just now', i:'phone', c:G.bl }],
    };

    // Optimistic insert
    set((s) => ({ leads: [optimisticLead, ...s.leads] }));

    try {
      const { data } = await crmApi.createLead({
        name:             leadData.name,
        phone:            leadData.phone,
        email:            leadData.email || undefined,
        vehicle_interest: leadData.vehicle_interest || leadData.car || undefined,
        budget:           Number(leadData.budget) || undefined,
        source:           leadData.source || leadData.src || 'other',
        stage:            (leadData.stage || 'new').toLowerCase(),
      });
      const serverLead = data.lead ?? data;
      // Replace optimistic with real server record
      set((s) => ({
        leads: s.leads.map((l) =>
          l.id === optimisticLead.id
            ? { ...optimisticLead, id: serverLead.id, score: serverLead.ai_score ?? optimisticLead.score }
            : l
        ),
      }));
      return serverLead;
    } catch (err) {
      // Keep optimistic on error so user doesn't lose their input
      console.warn('[CRM] addLead backend error — keeping local record:', err.message);
      return optimisticLead;
    }
  },

  // ── Update lead ────────────────────────────────────────────
  updateLead: async (id, updates) => {
    // Optimistic
    set((s) => ({
      leads:        s.leads.map((l) => l.id === id ? { ...l, ...updates } : l),
      selectedLead: s.selectedLead?.id === id ? { ...s.selectedLead, ...updates } : s.selectedLead,
    }));
    try {
      await crmApi.updateLead(id, updates);
    } catch {
      // Silent — UI already shows update
    }
  },

  removeLead: (id) =>
    set((s) => ({
      leads:        s.leads.filter((l) => l.id !== id),
      selectedLead: s.selectedLead?.id === id ? null : s.selectedLead,
    })),

  // ── Update stage (persist to backend) ─────────────────────
  updateStage: async (id, stage) => {
    const displayStage = stage.charAt(0).toUpperCase() + stage.slice(1).toLowerCase();
    const entry = { a:`Stage → ${displayStage}`, n:`Moved to ${displayStage}`, t:'Just now', i:'bars', c:G.g };

    // Optimistic
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === id ? { ...l, stage: displayStage, tl: [...(l.tl ?? []), entry] } : l
      ),
      selectedLead: s.selectedLead?.id === id
        ? { ...s.selectedLead, stage: displayStage, tl: [...(s.selectedLead.tl ?? []), entry] }
        : s.selectedLead,
    }));

    // Skip seed leads (they have no real DB id)
    if (id.startsWith('seed-') || id.startsWith('local-')) return;

    try {
      await crmApi.updateStage(id, stage.toLowerCase());
    } catch (err) {
      console.warn('[CRM] updateStage backend error:', err.message);
    }
  },

  // ── Add note (persist to backend) ─────────────────────────
  addNote: async (id, note) => {
    const entry = { a:'Note added', n:note, t:'Just now', i:'note', c:G.g };

    // Optimistic
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === id ? { ...l, tl: [...(l.tl ?? []), entry] } : l
      ),
      selectedLead: s.selectedLead?.id === id
        ? { ...s.selectedLead, tl: [...(s.selectedLead.tl ?? []), entry] }
        : s.selectedLead,
    }));

    if (id.startsWith('seed-') || id.startsWith('local-')) return;

    try {
      await crmApi.addNote(id, note);
    } catch (err) {
      console.warn('[CRM] addNote backend error:', err.message);
    }
  },

  // ── Backend fetch ──────────────────────────────────────────
  fetchLeads: async (params) => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const { data } = await crmApi.getLeads({ limit: 50, ...params });
      const leads = data.leads ?? data;
      if (leads.length > 0) {
        const mapped = leads.map((l) => ({
          id:     l.id,
          name:   l.name,
          phone:  l.phone,
          email:  l.email || '',
          car:    l.vehicle_interest || '',
          vehicle_interest: l.vehicle_interest || '',
          stage:  l.stage ? l.stage.charAt(0).toUpperCase() + l.stage.slice(1) : 'New',
          score:  l.ai_score ?? Math.floor(Math.random() * 40) + 50,
          src:    l.source || 'other',
          source: l.source || 'other',
          date:   new Date(l.created_at).toLocaleDateString('en-NG', { day:'numeric', month:'short' }),
          agent:  l.assigned_user?.full_name || l.assigned_user?.name || '—',
          budget: l.budget ?? 0,
          tl:     (l.timeline || []).map((e) => ({
            a: e.action === 'note' ? 'Note added' : e.action === 'stage_changed' ? `Stage → ${e.details?.to}` : e.action,
            n: e.details?.content || e.details?.notes || e.details?.to || '',
            t: new Date(e.created_at).toLocaleDateString('en-NG', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }),
            i: e.action === 'note' ? 'note' : 'info',
            c: G.g,
          })),
        }));
        set({ leads: mapped, dataLoaded: true });
      }
    } catch (err) {
      if (!get().dataLoaded) {
        set({ error: `Using cached data (${err.message})` });
      } else {
        set({ error: err.message });
      }
    } finally {
      set({ isLoading: false });
    }
  },
}));
