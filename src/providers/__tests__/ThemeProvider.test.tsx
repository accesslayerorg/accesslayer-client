import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../ThemeProvider';
import { THEME_STORAGE_KEY, useTheme } from '../themeContext';

type MediaListener = (event: MediaQueryListEvent) => void;

let darkMatches = false;
let mediaListeners: MediaListener[] = [];

function installMatchMedia(prefersDark: boolean) {
	darkMatches = prefersDark;
	mediaListeners = [];

	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		configurable: true,
		value: vi.fn((query: string) => ({
			matches: query.includes('dark') ? darkMatches : false,
			media: query,
			onchange: null,
			addEventListener: (_type: string, listener: MediaListener) => {
				mediaListeners.push(listener);
			},
			removeEventListener: (_type: string, listener: MediaListener) => {
				mediaListeners = mediaListeners.filter(entry => entry !== listener);
			},
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});
}

function notifyOsThemeChange(prefersDark: boolean) {
	darkMatches = prefersDark;
	act(() => {
		mediaListeners.forEach(listener =>
			listener({ matches: prefersDark } as MediaQueryListEvent)
		);
	});
}

function wrapper({ children }: { children: ReactNode }) {
	return <ThemeProvider>{children}</ThemeProvider>;
}

function renderTheme() {
	return renderHook(() => useTheme(), { wrapper });
}

beforeEach(() => {
	localStorage.clear();
	document.documentElement.classList.remove('dark');
	installMatchMedia(false);
});

afterEach(() => {
	vi.restoreAllMocks();
	document.documentElement.classList.remove('dark');
});

describe('ThemeProvider initial theme', () => {
	it('follows the OS preference on a first visit (dark)', () => {
		installMatchMedia(true);
		const { result } = renderTheme();

		expect(result.current.theme).toBe('system');
		expect(result.current.resolvedTheme).toBe('dark');
		expect(document.documentElement.classList.contains('dark')).toBe(true);
	});

	it('follows the OS preference on a first visit (light)', () => {
		installMatchMedia(false);
		const { result } = renderTheme();

		expect(result.current.theme).toBe('system');
		expect(result.current.resolvedTheme).toBe('light');
		expect(document.documentElement.classList.contains('dark')).toBe(false);
	});

	it('honours a persisted dark choice over a light OS preference', () => {
		localStorage.setItem(THEME_STORAGE_KEY, 'dark');
		installMatchMedia(false);
		const { result } = renderTheme();

		expect(result.current.theme).toBe('dark');
		expect(result.current.resolvedTheme).toBe('dark');
		expect(document.documentElement.classList.contains('dark')).toBe(true);
	});

	it('honours a persisted light choice over a dark OS preference', () => {
		localStorage.setItem(THEME_STORAGE_KEY, 'light');
		installMatchMedia(true);
		const { result } = renderTheme();

		expect(result.current.theme).toBe('light');
		expect(result.current.resolvedTheme).toBe('light');
		expect(document.documentElement.classList.contains('dark')).toBe(false);
	});

	it('falls back to system when the stored value is invalid', () => {
		localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
		installMatchMedia(true);
		const { result } = renderTheme();

		expect(result.current.theme).toBe('system');
		expect(result.current.resolvedTheme).toBe('dark');
	});
});

describe('ThemeProvider setTheme', () => {
	it('applies and persists an explicit light selection', () => {
		installMatchMedia(true);
		const { result } = renderTheme();

		act(() => result.current.setTheme('light'));

		expect(result.current.theme).toBe('light');
		expect(result.current.resolvedTheme).toBe('light');
		expect(document.documentElement.classList.contains('dark')).toBe(false);
		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
	});

	it('applies and persists an explicit dark selection', () => {
		installMatchMedia(false);
		const { result } = renderTheme();

		act(() => result.current.setTheme('dark'));

		expect(result.current.theme).toBe('dark');
		expect(document.documentElement.classList.contains('dark')).toBe(true);
		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
	});

	it('restores a persisted selection after a reload', () => {
		installMatchMedia(false);
		const first = renderTheme();
		act(() => first.result.current.setTheme('dark'));
		first.unmount();

		installMatchMedia(false);
		const { result } = renderTheme();

		expect(result.current.theme).toBe('dark');
		expect(document.documentElement.classList.contains('dark')).toBe(true);
	});
});

describe('ThemeProvider system preference listener', () => {
	it('updates live when the OS theme changes while set to system', () => {
		installMatchMedia(false);
		const { result } = renderTheme();
		expect(result.current.resolvedTheme).toBe('light');

		notifyOsThemeChange(true);

		expect(result.current.resolvedTheme).toBe('dark');
		expect(document.documentElement.classList.contains('dark')).toBe(true);

		notifyOsThemeChange(false);

		expect(result.current.resolvedTheme).toBe('light');
		expect(document.documentElement.classList.contains('dark')).toBe(false);
	});

	it('ignores OS changes when an explicit theme is selected', () => {
		installMatchMedia(false);
		const { result } = renderTheme();
		act(() => result.current.setTheme('light'));

		notifyOsThemeChange(true);

		expect(result.current.theme).toBe('light');
		expect(result.current.resolvedTheme).toBe('light');
		expect(document.documentElement.classList.contains('dark')).toBe(false);
	});

	it('starts following the OS again when switching back to system', () => {
		installMatchMedia(false);
		const { result } = renderTheme();
		act(() => result.current.setTheme('light'));
		notifyOsThemeChange(true);
		expect(result.current.resolvedTheme).toBe('light');

		act(() => result.current.setTheme('system'));

		expect(result.current.theme).toBe('system');
		expect(result.current.resolvedTheme).toBe('dark');
		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
	});
});

describe('useTheme outside a provider', () => {
	it('throws a descriptive error', () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

		expect(() => render(<ThemeProbe />)).toThrow(
			'useTheme must be used within a ThemeProvider'
		);

		consoleError.mockRestore();
	});
});

function ThemeProbe() {
	const { theme } = useTheme();
	return <span>{theme}</span>;
}

describe('ThemeProvider accessibility of resolved state', () => {
	it('exposes the theme through its context to consumers', () => {
		installMatchMedia(true);
		render(
			<ThemeProvider>
				<ThemeProbe />
			</ThemeProvider>
		);

		expect(screen.getByText('system')).toBeInTheDocument();
	});
});
