import { beforeEach, describe, expect, it } from 'vitest';
import {
	CONSENT_STORAGE_KEY,
	CONSENT_VERSION,
	useConsent,
} from '@/hooks/useConsent';

describe('useConsent', () => {
	beforeEach(() => {
		localStorage.clear();
		useConsent.setState({ preferences: null, preferencesOpen: false });
	});

	it('starts without optional consent and persists an explicit rejection', () => {
		expect(useConsent.getState().preferences).toBeNull();

		useConsent.getState().rejectNonEssential();

		expect(useConsent.getState().preferences).toEqual({
			analytics: false,
			errorReporting: false,
		});
		expect(
			JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? '{}')
		).toEqual({
			state: {
				preferences: { analytics: false, errorReporting: false },
			},
			version: CONSENT_VERSION,
		});
	});

	it('accepts all optional preferences and permits later changes', () => {
		useConsent.getState().acceptAll();
		expect(useConsent.getState().preferences).toEqual({
			analytics: true,
			errorReporting: true,
		});

		useConsent.getState().savePreferences({
			analytics: false,
			errorReporting: true,
		});
		expect(useConsent.getState().preferences).toEqual({
			analytics: false,
			errorReporting: true,
		});
	});

	it('clears consent when rehydrating a previous consent version', async () => {
		useConsent.getState().acceptAll();
		localStorage.setItem(
			CONSENT_STORAGE_KEY,
			JSON.stringify({
				state: {
					preferences: { analytics: true, errorReporting: true },
				},
				version: CONSENT_VERSION - 1,
			})
		);

		await useConsent.persist.rehydrate();

		expect(useConsent.getState().preferences).toBeNull();
	});

	it('can reopen and close the preferences center without changing consent', () => {
		useConsent.getState().rejectNonEssential();
		useConsent.getState().openPreferences();
		expect(useConsent.getState().preferencesOpen).toBe(true);

		useConsent.getState().closePreferences();

		expect(useConsent.getState().preferencesOpen).toBe(false);
		expect(useConsent.getState().preferences).toEqual({
			analytics: false,
			errorReporting: false,
		});
	});
});
