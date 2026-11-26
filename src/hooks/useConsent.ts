import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const CONSENT_VERSION = 1;
export const CONSENT_STORAGE_KEY = 'accesslayer.consent';

export interface ConsentPreferences {
	analytics: boolean;
	errorReporting: boolean;
}

interface ConsentState {
	preferences: ConsentPreferences | null;
	preferencesOpen: boolean;
	acceptAll: () => void;
	rejectNonEssential: () => void;
	savePreferences: (preferences: ConsentPreferences) => void;
	openPreferences: () => void;
	closePreferences: () => void;
}

const NO_NON_ESSENTIAL_CONSENT: ConsentPreferences = {
	analytics: false,
	errorReporting: false,
};

export const useConsent = create<ConsentState>()(
	persist(
		set => ({
			preferences: null,
			preferencesOpen: false,
			acceptAll: () =>
				set({
					preferences: { analytics: true, errorReporting: true },
					preferencesOpen: false,
				}),
			rejectNonEssential: () =>
				set({
					preferences: { ...NO_NON_ESSENTIAL_CONSENT },
					preferencesOpen: false,
				}),
			savePreferences: preferences =>
				set({
					preferences: {
						analytics: Boolean(preferences.analytics),
						errorReporting: Boolean(preferences.errorReporting),
					},
					preferencesOpen: false,
				}),
			openPreferences: () => set({ preferencesOpen: true }),
			closePreferences: () => set({ preferencesOpen: false }),
		}),
		{
			name: CONSENT_STORAGE_KEY,
			version: CONSENT_VERSION,
			storage: createJSONStorage(() => localStorage),
			partialize: state => ({ preferences: state.preferences }),
			migrate: () => ({ preferences: null }),
		}
	)
);
