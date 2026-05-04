import { create } from 'zustand';
import { marketingApi } from '@/services/api/index';


const SEED_CAMPAIGNS = [
  { id:1, name:'January Flash Sale',  type:'WhatsApp',  status:'Active',    sent:284, opens:241, clicks:89,  date:'Jan 10' },
  { id:2, name:'New Inventory Drop',  type:'Email',     status:'Completed', sent:450, opens:312, clicks:124, date:'Jan 2'  },
  { id:3, name:'BMW X5 Feature',      type:'Instagram', status:'Scheduled', sent:0,   opens:0,   clicks:0,   date:'Jan 18' },
];

const SEED_AUTOMATIONS = [
  { id:1, trigger:'New lead created',            action:'Send WhatsApp greeting immediately',   enabled:true  },
  { id:2, trigger:'Lead not contacted for 2 days',action:'Send follow-up reminder',             enabled:true  },
  { id:3, trigger:'Deal closed',                 action:'Send congratulations + review request', enabled:true  },
  { id:4, trigger:'Vehicle listed 30+ days',     action:'Alert admin via WhatsApp',             enabled:false },
  { id:5, trigger:'Payment received',            action:'Send receipt + thank you email',       enabled:true  },
];

export const useMarketingStore = create((set, get) => ({
  campaigns:   SEED_CAMPAIGNS,
  automations: SEED_AUTOMATIONS,
  isLoading:   false,
  error:       null,

  // Campaign mutations
  addCampaign: (c) =>
    set((s) => ({ campaigns: [{ ...c, id: Date.now(), sent:0, opens:0, clicks:0 }, ...s.campaigns] })),

  updateCampaign: (id, updates) =>
    set((s) => ({ campaigns: s.campaigns.map((c) => c.id === id ? { ...c, ...updates } : c) })),

  removeCampaign: (id) =>
    set((s) => ({ campaigns: s.campaigns.filter((c) => c.id !== id) })),

  launchCampaign: (id) => {
    set((s) => ({ campaigns: s.campaigns.map((c) => c.id === id ? { ...c, status:'Active' } : c) }));
  },

  // Automation mutations
  toggleAutomation: (id) =>
    set((s) => ({
      automations: s.automations.map((a) => a.id === id ? { ...a, enabled: !a.enabled } : a),
    })),

  addAutomation: (a) =>
    set((s) => ({ automations: [...s.automations, { ...a, id: Date.now(), enabled: true }] })),

  // Stats helpers
  getTotalStats: () => {
    const { campaigns } = get();
    return {
      sent:      campaigns.reduce((s, c) => s + c.sent,   0),
      opens:     campaigns.reduce((s, c) => s + c.opens,  0),
      clicks:    campaigns.reduce((s, c) => s + c.clicks, 0),
      unsubs:    3,
    };
  },

  // Async
  fetchCampaigns: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await marketingApi.getCampaigns();
      set({ campaigns: data.campaigns ?? data, isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },
}));
