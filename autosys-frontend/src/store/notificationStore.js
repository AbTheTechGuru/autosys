import { create } from 'zustand';

// TODO: Connect to backend endpoint when available
// Expected endpoint: GET /notifications
// Expected response: { notifications: [{ id, type, title, description, read, created_at }] }

// TODO: Mark read endpoint
// Expected endpoint: POST /notifications/mark-read
// Expected body: { id: string } | { ids: string[] }
// Expected response: { success: true, updatedCount: number }

// TODO: Mark all read endpoint
// Expected endpoint: POST /notifications/mark-all-read
// Expected response: { success: true, updatedCount: number }

// TODO: Delete notification endpoint
// Expected endpoint: DELETE /notifications/:id
// Expected response: { success: true }

// Icon + color mapping from notification type
const TYPE_META = {
  lead_created:    { icon: 'phone',    color: '#2563EB' },
  payment:         { icon: 'pay',      color: '#16A34A' },
  deal_moved:      { icon: 'bars',     color: '#C8973A' },
  vehicle_reserved:{ icon: 'info',     color: '#D97706' },
  ai_insight:      { icon: 'ai',       color: '#7C3AED' },
  task_due:        { icon: 'activity', color: '#EF4444' },
  message:         { icon: 'wa',       color: '#25D366' },
  default:         { icon: 'info',     color: '#6B7280' },
};

function mapNotification(n) {
  const meta = TYPE_META[n.type] || TYPE_META.default;
  return {
    id:    n.id,
    icon:  n.icon  || meta.icon,
    color: n.color || meta.color,
    title: n.title,
    desc:  n.description || n.desc || '',
    time:  n.created_at ? new Date(n.created_at).getTime() : Date.now(),
    unread: n.read === false || n.unread === true,
  };
}

export const useNotificationStore = create((set, get) => ({
  notifications: [
    // Seed shown instantly — replaced by real data on first fetch
    { id:1, icon:'phone',  title:'New lead: Adeola Benson',   desc:'BMW X5 – ₦89M via website',    time:Date.now()-120000,  unread:true,  color:'#2563EB' },
    { id:2, icon:'pay',    title:'Payment confirmed ✓',        desc:'₦42M – Biodun Adeyemi',         time:Date.now()-1680000, unread:true,  color:'#16A34A' },
    { id:3, icon:'bars',   title:'Deal moved → Payment',       desc:'Amaka – GLE 450',               time:Date.now()-3600000, unread:true,  color:'#C8973A' },
    { id:4, icon:'info',   title:'Vehicle reserved 3-day hold',desc:'Mercedes GLE 450',              time:Date.now()-7200000, unread:false, color:'#D97706' },
    { id:5, icon:'ai',     title:'AI insight available',       desc:'Smart pricing for 3 vehicles',  time:Date.now()-14400000,unread:false, color:'#7C3AED' },
  ],
  isLoading:  false,
  dataLoaded: false,

  unreadCount: () => get().notifications.filter((n) => n.unread).length,

  add: (notification) =>
    set((s) => ({
      notifications: [
        { ...notification, id: notification.id || Date.now(), time: notification.time || Date.now(), unread: true },
        ...s.notifications,
      ].slice(0, 50),
    })),

  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, unread: false } : n,
      ),
    })),

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, unread: false })),
    })),

  remove: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    })),

  clear: () => set({ notifications: [] }),

  // ── Fetch from backend when endpoint is available ─────────
  // TODO: Uncomment and wire up when /notifications endpoint is implemented
  // fetchNotifications: async () => {
  //   if (get().isLoading) return;
  //   set({ isLoading: true });
  //   try {
  //     const { data } = await client.get('/notifications', { params: { limit: 50 } });
  //     const mapped = (data.notifications ?? []).map(mapNotification);
  //     if (mapped.length > 0) set({ notifications: mapped, dataLoaded: true });
  //   } catch {
  //     // Keep seed data on error — notifications are non-critical
  //   } finally {
  //     set({ isLoading: false });
  //   }
  // },
}));
