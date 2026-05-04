import { create } from 'zustand';

const SEED = [
  { id:1, icon:'phone',  title:'New lead: Adeola Benson',  desc:'BMW X5 – ₦89M via website',     time:Date.now()-120000,  unread:true,  color:'#2563EB' },
  { id:2, icon:'pay',    title:'Payment confirmed ✓',       desc:'₦42M – Biodun Adeyemi',          time:Date.now()-1680000, unread:true,  color:'#16A34A' },
  { id:3, icon:'bars',   title:'Deal moved → Payment',      desc:'Amaka – GLE 450',                time:Date.now()-3600000, unread:true,  color:'#C8973A' },
  { id:4, icon:'info',   title:'Vehicle reserved 3-day hold',desc:'Mercedes GLE 450',             time:Date.now()-7200000, unread:false, color:'#D97706' },
  { id:5, icon:'ai',     title:'AI insight available',      desc:'Smart pricing for 3 vehicles',  time:Date.now()-14400000,unread:false, color:'#7C3AED' },
];

export const useNotificationStore = create((set, get) => ({
  notifications: SEED,

  unreadCount: () => get().notifications.filter((n) => n.unread).length,

  add: (notification) =>
    set((s) => ({
      notifications: [
        { ...notification, id: Date.now(), time: Date.now(), unread: true },
        ...s.notifications,
      ].slice(0, 50), // cap at 50
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
}));
