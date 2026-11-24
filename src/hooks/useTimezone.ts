import { create } from 'zustand';
import { useProfileStore } from '@/hooks/useProfileStore';

const STORAGE_KEY = 'accesslayer-timezone-preference';

export function getBrowserTimezone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	} catch {
		return 'UTC';
	}
}

export function getAllTimezones(): string[] {
	try {
		if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
			const zones = (Intl as unknown as { supportedValuesOf: (key: string) => string[] }).supportedValuesOf('timeZone');
			if (Array.isArray(zones) && zones.length > 0) {
				return ['UTC', ...zones.filter(z => z !== 'UTC')];
			}
		}
	} catch {
		// Fallback list
	}

	return [
		'UTC',
		'America/New_York',
		'America/Chicago',
		'America/Denver',
		'America/Los_Angeles',
		'America/Toronto',
		'America/Sao_Paulo',
		'Europe/London',
		'Europe/Paris',
		'Europe/Berlin',
		'Europe/Amsterdam',
		'Europe/Madrid',
		'Europe/Rome',
		'Asia/Dubai',
		'Asia/Kolkata',
		'Asia/Singapore',
		'Asia/Hong_Kong',
		'Asia/Tokyo',
		'Asia/Seoul',
		'Australia/Sydney',
		'Pacific/Auckland',
	];
}

interface TimezoneState {
	timezone: string;
	isAuto: boolean;
	effectiveTimezone: string;
	setTimezone: (timezone: string, syncToProfile?: boolean) => void;
	setAutoDetect: () => void;
	getEffectiveZone: () => string;
}

function loadSavedPreference(): { timezone: string; isAuto: boolean } {
	if (typeof window === 'undefined') {
		return { timezone: 'UTC', isAuto: true };
	}
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			if (parsed.isAuto) {
				return { timezone: getBrowserTimezone(), isAuto: true };
			}
			if (parsed.timezone) {
				return { timezone: parsed.timezone, isAuto: false };
			}
		}
	} catch {
		// Ignore storage errors
	}
	return { timezone: getBrowserTimezone(), isAuto: true };
}

export const useTimezone = create<TimezoneState>((set, get) => {
	const initial = loadSavedPreference();
	const initialEffective = initial.isAuto ? getBrowserTimezone() : initial.timezone;

	return {
		timezone: initial.timezone,
		isAuto: initial.isAuto,
		effectiveTimezone: initialEffective,

		setTimezone: (newZone: string, syncToProfile = true) => {
			const isAuto = false;
			set({
				timezone: newZone,
				isAuto,
				effectiveTimezone: newZone,
			});

			try {
				localStorage.setItem(
					STORAGE_KEY,
					JSON.stringify({ timezone: newZone, isAuto: false })
				);
			} catch {}

			if (syncToProfile) {
				const profileStore = useProfileStore.getState();
				if (profileStore.profile) {
					profileStore.setProfile({
						...profileStore.profile,
						// Persist timezone preference onto active profile
						...( { timezone: newZone } as unknown as object ),
					});
				}
			}
		},

		setAutoDetect: () => {
			const browserZone = getBrowserTimezone();
			set({
				timezone: browserZone,
				isAuto: true,
				effectiveTimezone: browserZone,
			});

			try {
				localStorage.setItem(
					STORAGE_KEY,
					JSON.stringify({ timezone: browserZone, isAuto: true })
				);
			} catch {}
		},

		getEffectiveZone: () => {
			return get().effectiveTimezone;
		},
	};
});
