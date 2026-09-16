'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';

export function SettingsInitializer() {
    const fetchSettings = useSettingsStore((state) => state.fetchSettings);
    const user = useAuthStore((state) => state.user);

    useEffect(() => {
        // Fetch settings if user is logged in
        if (user) {
            fetchSettings();
        }
    }, [user, fetchSettings]);

    return null;
}
