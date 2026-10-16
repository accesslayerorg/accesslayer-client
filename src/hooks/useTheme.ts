import { useSyncExternalStore } from 'react';
import {
	getThemeState,
	setThemePreference,
	subscribeToTheme,
	toggleTheme,
	type ThemePreference,
	type ResolvedTheme,
} from '@/lib/theme';

export interface UseThemeResult {
	/** What the user picked: an explicit theme or "follow the system". */
	preference: ThemePreference;
	/** The theme actually on screen. */
	resolvedTheme: ResolvedTheme;
	isDark: boolean;
	setPreference: (preference: ThemePreference) => void;
	toggleTheme: () => void;
}

const SERVER_SNAPSHOT = {
	preference: 'system',
	resolvedTheme: 'light',
} as const;
const getServerSnapshot = () => SERVER_SNAPSHOT;

export function useTheme(): UseThemeResult {
	const { preference, resolvedTheme } = useSyncExternalStore(
		subscribeToTheme,
		getThemeState,
		getServerSnapshot
	);

	return {
		preference,
		resolvedTheme,
		isDark: resolvedTheme === 'dark',
		setPreference: setThemePreference,
		toggleTheme,
	};
}
