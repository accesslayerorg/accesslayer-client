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
import {
	applyAccentToDocument,
	generatePalette,
	persistAccent,
	readStoredAccent,
	validateAccentColor,
} from '@/utils/accentPalette.utils';

export function ThemeProvider({ children }: { children: ReactNode }) {
	// The inline script in index.html has already applied the stored/system
	// theme to <html>, so the initial state only needs to mirror it.
	const [theme, setThemeState] = useState<Theme>(readStoredTheme);
	const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
	const [accentColor, setAccentColorState] = useState<string>(readStoredAccent);

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

	const accentPalette = useMemo(() => generatePalette(accentColor), [accentColor]);

	useEffect(() => {
		applyAccentToDocument(accentPalette, resolvedTheme);
	}, [accentPalette, resolvedTheme]);

	const setTheme = useCallback((next: Theme) => {
		setThemeState(next);
		persistTheme(next);
	}, []);

	const setAccentColor = useCallback((nextColor: string): boolean => {
		const validation = validateAccentColor(nextColor);
		if (!validation.isValid) {
			return false;
		}
		setAccentColorState(nextColor);
		persistAccent(nextColor);
		return true;
	}, []);

	const value = useMemo<ThemeContextValue>(
		() => ({
			theme,
			resolvedTheme,
			setTheme,
			accentColor,
			accentPalette,
			setAccentColor,
		}),
		[theme, resolvedTheme, setTheme, accentColor, accentPalette, setAccentColor]
	);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
