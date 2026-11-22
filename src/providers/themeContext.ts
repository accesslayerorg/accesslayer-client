import { createContext, useContext } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

/** localStorage key used to persist the user's explicit theme choice. */
export const THEME_STORAGE_KEY = 'al:theme';

export const DARK_QUERY = '(prefers-color-scheme: dark)';

export interface ThemeContextValue {
	/** The user's selection: `light`, `dark` or follow the OS (`system`). */
	theme: Theme;
	/** The concrete theme currently applied to the document. */
	resolvedTheme: ResolvedTheme;
	/** Select a theme and persist it to localStorage. */
	setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: string | null): value is Theme {
	return value === 'light' || value === 'dark' || value === 'system';
}

/** Read the OS colour-scheme preference, defaulting to light when unavailable. */
export function getSystemTheme(): ResolvedTheme {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
		return 'light';
	}
	return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

export function readStoredTheme(): Theme {
	if (typeof window === 'undefined') return 'system';
	try {
		const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
		if (isTheme(stored)) return stored;
	} catch {
		// localStorage can be unavailable (private mode, blocked cookies); fall
		// back to following the OS.
	}
	return 'system';
}

export function persistTheme(theme: Theme): void {
	try {
		window.localStorage.setItem(THEME_STORAGE_KEY, theme);
	} catch {
		// Persistence is best-effort; the in-memory choice still applies.
	}
}

export function applyResolvedTheme(resolved: ResolvedTheme): void {
	if (typeof document === 'undefined') return;
	document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export function useTheme(): ThemeContextValue {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return context;
}
