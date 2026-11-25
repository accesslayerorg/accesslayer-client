import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import ThemeToggle from '../ThemeToggle';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { THEME_STORAGE_KEY } from '@/providers/themeContext';

function installMatchMedia(prefersDark: boolean) {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		configurable: true,
		value: vi.fn((query: string) => ({
			matches: query.includes('dark') ? prefersDark : false,
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});
}

beforeAll(() => {
	// Radix menu interactions rely on pointer capture APIs jsdom does not ship.
	Element.prototype.hasPointerCapture = vi.fn(() => false);
	Element.prototype.setPointerCapture = vi.fn();
	Element.prototype.releasePointerCapture = vi.fn();
	Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
	localStorage.clear();
	document.documentElement.classList.remove('dark');
	installMatchMedia(false);
});

afterEach(() => {
	vi.clearAllMocks();
	document.documentElement.classList.remove('dark');
});

function renderToggle() {
	return render(
		<ThemeProvider>
			<ThemeToggle />
		</ThemeProvider>
	);
}

describe('ThemeToggle', () => {
	it('labels the trigger with the current theme choice', () => {
		renderToggle();

		expect(
			screen.getByRole('button', { name: /theme: system\. change colour theme\./i })
		).toBeInTheDocument();
	});

	it('opens with the keyboard and exposes all three options', async () => {
		const user = userEvent.setup();
		renderToggle();

		const trigger = screen.getByRole('button', { name: /change colour theme/i });
		trigger.focus();
		await user.keyboard('{Enter}');

		expect(await screen.findByRole('menuitemradio', { name: 'Light theme' })).toBeInTheDocument();
		expect(screen.getByRole('menuitemradio', { name: 'Dark theme' })).toBeInTheDocument();
		expect(screen.getByRole('menuitemradio', { name: 'System theme' })).toBeInTheDocument();
	});

	it('applies and persists the selected theme', async () => {
		const user = userEvent.setup();
		renderToggle();

		await user.click(screen.getByRole('button', { name: /change colour theme/i }));
		await user.click(await screen.findByRole('menuitemradio', { name: 'Dark theme' }));

		expect(document.documentElement.classList.contains('dark')).toBe(true);
		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
		expect(
			screen.getByRole('button', { name: /theme: dark\. change colour theme\./i })
		).toBeInTheDocument();
	});
});
