import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('wagmi', async importOriginal => {
	const actual = await importOriginal<typeof import('wagmi')>();
	return {
		...actual,
		useAccount: vi.fn(() => ({
			address: undefined,
			isConnected: false,
		})),
	};
});

// Node 22+ experimental localStorage polyfill for jsdom test environment
if (typeof window !== 'undefined') {
	const store = new Map<string, string>();
	const mockLocalStorage: Storage = {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => store.set(key, String(value)),
		removeItem: (key: string) => store.delete(key),
		clear: () => store.clear(),
		key: (index: number) => Array.from(store.keys())[index] ?? null,
		get length() {
			return store.size;
		},
	};

	try {
		Object.defineProperty(window, 'localStorage', {
			value: mockLocalStorage,
			writable: true,
			configurable: true,
		});
		Object.defineProperty(globalThis, 'localStorage', {
			value: mockLocalStorage,
			writable: true,
			configurable: true,
		});
	} catch {
		// ignore if already non-configurable
	}
}
