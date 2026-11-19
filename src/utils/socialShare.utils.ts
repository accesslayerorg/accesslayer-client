import { formatPercent } from '@/utils/numberFormat.utils';

export type SocialShareContext = 'key' | 'badge';

export interface KeyShareInput {
	context: 'key';
	keyName: string;
	priceXlm?: string | number | null;
	change24h?: number | null;
	url: string;
}

export interface BadgeShareInput {
	context: 'badge';
	badgeName: string;
	criteria: string;
	url: string;
}

export type SocialShareInput = KeyShareInput | BadgeShareInput;

/**
 * Builds the pre-filled share text for a key position or a badge
 * achievement (#1251): key name, current price and 24h change for keys;
 * badge name and criteria met for badges.
 */
export function buildSocialShareText(input: SocialShareInput): string {
	if (input.context === 'badge') {
		return `I just earned the "${input.badgeName}" badge on AccessLayer — ${input.criteria}. ${input.url}`;
	}

	const { keyName, priceXlm, change24h, url } = input;
	const hasPrice = priceXlm != null && String(priceXlm).trim() !== '';
	const hasChange = typeof change24h === 'number' && !Number.isNaN(change24h);

	let stats = '';
	if (hasPrice && hasChange) {
		stats = ` — ${priceXlm} XLM (${formatPercent(change24h as number, { signed: true })} 24h)`;
	} else if (hasPrice) {
		stats = ` — ${priceXlm} XLM`;
	} else if (hasChange) {
		stats = ` (${formatPercent(change24h as number, { signed: true })} 24h)`;
	}

	return `Check out ${keyName} on AccessLayer${stats}. ${url}`;
}

export function buildTwitterShareUrl(text: string, url: string): string {
	const params = new URLSearchParams({ text, url });
	return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function buildTelegramShareUrl(text: string, url: string): string {
	const params = new URLSearchParams({ url, text });
	return `https://t.me/share/url?${params.toString()}`;
}

export function openShareWindow(url: string): void {
	if (typeof window !== 'undefined') {
		window.open(url, '_blank', 'noopener,noreferrer');
	}
}
