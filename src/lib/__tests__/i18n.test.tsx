import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n, {
	detectInitialLanguage,
	resolveSupportedLanguage,
} from '@/lib/i18n';
import { formatLocaleDate, formatLocaleNumber } from '@/lib/localeFormatting';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';

describe('marketplace i18n', () => {
	beforeEach(async () => {
		window.localStorage.clear();
		await i18n.changeLanguage('en');
		document.documentElement.lang = 'en';
	});

	it('loads English, Spanish, and French resources', async () => {
		await i18n.changeLanguage('en');
		expect(i18n.t('navigation.marketplace')).toBe('Marketplace');
		await i18n.changeLanguage('es');
		expect(i18n.t('navigation.marketplace')).toBe('Mercado');
		await i18n.changeLanguage('fr');
		expect(i18n.t('navigation.marketplace')).toBe('Marché');
	});

	it('falls back to English for missing keys', () => {
		i18n.addResource('en', 'common', 'test.missingFallback', 'English fallback');
		expect(i18n.t('test.missingFallback', { lng: 'es' })).toBe('English fallback');
	});

	it.each([
		['es-ES', 'es'],
		['fr-FR', 'fr'],
		['en-US', 'en'],
		['de-DE', 'en'],
	])('resolves regional or unsupported language %s to %s', (value, expected) => {
		expect(resolveSupportedLanguage(value)).toBe(expected);
	});

	it('persisted language takes precedence and invalid values fall back', () => {
		window.localStorage.setItem('al:lang', 'fr');
		vi.stubGlobal('navigator', { language: 'es-MX' });
		expect(detectInitialLanguage()).toBe('fr');
		window.localStorage.setItem('al:lang', 'de');
		expect(detectInitialLanguage()).toBe('es');
		vi.unstubAllGlobals();
	});

	it('persists switcher selections and updates document language', async () => {
		render(
			<I18nextProvider i18n={i18n}>
				<LanguageSwitcher />
			</I18nextProvider>
		);
		const select = screen.getByRole('combobox', { name: 'Language' });
		fireEvent.change(select, { target: { value: 'es' } });
		await vi.waitFor(() => expect(document.documentElement.lang).toBe('es'));
		expect(window.localStorage.getItem('al:lang')).toBe('es');
		expect(screen.getAllByRole('option')).toHaveLength(3);
	});

	it('formats numbers and dates using the active locale', async () => {
		await i18n.changeLanguage('en');
		expect(formatLocaleNumber(1234.5)).toBe('1,234.5');
		const date = new Date('2026-01-02T12:00:00Z');
		expect(formatLocaleDate(date, { year: 'numeric', month: '2-digit', day: '2-digit' }))
			.toBe(new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date));

		await i18n.changeLanguage('fr');
		expect(formatLocaleNumber(1234.5)).toContain('1');
		expect(formatLocaleNumber(null)).toBe('—');
		expect(formatLocaleDate('not-a-date')).toBe('—');
	});
});
