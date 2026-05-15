import { create } from 'zustand';
import { crmApi } from '@/services/api/index';
import { G } from '@/shared/utils/tokens';

export const useCrmStore = create((set, get) => ({
  leads:        [],
  selectedLead: null,
  isLoading:    false,
  error:        null,
  filter:       'all',
  searchQuery:  '',
  dataLoaded:   false,

  // ── Selectors ──────────────────────────────────────────────
  getFilteredLeads: () => {
    const { leads, filter, searchQuery } = get();
    return leads.filter((l) => {
      const matchesFilter =
        filter === 'all' || l.stage.toLowerCase() === filter.toLowerCase();
      const q = (searchQuery || '').toLowerCase();
      const matchesSearch =
        !q ||
        l.name.toLowerCase().includes(q) ||
        (l.car || '').toLowerCase().includes(q) ||
        (l.phone || '').includes(q);
      return matchesFilter && matchesSearch;
    });
  },

  // ── UI state ───────────────────────────────────────────────
  setFilter:    (f)    => set({ filter: f }),
  setSearch:    (q)    => set({ searchQuery: q }),
  selectLead:   (lead) => set({ selectedLead: lead }),
  deselectLead: ()     => set({ selectedLead: null }),

  // ── Map backend lead → frontend shape ─────────────────────
  _map: (l) => ({
    id:               l.id,
    name:             l.name,
    phone:            l.phone   || '',
    email:            l.email   || '',
    car:              l.vehicle_interest || '',
    vehicle_interest: l.vehicle_interest || '',
    budget:           l.budget  ?? 0,
    src:              l.source  || 'other',
    source:           l.source  || 'other',
    stage:            l.stage
      ? l.stage.charAt(0).toUpperCase() + l.stage.slice(1).toLowerCase()
      : 'New',
    score:            l.ai_score ?? Math.floor(Math.random() * 40) + 50,
    date:             l.created_at
      ? new Date(l.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
      : 'Now',
    agent:            l.assigned_user?.full_name || l.assigned_user?.name || '—',
    notes:            l.notes || '',
    tl: (l.timeline || []).map((e) => ({
      a: e.action === 'note'          ? 'Note added'
       : e.action === 'stage_changed' ? `Stage → ${e.details?.to || ''}`
       : e.action,
      n: e.details?.content || e.details?.notes || '',
      t: new Date(e.created_at).toLocaleDateString('en-NG', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      }),
      i: e.action === 'note' ? 'note' : e.action === 'stage_changed' ? 'bars' : 'info',
      c: e.action === 'note' ? G.g : G.bl,
    })),
  }),

  // ── FETCH all leads ────────────────────────────────────────
  fetchLeads: async (params) => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const { data } = await crmApi.getLeads({ limit: 100, ...params });
      const raw = data.leads ?? data ?? [];
      const mapped = raw.map(get()._map);
      set({ leads: mapped, dataLoaded: true });
    } catch (err) {
      set({ error: err.response?.data?.message || err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  // ── ADD lead → POST /leads ─────────────────────────────────
  addLead: async (form) => {
    // Optimistic insert so UI feels instant
    const temp = {
      ...get()._map({ ...form, id: `temp-${Date.now()}`, created_at: new Date().toISOString() }),
      stage: 'New',
    };
    set((s) => ({ leads: [temp, ...s.leads] }));

    try {
      const { data } = await crmApi.createLead({
        name:             form.name,
        phone:            form.phone,
        email:            form.email || null,
        vehicle_interest: form.vehicle_interest || form.car || null,
        budget:           form.budget ? Number(form.budget) : null,
        source:           form.source || 'other',
        stage:            'new',
        notes:            form.notes || null,
      });
      const saved = get()._map(data.lead ?? data);
      // Replace temp with real record
      set((s) => ({
        leads: s.leads.map((l) => (l.id === temp.id ? saved : l)),
      }));
      return saved;
    } catch (err) {
      // Rollback optimistic insert on error
      set((s) => ({ leads: s.leads.filter((l) => l.id !== temp.id) }));
      throw err;
    }
  },

  // ── UPDATE STAGE → PATCH /leads/:id/stage ─────────────────
  updateStage: async (id, stage) => {
    const backendStage = stage.toLowerCase();
    const displayStage = stage.charAt(0).toUpperCase() + stage.slice(1).toLowerCase();
    const entry = { a: `Stage → ${displayStage}`, n: `Moved to ${displayStage}`, t: 'Just now', i: 'bars', c: G.g };

    // Optimistic update
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === id ? { ...l, stage: displayStage, tl: [...(l.tl ?? []), entry] } : l,
      ),
      selectedLead: s.selectedLead?.id === id
        ? { ...s.selectedLead, stage: displayStage, tl: [...(s.selectedLead.tl ?? []), entry] }
        : s.selectedLead,
    }));

    try {
      await crmApi.updateStage(id, backendStage);
    } catch (err) {
      // Silently refetch to restore correct state
      get().fetchLeads();
    }
  },

  // ── ADD NOTE → POST /leads/:id/notes ──────────────────────
  addNote: async (id, note) => {
    const entry = { a: 'Note added', n: note, t: 'Just now', i: 'note', c: G.g };

    // Optimistic update
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === id ? { ...l, tl: [...(l.tl ?? []), entry] } : l,
      ),
      selectedLead: s.selectedLead?.id === id
        ? { ...s.selectedLead, tl: [...(s.selectedLead.tl ?? []), entry] }
        : s.selectedLead,
    }));

    try {
      await crmApi.addNote(id, note);
    } catch (err) {
      // Note failed silently — UI already shows it
    }
  },

  // ── DELETE lead → DELETE /leads/:id ───────────────────────
  removeLead: async (id) => {
    // Optimistic remove
    set((s) => ({
      leads:        s.leads.filter((l) => l.id !== id),
      selectedLead: s.selectedLead?.id === id ? null : s.selectedLead,
    }));
    try {
      await crmApi.deleteLead(id);
    } catch (err) {
      get().fetchLeads(); // Restore if delete failed
    }
  },

  // ── UPDATE lead fields → PUT /leads/:id ───────────────────
  updateLead: async (id, updates) => {
    set((s) => ({
      leads: s.leads.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      selectedLead: s.selectedLead?.id === id
        ? { ...s.selectedLead, ...updates }
        : s.selectedLead,
    }));
    try {
      await crmApi.updateLead(id, updates);
    } catch (err) {
      get().fetchLeads();
    }
  },
}));