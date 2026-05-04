import { create } from 'zustand';

export const useUIStore = create((set, get) => ({
  // Sidebar
  sidebarOpen:   false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  closeSidebar:  () => set({ sidebarOpen: false }),
  openSidebar:   () => set({ sidebarOpen: true }),

  // Command palette
  cmdOpen:    false,
  toggleCmd:  () => set((s) => ({ cmdOpen: !s.cmdOpen })),
  closeCmd:   () => set({ cmdOpen: false }),

  // Notification panel
  notifOpen:    false,
  toggleNotif:  () => set((s) => ({ notifOpen: !s.notifOpen })),
  closeNotif:   () => set({ notifOpen: false }),

  // Onboarding setup progress
  setupSteps: {
    profile:   true,
    inventory: false,
    website:   false,
    payment:   false,
  },
  completeSetupStep: (step) =>
    set((s) => ({
      setupSteps: { ...s.setupSteps, [step]: true },
    })),

  // Global loading overlay
  globalLoading: false,
  setGlobalLoading: (v) => set({ globalLoading: v }),
}));
