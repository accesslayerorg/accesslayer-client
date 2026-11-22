import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
	applyResolvedTheme,
	DARK_QUERY,
	getSystemTheme,
	persistTheme,
	readStoredTheme,
	ThemeContext,
	type ResolvedTheme,
	type Theme,
	type ThemeContextValue,
} from './themeContext';

export function ThemeProvider({ children }: { children: ReactNode }) {
	// The inline script in index.html has already applied the stored/system
	// theme to <html>, so the initial state only needs to mirror it.
	const [theme, setThemeState] = useState<Theme>(readStoredTheme);
	const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

	// Keep following the OS only while the user has not overridden it.
	useEffect(() => {
		if (theme !== 'system' || typeof window.matchMedia !== 'function') return;

		const mediaQuery = window.matchMedia(DARK_QUERY);
		setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

		const handler = (event: MediaQueryListEvent) => {
			setSystemTheme(event.matches ? 'dark' : 'light');
		};
		mediaQuery.addEventListener('change', handler);
		return () => mediaQuery.removeEventListener('change', handler);
	}, [theme]);

	const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme;

	useEffect(() => {
		applyResolvedTheme(resolvedTheme);
	}, [resolvedTheme]);

	const setTheme = useCallback((next: Theme) => {
		setThemeState(next);
		persistTheme(next);
	}, []);

	const value = useMemo<ThemeContextValue>(
		() => ({ theme, resolvedTheme, setTheme }),
		[theme, resolvedTheme, setTheme]
	);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
