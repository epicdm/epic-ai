import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  /** Whether the sidebar is collapsed (desktop) */
  collapsed: boolean;
  /** Whether the mobile sheet is open */
  mobileOpen: boolean;
  /** Toggle collapsed state */
  toggleCollapsed: () => void;
  /** Set collapsed state directly */
  setCollapsed: (collapsed: boolean) => void;
  /** Toggle mobile sheet */
  toggleMobile: () => void;
  /** Set mobile sheet state directly */
  setMobileOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      mobileOpen: false,
      toggleCollapsed: () =>
        set((state) => ({ collapsed: !state.collapsed })),
      setCollapsed: (collapsed) => set({ collapsed }),
      toggleMobile: () =>
        set((state) => ({ mobileOpen: !state.mobileOpen })),
      setMobileOpen: (mobileOpen) => set({ mobileOpen }),
    }),
    {
      name: "epic-sidebar",
      partialize: (state) => ({ collapsed: state.collapsed }),
    }
  )
);
