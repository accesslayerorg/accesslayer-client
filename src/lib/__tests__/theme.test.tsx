import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ThemeToggle from '@/components/common/ThemeToggle';
import {
	THEME_STORAGE_KEY,
	getThemeState,
	initTheme,
	resetThemeStateForTests,
	setThemePreference,
	subscribeToTheme,
} from '@/lib/theme';

type ChangeListener = (event: MediaQueryListEvent) => void;

/** Controllable `prefers-color-scheme` stub. */
function mockSystemTheme(initialDark: boolean) {
	let matches = initialDark;
	const listeners = new Set<ChangeListener>();
	vi.stubGlobal(
		'matchMedia',
		vi.fn((query: string) => ({
			get matches() {
				return matches;
			},
			media: query,
			addEventListener: (_: string, cb: ChangeListener) => listeners.add(cb),
			removeEventListener: (_: string, cb: ChangeListener) =>
				listeners.delete(cb),
		}))
	);
	return {
		setDark(next: boolean) {
			matches = next;
			listeners.forEach(cb => cb({ matches: next } as MediaQueryListEvent));
		},
	};
}

const html = () => document.documentElement;

beforeEach(() => {
	vi.useFakeTimers();
	localStorage.clear();
	html().className = '';
	html().style.colorScheme = '';
	resetThemeStateForTests();
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('theme', () => {
	it('applies the system dark preference on first visit', () => {
		mockSystemTheme(true);
		initTheme();
		expect(getThemeState()).toEqual({
			preference: 'system',
			resolvedTheme: 'dark',
		});
		expect(html()).toHaveClass('dark');
		expect(html().style.colorScheme).toBe('dark');
		// Initial load must not animate (would read as a flash).
		expect(html()).not.toHaveClass('theme-transition');
	});

	it('applies the system light preference on first visit', () => {
		mockSystemTheme(false);
		initTheme();
		expect(getThemeState().resolvedTheme).toBe('light');
		expect(html()).not.toHaveClass('dark');
	});

	it('lets a manual choice override the system and persist across loads', () => {
		mockSystemTheme(true);
		initTheme();

		setThemePreference('light');
		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
		expect(html()).not.toHaveClass('dark');

		// Simulate a fresh page load with the system still dark.
		resetThemeStateForTests();
		html().className = '';
		initTheme();
		expect(getThemeState()).toEqual({
			preference: 'light',
			resolvedTheme: 'light',
		});
		expect(html()).not.toHaveClass('dark');
	});

	it('choosing "system" clears the override', () => {
		mockSystemTheme(true);
		initTheme();
		setThemePreference('light');
		setThemePreference('system');
		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
		expect(html()).toHaveClass('dark');
	});

	it('follows live OS changes only while on "system"', () => {
		const system = mockSystemTheme(false);
		initTheme();
		const unsubscribe = subscribeToTheme(() => {});

		act(() => system.setDark(true));
		expect(html()).toHaveClass('dark');

		setThemePreference('light');
		act(() => system.setDark(false));
		act(() => system.setDark(true));
		expect(html()).not.toHaveClass('dark');
		unsubscribe();
	});

	it('animates user-initiated switches and then removes the transition class', () => {
		mockSystemTheme(false);
		initTheme();
		setThemePreference('dark');
		expect(html()).toHaveClass('theme-transition');
		vi.advanceTimersByTime(300);
		expect(html()).not.toHaveClass('theme-transition');
	});

	it('ignores corrupted stored values', () => {
		mockSystemTheme(true);
		localStorage.setItem(THEME_STORAGE_KEY, 'purple');
		initTheme();
		expect(getThemeState()).toEqual({
			preference: 'system',
			resolvedTheme: 'dark',
		});
	});
});

describe('ThemeToggle', () => {
	it('toggles the theme, stores the override and updates its label', () => {
		mockSystemTheme(false);
		initTheme();
		render(<ThemeToggle />);

		const button = screen.getByRole('button', {
			name: 'Switch to dark mode',
		});
		fireEvent.click(button);

		expect(html()).toHaveClass('dark');
		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
		expect(
			screen.getByRole('button', { name: 'Switch to light mode' })
		).toBeInTheDocument();
	});

	it('syncs with changes made in another tab', () => {
		mockSystemTheme(false);
		initTheme();
		render(<ThemeToggle />);

		// Another tab writes the override, then the browser fires `storage`.
		localStorage.setItem(THEME_STORAGE_KEY, 'dark');
		act(() => {
			window.dispatchEvent(
				new StorageEvent('storage', {
					key: THEME_STORAGE_KEY,
					newValue: 'dark',
				})
			);
		});

		expect(html()).toHaveClass('dark');
		expect(
			screen.getByRole('button', { name: 'Switch to light mode' })
		).toBeInTheDocument();

		localStorage.removeItem(THEME_STORAGE_KEY);
		act(() => {
			window.dispatchEvent(
				new StorageEvent('storage', {
					key: THEME_STORAGE_KEY,
					newValue: null,
				})
			);
		});
		expect(html()).not.toHaveClass('dark');
	});

	it('ignores storage events for unrelated keys', () => {
		mockSystemTheme(false);
		initTheme();
		render(<ThemeToggle />);
		localStorage.setItem(THEME_STORAGE_KEY, 'dark');
		act(() => {
			window.dispatchEvent(
				new StorageEvent('storage', {
					key: 'something-else',
					newValue: 'x',
				})
			);
		});
		expect(html()).not.toHaveClass('dark');
	});
});
