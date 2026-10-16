import { useTheme } from '@/hooks/useTheme';

/**
 * Whether the app is currently rendering in dark mode.
 *
 * Kept for existing callers (e.g. sparkline colours). Since #1085 this
 * follows the app theme — which defaults to the OS preference but can be
 * overridden by the user — rather than reading `prefers-color-scheme`
 * directly.
 */
export function useSystemTheme() {
	const { isDark } = useTheme();
	return { isDarkMode: isDark };
}
