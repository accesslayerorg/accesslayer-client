import { env } from '@/utils/env.utils';

export interface UtmParams {
	utm_source?: string;
	utm_medium?: string;
	utm_campaign?: string;
	utm_term?: string;
	utm_content?: string;
}

/**
 * Get configured UTM parameters from environment variables
 * @returns Object with configured UTM params; empty if none configured
 */
export const getConfiguredUtmParams = (): UtmParams => {
	const params: UtmParams = {};

	if (env.VITE_UTM_SOURCE) params.utm_source = env.VITE_UTM_SOURCE;
	if (env.VITE_UTM_MEDIUM) params.utm_medium = env.VITE_UTM_MEDIUM;
	if (env.VITE_UTM_CAMPAIGN) params.utm_campaign = env.VITE_UTM_CAMPAIGN;
	if (env.VITE_UTM_TERM) params.utm_term = env.VITE_UTM_TERM;
	if (env.VITE_UTM_CONTENT) params.utm_content = env.VITE_UTM_CONTENT;

	return params;
};

/**
 * Append UTM parameters to a URL.
 * If no UTM params are configured, returns the original URL unchanged.
 *
 * @param inputUrl - The base URL to append params to
 * @param overrideParams - Optional params to use instead of configured ones
 * @returns URL with appended UTM params, or original URL if no params configured
 *
 * @example
 * // With env vars: VITE_UTM_SOURCE=twitter, VITE_UTM_MEDIUM=social
 * appendUtmParams('https://example.com/creator/alice')
 * // returns 'https://example.com/creator/alice?utm_source=twitter&utm_medium=social'
 *
 * @example
 * // Without env vars configured
 * appendUtmParams('https://example.com/creator/alice')
 * // returns 'https://example.com/creator/alice' (unchanged)
 */
export const appendUtmParams = (
	inputUrl: string,
	overrideParams?: UtmParams
): string => {
	const configured = overrideParams ?? getConfiguredUtmParams();

	// If no UTM params configured, return original URL unchanged
	const keys = Object.keys(configured) as Array<keyof UtmParams>;
	const hasAny = keys.some((k) => !!configured[k]);
	if (!hasAny) return inputUrl;

	try {
		// Prefer absolute parsing; if inputUrl is relative, provide a base
		const base = typeof window !== 'undefined' && window.location?.origin
			? window.location.origin
			: 'https://example.com';
		const url = new URL(inputUrl, base);
		const search = url.searchParams;

		if (configured.utm_source) search.set('utm_source', configured.utm_source);
		if (configured.utm_medium) search.set('utm_medium', configured.utm_medium);
		if (configured.utm_campaign)
			search.set('utm_campaign', configured.utm_campaign);
		if (configured.utm_term) search.set('utm_term', configured.utm_term);
		if (configured.utm_content)
			search.set('utm_content', configured.utm_content);

		// If inputUrl was relative (starts with '/'), return a relative string
		if (inputUrl.startsWith('/')) {
			const path = url.pathname + (url.search ? `?${url.searchParams.toString()}` : '');
			const hash = url.hash || '';
			return `${path}${hash}`;
		}

		// Preserve hash and other parts — URL.toString() keeps them
		return url.toString();
	} catch {
		// If URL parsing fails, fall back to original input
		return inputUrl;
	}
};

export default appendUtmParams;
