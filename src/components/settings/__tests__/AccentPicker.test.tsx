import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThemeProvider } from '@/providers/ThemeProvider';
import AccentPicker from '../AccentPicker';
import DisplaySettingsSection from '../DisplaySettingsSection';
import {
	DEFAULT_ACCENT,
	ACCENT_STORAGE_KEY,
	readStoredCreatorAccent,
} from '@/utils/accentPalette.utils';

function renderWithTheme(ui: React.ReactElement) {
	return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('AccentPicker component (#1488)', () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.removeAttribute('style');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders preset swatches and default accent', () => {
		renderWithTheme(<AccentPicker />);

		expect(screen.getByTestId('accent-picker')).toBeInTheDocument();
		expect(screen.getByTestId('preset-swatches')).toBeInTheDocument();
		expect(screen.getByTestId('swatch-indigo')).toBeInTheDocument();
		expect(screen.getByTestId('swatch-emerald')).toBeInTheDocument();
		expect(screen.getByTestId('swatch-amber')).toBeInTheDocument();
		expect(screen.getByTestId('contrast-badge-light')).toBeInTheDocument();
		expect(screen.getByTestId('contrast-badge-dark')).toBeInTheDocument();
	});

	it('selecting a swatch updates CSS variables and localStorage immediately without reload', () => {
		renderWithTheme(<AccentPicker />);

		const emeraldSwatch = screen.getByTestId('swatch-emerald');
		fireEvent.click(emeraldSwatch);

		expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#059669');
		expect(localStorage.getItem(ACCENT_STORAGE_KEY)).toBe('#059669');
	});

	it('accepts and applies valid custom hex input', () => {
		renderWithTheme(<AccentPicker />);

		const input = screen.getByTestId('custom-hex-input');
		fireEvent.change(input, { target: { value: '#0891b2' } });

		const applyBtn = screen.getByTestId('apply-custom-accent-btn');
		fireEvent.click(applyBtn);

		expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#0891b2');
		expect(localStorage.getItem(ACCENT_STORAGE_KEY)).toBe('#0891b2');
	});

	it('rejects non-compliant colors, displays error and offers a compliant suggestion', () => {
		renderWithTheme(<AccentPicker />);

		const input = screen.getByTestId('custom-hex-input');
		fireEvent.change(input, { target: { value: '#ffffff' } });

		const applyBtn = screen.getByTestId('apply-custom-accent-btn');
		fireEvent.click(applyBtn);

		// Error should be visible
		const errorNotice = screen.getByTestId('accent-validation-error');
		expect(errorNotice).toBeInTheDocument();
		expect(errorNotice).toHaveTextContent(/too light/i);

		// Document CSS variable should NOT be changed to pure white
		expect(document.documentElement.style.getPropertyValue('--accent')).not.toBe('#ffffff');

		// Suggestion button should be present
		const suggestionBtn = screen.getByTestId('apply-suggestion-btn');
		expect(suggestionBtn).toBeInTheDocument();

		// Clicking suggestion applies the compliant color
		fireEvent.click(suggestionBtn);
		expect(screen.queryByTestId('accent-validation-error')).not.toBeInTheDocument();
		expect(document.documentElement.style.getPropertyValue('--accent')).toBe(DEFAULT_ACCENT);
	});

	it('handles creator accent mode scoped to a specific creatorId', () => {
		renderWithTheme(<AccentPicker creatorId="creator-42" />);

		const roseSwatch = screen.getByTestId('swatch-rose');
		fireEvent.click(roseSwatch);

		// Global accent should not be affected
		expect(localStorage.getItem(ACCENT_STORAGE_KEY)).toBeNull();

		// Creator-specific localStorage key should be populated
		expect(readStoredCreatorAccent('creator-42')).toBe('#dc2626');
	});

	it('resets to default accent on reset button click', () => {
		renderWithTheme(<AccentPicker />);

		const amberSwatch = screen.getByTestId('swatch-amber');
		fireEvent.click(amberSwatch);
		expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#d97706');

		const resetBtn = screen.getByTestId('reset-accent-btn');
		fireEvent.click(resetBtn);
		expect(document.documentElement.style.getPropertyValue('--accent')).toBe(DEFAULT_ACCENT);
	});
});

describe('DisplaySettingsSection component (#1488)', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('renders theme selector and accent picker together', () => {
		renderWithTheme(<DisplaySettingsSection />);

		expect(screen.getByTestId('display-settings')).toBeInTheDocument();
		expect(screen.getByTestId('theme-option-light')).toBeInTheDocument();
		expect(screen.getByTestId('theme-option-dark')).toBeInTheDocument();
		expect(screen.getByTestId('theme-option-system')).toBeInTheDocument();
		expect(screen.getByTestId('accent-picker')).toBeInTheDocument();
	});
});
