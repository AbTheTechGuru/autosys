import { create } from 'zustand';
import { marketingApi } from '@/services/api/index';

// ── mappers ────────────────────────────────────────────────────
const TYPE_MAP = { whatsapp:'WhatsApp', email:'Email', instagram:'Instagram', sms:'SMS' };

const mapCampaign = (c) => ({
  id:       c.id,
  name:     c.name,
  type:     TYPE_MAP[c.type] || c.type,
  rawType:  c.type,
  status:   c.status
    ? c.status.charAt(0).toUpperCase() + c.status.slice(1).toLowerCase()
    : 'Draft',
  sent:     c.sent_count   || 0,
  opens:    c.open_count   || 0,
  clicks:   c.click_count  || 0,
  audience: c.audience     || 'all',
  msg:      c.message      || c.msg || '',
  date:     c.created_at
    ? new Date(c.created_at).toLocaleDateString('en-NG', { day:'numeric', month:'short' })
    : 'Now',
  launched_at: c.launched_at,
});

const mapAutomation = (a) => ({
  id:      a.id,
  trigger: a.trigger_event  || a.trigger || '',
  action:  a.action_type    || a.action  || '',
  enabled: a.is_active      ?? a.enabled ?? false,
});

export const useMarketingStore = create((set, get) => ({
  campaigns:   [],
  templates:   [],
  automations: [],
  isLoading:   false,
  templatesLoading: false,
  error:       null,
  dataLoaded:  false,

  // ── Stats ──────────────────────────────────────────────────
  getTotalStats: () => {
    const { campaigns } = get();
    return {
      sent:   campaigns.reduce((s, c) => s + (c.sent   || 0), 0),
      opens:  campaigns.reduce((s, c) => s + (c.opens  || 0), 0),
      clicks: campaigns.reduce((s, c) => s + (c.clicks || 0), 0),
      unsubs: 0,
    };
  },

  // ── FETCH campaigns ────────────────────────────────────────
  fetchCampaigns: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const { data } = await marketingApi.getCampaigns();
      const raw = data.campaigns ?? data ?? [];
      set({ campaigns: raw.map(mapCampaign), dataLoaded: true });
    } catch (err) {
      set({ error: err.response?.data?.message || err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  // ── FETCH templates ────────────────────────────────────────
  fetchTemplates: async () => {
    set({ templatesLoading: true });
    try {
      const { data } = await marketingApi.getTemplates();
      set({ templates: data.templates ?? [] });
    } catch {
      // keep empty — not critical
    } finally {
      set({ templatesLoading: false });
    }
  },

  // ── FETCH automations ──────────────────────────────────────
  fetchAutomations: async () => {
    try {
      const { data } = await marketingApi.getAutomations();
      const raw = data.automations ?? [];
      set({ automations: raw.map(mapAutomation) });
    } catch {
      // keep empty
    }
  },

  // ── ADD campaign → POST /campaigns ────────────────────────
  addCampaign: async (form) => {
    const temp = {
      id: `temp-${Date.now()}`,
      name: form.name, type: TYPE_MAP[form.type] || form.type,
      rawType: form.type, status: 'Draft',
      sent: 0, opens: 0, clicks: 0,
      audience: form.audience, msg: form.msg, date: 'Just now',
    };
    set((s) => ({ campaigns: [temp, ...s.campaigns] }));

    try {
      const { data } = await marketingApi.createCampaign({
        name:     form.name,
        type:     form.type,
        audience: form.audience,
        message:  form.msg,
        status:   'draft',
      });
      const saved = mapCampaign(data.campaign ?? data);
      set((s) => ({
        campaigns: s.campaigns.map((c) => (c.id === temp.id ? saved : c)),
      }));
      return saved;
    } catch (err) {
      set((s) => ({ campaigns: s.campaigns.filter((c) => c.id !== temp.id) }));
      throw err;
    }
  },

  // ── LAUNCH campaign → POST /campaigns/:id/launch ──────────
  launchCampaign: async (id) => {
    set((s) => ({
      campaigns: s.campaigns.map((c) => c.id === id ? { ...c, status: 'Active' } : c),
    }));
    try {
      const { data } = await marketingApi.launchCampaign(id);
      const updated = mapCampaign(data.campaign ?? data);
      set((s) => ({
        campaigns: s.campaigns.map((c) => (c.id === id ? updated : c)),
      }));
    } catch (err) {
      // Revert
      set((s) => ({
        campaigns: s.campaigns.map((c) => c.id === id ? { ...c, status: 'Draft' } : c),
      }));
      throw err;
    }
  },

  // ── DELETE campaign ────────────────────────────────────────
  removeCampaign: async (id) => {
    set((s) => ({ campaigns: s.campaigns.filter((c) => c.id !== id) }));
    try {
      await marketingApi.deleteCampaign(id);
    } catch {
      get().fetchCampaigns();
    }
  },

  // ── TOGGLE automation ──────────────────────────────────────
  toggleAutomation: async (id) => {
    const auto = get().automations.find((a) => a.id === id);
    if (!auto) return;
    const newVal = !auto.enabled;
    set((s) => ({
      automations: s.automations.map((a) => a.id === id ? { ...a, enabled: newVal } : a),
    }));
    try {
      await marketingApi.toggleAutomation(id, newVal);
    } catch {
      // Revert
      set((s) => ({
        automations: s.automations.map((a) => a.id === id ? { ...a, enabled: !newVal } : a),
      }));
    }
  },
}));