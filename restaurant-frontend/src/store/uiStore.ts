import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
    isSidebarCollapsed: boolean;
    isMobileMenuOpen: boolean;
    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
    toggleMobileMenu: () => void;
    setMobileMenuOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            isSidebarCollapsed: false,
            isMobileMenuOpen: false,
            toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
            setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
            toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
            setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
        }),
        {
            name: 'ui-storage',
            partialize: (state) => ({ isSidebarCollapsed: state.isSidebarCollapsed }),
        }
    )
);
