import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY, useTheme } from '@/hooks/useTheme';

const localStorageStub = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (k: string) => store[k] ?? null,
		setItem: (k: string, v: string) => { store[k] = v; },
		removeItem: (k: string) => { delete store[k]; },
		clear: () => { store = {}; },
	};
})();

function setOsPreference(prefersDark: boolean) {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockReturnValue({
			matches: prefersDark,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}),
	});
}

beforeEach(() => {
	localStorageStub.clear();
	vi.stubGlobal('localStorage', localStorageStub);
	document.documentElement.classList.remove('dark');
	setOsPreference(false);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('useTheme initial value', () => {
	it('defaults to light when localStorage is empty and OS prefers light', () => {
		setOsPreference(false);
		const { result } = renderHook(() => useTheme());
		expect(result.current.theme).toBe('light');
	});

	it('defaults to dark when localStorage is empty and OS prefers dark', () => {
		setOsPreference(true);
		const { result } = renderHook(() => useTheme());
		expect(result.current.theme).toBe('dark');
	});

	it('reads stored light theme from localStorage over OS dark preference', () => {
		localStorageStub.setItem(THEME_STORAGE_KEY, 'light');
		setOsPreference(true);
		const { result } = renderHook(() => useTheme());
		expect(result.current.theme).toBe('light');
	});

	it('reads stored dark theme from localStorage over OS light preference', () => {
		localStorageStub.setItem(THEME_STORAGE_KEY, 'dark');
		setOsPreference(false);
		const { result } = renderHook(() => useTheme());
		expect(result.current.theme).toBe('dark');
	});

	it('ignores an invalid localStorage value and falls back to OS preference', () => {
		localStorageStub.setItem(THEME_STORAGE_KEY, 'system');
		setOsPreference(true);
		const { result } = renderHook(() => useTheme());
		expect(result.current.theme).toBe('dark');
	});
});

describe('useTheme html class management', () => {
	it('adds the dark class to <html> when theme is dark', () => {
		localStorageStub.setItem(THEME_STORAGE_KEY, 'dark');
		renderHook(() => useTheme());
		expect(document.documentElement.classList.contains('dark')).toBe(true);
	});

	it('removes the dark class from <html> when theme is light', () => {
		document.documentElement.classList.add('dark');
		localStorageStub.setItem(THEME_STORAGE_KEY, 'light');
		renderHook(() => useTheme());
		expect(document.documentElement.classList.contains('dark')).toBe(false);
	});

	it('adds the dark class after toggling from light to dark', () => {
		const { result } = renderHook(() => useTheme());
		expect(document.documentElement.classList.contains('dark')).toBe(false);

		act(() => { result.current.toggleTheme(); });

		expect(document.documentElement.classList.contains('dark')).toBe(true);
	});

	it('removes the dark class after toggling from dark to light', () => {
		localStorageStub.setItem(THEME_STORAGE_KEY, 'dark');
		const { result } = renderHook(() => useTheme());
		expect(document.documentElement.classList.contains('dark')).toBe(true);

		act(() => { result.current.toggleTheme(); });

		expect(document.documentElement.classList.contains('dark')).toBe(false);
	});
});

describe('useTheme localStorage persistence', () => {
	it('writes the initial theme to localStorage on mount', () => {
		setOsPreference(false);
		renderHook(() => useTheme());
		expect(localStorageStub.getItem(THEME_STORAGE_KEY)).toBe('light');
	});

	it('persists dark theme to localStorage after toggling', () => {
		const { result } = renderHook(() => useTheme());

		act(() => { result.current.toggleTheme(); });

		expect(localStorageStub.getItem(THEME_STORAGE_KEY)).toBe('dark');
	});

	it('persists light theme to localStorage after toggling back', () => {
		localStorageStub.setItem(THEME_STORAGE_KEY, 'dark');
		const { result } = renderHook(() => useTheme());

		act(() => { result.current.toggleTheme(); });

		expect(localStorageStub.getItem(THEME_STORAGE_KEY)).toBe('light');
	});
});

describe('useTheme toggleTheme', () => {
	it('switches from light to dark', () => {
		const { result } = renderHook(() => useTheme());
		expect(result.current.theme).toBe('light');

		act(() => { result.current.toggleTheme(); });

		expect(result.current.theme).toBe('dark');
	});

	it('switches from dark to light', () => {
		localStorageStub.setItem(THEME_STORAGE_KEY, 'dark');
		const { result } = renderHook(() => useTheme());
		expect(result.current.theme).toBe('dark');

		act(() => { result.current.toggleTheme(); });

		expect(result.current.theme).toBe('light');
	});

	it('toggles back and forth correctly', () => {
		const { result } = renderHook(() => useTheme());

		act(() => { result.current.toggleTheme(); });
		expect(result.current.theme).toBe('dark');

		act(() => { result.current.toggleTheme(); });
		expect(result.current.theme).toBe('light');

		act(() => { result.current.toggleTheme(); });
		expect(result.current.theme).toBe('dark');
	});
});
