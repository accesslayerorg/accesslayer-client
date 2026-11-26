import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en/common.json';
import es from '@/locales/es/common.json';
import fr from '@/locales/fr/common.json';

export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const LANGUAGE_STORAGE_KEY = 'al:lang';

export function isSupportedLanguage(
	value: string | null | undefined
): value is SupportedLanguage {
	return Boolean(value && SUPPORTED_LANGUAGES.includes(value as SupportedLanguage));
}

export function resolveSupportedLanguage(
	value: string | null | undefined
): SupportedLanguage {
	if (!value) return 'en';
	const base = value.trim().toLowerCase().split(/[-_]/)[0];
	return isSupportedLanguage(base) ? base : 'en';
}

export function detectInitialLanguage(): SupportedLanguage {
	if (typeof window === 'undefined') return 'en';

	try {
		const persisted = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
		if (isSupportedLanguage(persisted)) return persisted;
	} catch {
		// Storage can be unavailable in privacy or restricted browser contexts.
	}

	if (typeof navigator !== 'undefined') {
		return resolveSupportedLanguage(navigator.language);
	}
	return 'en';
}

const initialLanguage = detectInitialLanguage();

void i18n.use(initReactI18next).init({
	resources: {
		en: { common: en },
		es: { common: es },
		fr: { common: fr },
	},
	lng: initialLanguage,
	fallbackLng: 'en',
	supportedLngs: [...SUPPORTED_LANGUAGES],
	load: 'languageOnly',
	ns: ['common'],
	defaultNS: 'common',
	interpolation: { escapeValue: false },
	returnNull: false,
});

export function syncDocumentLanguage(language: string): void {
	if (typeof document === 'undefined') return;
	const resolved = resolveSupportedLanguage(language);
	document.documentElement.lang = resolved;
}

syncDocumentLanguage(initialLanguage);
i18n.on('languageChanged', syncDocumentLanguage);

export default i18n;
