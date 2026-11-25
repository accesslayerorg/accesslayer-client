import type { BadgeStyle, EmbedConfig, EmbedMetric, EmbedTheme } from '@/types/embed.types';

const DEFAULT_ORIGIN = 'https://accesslayer.io';

export const BADGE_CACHE_HEADERS = {
	'Content-Type': 'image/svg+xml',
	'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
} as const;

/**
 * Escapes XML special characters for safe SVG rendering.
 * Time Complexity: O(n)
 * Space Complexity: O(n)
 */
function escapeXml(unsafe: string): string {
	return unsafe.replace(/[<>&'"]/g, (c) => {
		switch (c) {
			case '<':
				return '&lt;';
			case '>':
				return '&gt;';
			case '&':
				return '&amp;';
			case "'":
				return '&apos;';
			case '"':
				return '&quot;';
			default:
				return c;
		}
	});
}

/**
 * Generates an SVG badge string for key stats (price, holders, 24h change).
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export function generateSvgBadge(params: {
	label: string;
	value: string;
	style: BadgeStyle;
	theme: EmbedTheme;
}): string {
	const { label, value, style, theme } = params;
	const safeLabel = escapeXml(label);
	const safeValue = escapeXml(value);

	const labelWidth = Math.max(60, safeLabel.length * 7 + 16);
	const valueWidth = Math.max(55, safeValue.length * 7.5 + 16);
	const totalWidth = labelWidth + valueWidth;
	const height = style === 'for-the-badge' ? 28 : 20;
	const rx = style === 'flat' ? 3 : style === 'plastic' ? 4 : 0;

	const bgLeft = theme === 'dark' ? '#1e293b' : '#475569';
	const bgRight = theme === 'dark' ? '#f59e0b' : '#0284c7';
	const textLeft = '#ffffff';
	const textRight = theme === 'dark' ? '#0f172a' : '#ffffff';
	const fontSize = style === 'for-the-badge' ? 11 : 11;
	const yText = style === 'for-the-badge' ? 18 : 14;

	const gradient =
		style === 'plastic'
			? `<linearGradient id="b" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>`
			: '';
	const gradientOverlay =
		style === 'plastic' ? `<rect width="${totalWidth}" height="${height}" fill="url(#b)"/>` : '';

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${safeLabel}: ${safeValue}">
  <title>${safeLabel}: ${safeValue}</title>
  ${gradient}
  <clipPath id="r"><rect width="${totalWidth}" height="${height}" rx="${rx}" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="${bgLeft}"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="${height}" fill="${bgRight}"/>
    ${gradientOverlay}
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="${fontSize}">
    <text x="${labelWidth / 2}" y="${yText}" fill="${textLeft}">${safeLabel}</text>
    <text x="${labelWidth + valueWidth / 2}" y="${yText}" fill="${textRight}" font-weight="bold">${safeValue}</text>
  </g>
</svg>`;
}

/**
 * Builds the API badge image URL with query params.
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export function buildBadgeUrl(
	config: Pick<EmbedConfig, 'creatorKeyId' | 'metric' | 'style' | 'theme'>,
	origin: string = DEFAULT_ORIGIN
): string {
	const params = new URLSearchParams({
		metric: config.metric,
		style: config.style,
		theme: config.theme,
	});
	return `${origin}/api/badge/${encodeURIComponent(config.creatorKeyId)}?${params.toString()}`;
}

/**
 * Builds the widget iframe URL with theme and optional allowlist query params.
 * Time Complexity: O(k) where k is number of allowed domains
 * Space Complexity: O(k)
 */
export function buildWidgetIframeUrl(
	config: Pick<EmbedConfig, 'creatorKeyId' | 'theme' | 'allowedDomains'>,
	origin: string = DEFAULT_ORIGIN
): string {
	const params = new URLSearchParams({
		theme: config.theme,
	});
	if (config.allowedDomains.length > 0) {
		params.set('allow', config.allowedDomains.join(','));
	}
	return `${origin}/embed/widget/${encodeURIComponent(config.creatorKeyId)}?${params.toString()}`;
}

/**
 * Builds Markdown badge snippet.
 */
export function buildMarkdownSnippet(
	config: Pick<EmbedConfig, 'creatorKeyId' | 'creatorName' | 'metric' | 'style' | 'theme'>,
	origin: string = DEFAULT_ORIGIN
): string {
	const badgeUrl = buildBadgeUrl(config, origin);
	const keyUrl = `${origin}/keys/${encodeURIComponent(config.creatorKeyId)}`;
	const altText = `${config.creatorName} Key ${config.metric}`;
	return `[![${altText}](${badgeUrl})](${keyUrl})`;
}

/**
 * Builds HTML badge snippet.
 */
export function buildHtmlSnippet(
	config: Pick<EmbedConfig, 'creatorKeyId' | 'creatorName' | 'metric' | 'style' | 'theme'>,
	origin: string = DEFAULT_ORIGIN
): string {
	const badgeUrl = buildBadgeUrl(config, origin);
	const keyUrl = `${origin}/keys/${encodeURIComponent(config.creatorKeyId)}`;
	const altText = `${config.creatorName} Key ${config.metric}`;
	return `<a href="${keyUrl}" target="_blank" rel="noopener noreferrer"><img src="${badgeUrl}" alt="${altText}" /></a>`;
}

/**
 * Builds iframe widget snippet.
 */
export function buildIframeSnippet(
	config: Pick<EmbedConfig, 'creatorKeyId' | 'creatorName' | 'theme' | 'width' | 'height' | 'allowedDomains'>,
	origin: string = DEFAULT_ORIGIN
): string {
	const widgetUrl = buildWidgetIframeUrl(config, origin);
	return `<iframe src="${widgetUrl}" title="${config.creatorName} AccessLayer Key Widget" width="${config.width}" height="${config.height}" frameborder="0" scrolling="no" style="border-radius:12px;border:1px solid rgba(255,255,255,0.1);"></iframe>`;
}

/**
 * Validates whether a host domain is authorized by the widget allowlist.
 * Empty allowlist permits all domains.
 * Time Complexity: O(n) where n is allowlist length
 * Space Complexity: O(1)
 */
export function isDomainAllowed(domain: string, allowlist: string[]): boolean {
	if (!allowlist || allowlist.length === 0) return true;
	const normalized = domain.trim().toLowerCase();
	if (!normalized) return false;

	return allowlist.some((allowed) => {
		const pattern = allowed.trim().toLowerCase();
		if (!pattern) return false;
		if (pattern.startsWith('*.')) {
			const suffix = pattern.slice(1); // ".example.com"
			return normalized.endsWith(suffix) || normalized === pattern.slice(2);
		}
		return normalized === pattern;
	});
}

export function formatBadgeMetricLabel(metric: EmbedMetric): string {
	switch (metric) {
		case 'price':
			return 'Key Price';
		case 'holders':
			return 'Holders';
		case 'change24h':
			return '24h Change';
	}
}
