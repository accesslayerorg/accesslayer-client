import i18n from '@/lib/i18n';

export function getActiveLocale(): string {
	const language = i18n.resolvedLanguage ?? i18n.language;
	return language.startsWith('es') ? 'es' : language.startsWith('fr') ? 'fr' : 'en';
}

export function formatLocaleNumber(
	value: number | null | undefined,
	options: Intl.NumberFormatOptions = {}
): string {
	if (value == null || !Number.isFinite(value)) return '—';
	return new Intl.NumberFormat(getActiveLocale(), options).format(value);
}

export function formatLocalePrice(
	value: number | null | undefined,
	currency = 'XLM',
	options: Intl.NumberFormatOptions = {}
): string {
	if (value == null || !Number.isFinite(value)) return '—';
	return `${new Intl.NumberFormat(getActiveLocale(), options).format(value)} ${currency}`;
}

export function formatLocaleDate(
	value: Date | string | number | null | undefined,
	options: Intl.DateTimeFormatOptions = {}
): string {
	if (value == null) return '—';
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return new Intl.DateTimeFormat(getActiveLocale(), options).format(date);
}
