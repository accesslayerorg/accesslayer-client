/**
 * App-wide light/dark theme state (#1085).
 *
 * - First visit: follows `prefers-color-scheme` (and keeps following it if
 *   the OS setting changes).
 * - Manual choice: stored in localStorage and wins over the OS setting on
 *   every later load. Choosing "system" clears the override.
 * - Other tabs pick up changes through the `storage` event.
 *
 * The initial class is applied by an inline script in `index.html` before
 * first paint so there is no flash of the wrong theme; keep the storage
 * key and class name there in sync with this file.
 */

export const THEME_STORAGE_KEY = 'accesslayer.theme';
export const DARK_CLASS = 'dark';
const TRANSITION_CLASS = 'theme-transition';
const TRANSITION_MS = 300;
const DARK_QUERY = '(prefers-color-scheme: dark)';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeState {
	preference: ThemePreference;
	resolvedTheme: ResolvedTheme;
}

function isManualTheme(value: unknown): value is ResolvedTheme {
	return value === 'light' || value === 'dark';
}

export function readStoredPreference(): ThemePreference {
	try {
		const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
		return isManualTheme(stored) ? stored : 'system';
	} catch {
		return 'system';
	}
}

function writeStoredPreference(preference: ThemePreference) {
	try {
		if (preference === 'system') {
			window.localStorage.removeItem(THEME_STORAGE_KEY);
		} else {
			window.localStorage.setItem(THEME_STORAGE_KEY, preference);
		}
	} catch {
		// Storage can be unavailable (private mode, quota); the choice still
		// applies for this session.
	}
}

export function getSystemTheme(): ResolvedTheme {
	if (typeof window === 'undefined' || !window.matchMedia) return 'light';
	return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
	return preference === 'system' ? getSystemTheme() : preference;
}

let transitionTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Applies the theme to `<html>`. `animate` briefly enables colour
 * transitions so user-initiated switches fade instead of snapping; it is
 * never used on initial load, which would itself look like a flash.
 */
export function applyTheme(theme: ResolvedTheme, animate = false) {
	const root = document.documentElement;
	if (animate) {
		root.classList.add(TRANSITION_CLASS);
		clearTimeout(transitionTimer);
		transitionTimer = setTimeout(
			() => root.classList.remove(TRANSITION_CLASS),
			TRANSITION_MS
		);
	}
	root.classList.toggle(DARK_CLASS, theme === 'dark');
	root.style.colorScheme = theme;
}

type Listener = () => void;
const listeners = new Set<Listener>();
let state: ThemeState | null = null;

function computeState(): ThemeState {
	const preference = readStoredPreference();
	return { preference, resolvedTheme: resolveTheme(preference) };
}

function update(next: ThemeState, animate: boolean) {
	const changed =
		!state ||
		state.preference !== next.preference ||
		state.resolvedTheme !== next.resolvedTheme;
	state = next;
	applyTheme(next.resolvedTheme, animate);
	if (changed) listeners.forEach(listener => listener());
}

function handleStorage(event: StorageEvent) {
	if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
	update(computeState(), true);
}

function handleSystemChange() {
	if (getThemeState().preference !== 'system') return;
	update(computeState(), true);
}

let mediaQuery: MediaQueryList | null = null;

function startListening() {
	window.addEventListener('storage', handleStorage);
	mediaQuery = window.matchMedia?.(DARK_QUERY) ?? null;
	mediaQuery?.addEventListener('change', handleSystemChange);
}

function stopListening() {
	window.removeEventListener('storage', handleStorage);
	mediaQuery?.removeEventListener('change', handleSystemChange);
	mediaQuery = null;
}

export function getThemeState(): ThemeState {
	if (!state) state = computeState();
	return state;
}

export function subscribeToTheme(listener: Listener): () => void {
	if (listeners.size === 0) startListening();
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
		if (listeners.size === 0) stopListening();
	};
}

export function setThemePreference(preference: ThemePreference) {
	writeStoredPreference(preference);
	update({ preference, resolvedTheme: resolveTheme(preference) }, true);
}

/** Flips between light and dark, storing the result as a manual override. */
export function toggleTheme() {
	setThemePreference(
		getThemeState().resolvedTheme === 'dark' ? 'light' : 'dark'
	);
}

/**
 * Syncs `<html>` with the stored/system theme. Called once at startup as a
 * safety net in case the inline script in `index.html` did not run.
 */
export function initTheme() {
	state = computeState();
	applyTheme(state.resolvedTheme);
}

/** Test helper: drops cached state so each test starts fresh. */
export function resetThemeStateForTests() {
	state = null;
	stopListening();
	listeners.clear();
}
