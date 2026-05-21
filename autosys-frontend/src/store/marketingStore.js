import { create } from 'zustand';
import { marketingApi } from '@/services/api/index';

export const useMarketingStore = create((set, get) => ({
  campaigns:   [],
  automations: [],
  templates:   [],
  isLoading:   false,
  error:       null,
  dataLoaded:  false,

  // ── Campaign mutations ─────────────────────────────────────
  addCampaign: async (formData) => {
    const { data } = await marketingApi.createCampaign({
      name:     formData.name,
      type:     formData.type,
      audience: formData.audience,
      message:  formData.msg,
      schedule: formData.schedule,
      status:   'draft',
    });
    const campaign = data.campaign ?? data;
    set((s) => ({ campaigns: [campaign, ...s.campaigns] }));

    // Auto-launch if scheduled for Now
    if (!formData.schedule || formData.schedule === 'Now') {
      try {
        const { data: launched } = await marketingApi.launchCampaign(campaign.id);
        set((s) => ({
          campaigns: s.campaigns.map((c) => c.id === campaign.id ? (launched.campaign ?? launched) : c),
        }));
      } catch {
        // Launch failed — keep as draft
      }
    }
    return campaign;
  },

  updateCampaign: async (id, updates) => {
    const { data } = await marketingApi.updateCampaign(id, updates);
    set((s) => ({
      campaigns: s.campaigns.map((c) => c.id === id ? (data.campaign ?? data) : c),
    }));
  },

  removeCampaign: async (id) => {
    await marketingApi.deleteCampaign(id);
    set((s) => ({ campaigns: s.campaigns.filter((c) => c.id !== id) }));
  },

  launchCampaign: async (id) => {
    const { data } = await marketingApi.launchCampaign(id);
    set((s) => ({
      campaigns: s.campaigns.map((c) => c.id === id ? (data.campaign ?? data) : c),
    }));
  },

  // ── Automation mutations ───────────────────────────────────
  toggleAutomation: async (id) => {
    const current = get().automations.find((a) => a.id === id);
    if (!current) return;
    // Optimistic
    set((s) => ({
      automations: s.automations.map((a) => a.id === id ? { ...a, enabled: !a.enabled } : a),
    }));
    try {
      await marketingApi.toggleAutomation(id, !current.enabled);
    } catch {
      // Revert
      set((s) => ({
        automations: s.automations.map((a) => a.id === id ? { ...a, enabled: current.enabled } : a),
      }));
    }
  },

  addAutomation: async (automationData) => {
    const { data } = await marketingApi.createAutomation(automationData);
    set((s) => ({
      automations: [...s.automations, data.automation ?? data],
    }));
  },

  // ── Stats helpers ──────────────────────────────────────────
  getTotalStats: () => {
    const { campaigns } = get();
    return {
      sent:   campaigns.reduce((s, c) => s + (c.sent_count ?? c.sent ?? 0), 0),
      opens:  campaigns.reduce((s, c) => s + (c.open_count  ?? c.opens ?? 0), 0),
      clicks: campaigns.reduce((s, c) => s + (c.click_count ?? c.clicks ?? 0), 0),
      unsubs: 0,
    };
  },

  // ── Fetch campaigns ────────────────────────────────────────
  fetchCampaigns: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const { data } = await marketingApi.getCampaigns();
      const campaigns = data.campaigns ?? data ?? [];
      const mapped = campaigns.map((c) => ({
        ...c,
        // Normalise field names (backend may use snake_case counts)
        sent:   c.sent_count  ?? c.sent   ?? 0,
        opens:  c.open_count  ?? c.opens  ?? 0,
        clicks: c.click_count ?? c.clicks ?? 0,
        date:   c.created_at
          ? new Date(c.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
          : '—',
        status: c.status
          ? c.status.charAt(0).toUpperCase() + c.status.slice(1)
          : 'Draft',
      }));
      set({ campaigns: mapped, dataLoaded: true });
    } catch (err) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Fetch automations ──────────────────────────────────────
  fetchAutomations: async () => {
    try {
      const { data } = await marketingApi.getAutomations();
      set({ automations: data.automations ?? data ?? [] });
    } catch {
      // Silently fail — automations page handles this separately
    }
  },

  // ── Fetch templates ────────────────────────────────────────
  fetchTemplates: async () => {
    try {
      const { data } = await marketingApi.getTemplates();
      set({ templates: data.templates ?? data ?? [] });
    } catch {
      // Keep empty — templates tab shows built-in list
    }
  },
}));
