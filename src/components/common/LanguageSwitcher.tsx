import { useTranslation } from 'react-i18next';
import i18n, {
	LANGUAGE_STORAGE_KEY,
	SUPPORTED_LANGUAGES,
	type SupportedLanguage,
} from '@/lib/i18n';

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
	en: 'English',
	es: 'Español',
	fr: 'Français',
};

export default function LanguageSwitcher() {
	const { t } = useTranslation();
	const activeLanguage = i18n.resolvedLanguage as SupportedLanguage;

	const handleChange = (language: SupportedLanguage) => {
		void i18n.changeLanguage(language);
		try {
			window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
		} catch {
			// Persistence is optional if browser storage is unavailable.
		}
	};

	return (
		<label className="inline-flex items-center">
			<span className="sr-only">{t('navigation.language')}</span>
			<select
				aria-label={t('navigation.language')}
				value={SUPPORTED_LANGUAGES.includes(activeLanguage) ? activeLanguage : 'en'}
				onChange={event =>
					handleChange(event.target.value as SupportedLanguage)
				}
				className="h-9 max-w-28 rounded-md border border-white/15 bg-slate-950/80 px-2 text-sm text-white outline-none focus:border-amber-400/60"
			>
				{SUPPORTED_LANGUAGES.map(language => (
					<option key={language} value={language}>
						{LANGUAGE_NAMES[language]}
					</option>
				))}
			</select>
		</label>
	);
}
