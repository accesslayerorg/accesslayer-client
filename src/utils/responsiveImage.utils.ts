export const RESPONSIVE_IMAGE_WIDTHS = [64, 128, 256, 512, 1024] as const;

export type ImageFormat = 'avif' | 'webp' | 'jpeg';

/**
 * Builds a variant image URL for a given width and format.
 * Preserves existing search params and handles data URLs/SVGs safely.
 */
export function buildResponsiveImageUrl(
	url: string,
	width: number,
	format?: ImageFormat
): string {
	if (!url) return '';
	if (
		url.startsWith('data:') ||
		url.startsWith('blob:') ||
		url.endsWith('.svg') ||
		url.includes('.svg?')
	) {
		return url;
	}

	try {
		const isAbsolute = url.startsWith('http://') || url.startsWith('https://');
		const base = isAbsolute ? undefined : 'https://example.local';
		const parsed = new URL(url, base);
		parsed.searchParams.set('w', String(width));
		if (format) {
			parsed.searchParams.set('format', format);
		}
		if (isAbsolute) {
			return parsed.toString();
		}
		return `${parsed.pathname}${parsed.search}${parsed.hash}`;
	} catch {
		const separator = url.includes('?') ? '&' : '?';
		const formatParam = format ? `&format=${format}` : '';
		return `${url}${separator}w=${width}${formatParam}`;
	}
}

/**
 * Generates srcset string for a format across widths [64, 128, 256, 512, 1024].
 */
export function buildSrcSet(
	url: string,
	format?: ImageFormat,
	widths: readonly number[] = RESPONSIVE_IMAGE_WIDTHS
): string {
	if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.endsWith('.svg')) {
		return '';
	}
	return widths
		.map(w => `${buildResponsiveImageUrl(url, w, format)} ${w}w`)
		.join(', ');
}

export const DEFAULT_IMAGE_SIZES = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 1024px';
