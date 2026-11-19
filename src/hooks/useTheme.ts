import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'theme';

function getSystemTheme(): 'light' | 'dark' {
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveInitialTheme(): Theme {
	const stored = localStorage.getItem(THEME_STORAGE_KEY);
	if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
	return 'system';
}

function applyTheme(theme: Theme): void {
	const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;
	document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
}

export interface UseThemeResult {
	theme: Theme;
	toggleTheme: () => void;
}

export function useTheme(): UseThemeResult {
	const [theme, setTheme] = useState<Theme>(resolveInitialTheme);

	useEffect(() => {
		applyTheme(theme);
		localStorage.setItem(THEME_STORAGE_KEY, theme);
	}, [theme]);

	useEffect(() => {
		if (theme !== 'system') return;

		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handler = () => applyTheme('system');
		mediaQuery.addEventListener('change', handler);
		return () => mediaQuery.removeEventListener('change', handler);
	}, [theme]);

	const toggleTheme = useCallback(() => {
		setTheme(prev => {
			if (prev === 'light') return 'dark';
			if (prev === 'dark') return 'system';
			return 'light';
		});
	}, []);

	return { theme, toggleTheme };
}
