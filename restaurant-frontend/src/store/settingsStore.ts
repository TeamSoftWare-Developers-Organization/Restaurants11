import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { RestaurantSettings, settingsService } from '@/services/settingsService';

interface SettingsState {
    settings: RestaurantSettings | null;
    loading: boolean;
    error: string | null;
    fetchSettings: () => Promise<void>;
    updateSettings: (newSettings: RestaurantSettings) => Promise<void>;
    uploadLogo: (file: File) => Promise<void>;
    removeLogo: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            settings: null,
            loading: false,
            error: null,

            fetchSettings: async () => {
                try {
                    set({ loading: true, error: null });
                    const settings = await settingsService.getSettings();
                    set({ settings, loading: false });
                } catch (error: any) {
                    console.error('Failed to fetch settings:', error);
                    set({ error: 'Failed to fetch settings', loading: false });
                }
            },

            updateSettings: async (newSettings: RestaurantSettings) => {
                try {
                    set({ loading: true, error: null });
                    const updated = await settingsService.updateSettings(newSettings);
                    set({ settings: updated, loading: false });
                } catch (error: any) {
                    console.error('Failed to update settings:', error);
                    set({ error: 'Failed to update settings', loading: false });
                    throw error;
                }
            },

            uploadLogo: async (file: File) => {
                try {
                    set({ loading: true, error: null });
                    const updated = await settingsService.uploadLogo(file);
                    set({ settings: updated, loading: false });
                } catch (error: any) {
                    console.error('Failed to upload logo:', error);
                    set({ error: 'Failed to upload logo', loading: false });
                    throw error;
                }
            },

            removeLogo: async () => {
                try {
                    set({ loading: true, error: null });
                    const updated = await settingsService.removeLogo();
                    set({ settings: updated, loading: false });
                } catch (error: any) {
                    console.error('Failed to remove logo:', error);
                    set({ error: 'Failed to remove logo', loading: false });
                    throw error;
                }
            },
        }),
        {
            name: 'settings-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
