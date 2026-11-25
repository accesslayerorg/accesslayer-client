/**
 * Opt-in public portfolio rules (#1398): handle validation, visibility
 * settings and range display. The server enforces visibility on the public
 * endpoint; `applyPortfolioVisibility` mirrors it for "Preview as visitor".
 */

export interface PublicPortfolioSettings {
	/** Master toggle. Off ⇒ the public page returns 404. */
	enabled: boolean;
	showHoldings: boolean;
	showKeyCount: boolean;
	showPnl: boolean;
	showJoinDate: boolean;
	/** Show holding values as ranges instead of exact amounts. */
	useRanges: boolean;
}

export const DEFAULT_PUBLIC_PORTFOLIO_SETTINGS: PublicPortfolioSettings = {
	enabled: false,
	showHoldings: false,
	showKeyCount: false,
	showPnl: false,
	showJoinDate: false,
	useRanges: true,
};

export interface PortfolioHolding {
	keyId: string;
	keyName: string;
	/** Exact value in XLM; omitted from the public view when ranges are on. */
	valueXlm?: number;
	/** Range label such as "100–1K XLM" when exact values are hidden. */
	valueRange?: string;
}

export interface PublicPortfolio {
	handle: string;
	holdings?: PortfolioHolding[];
	keyCount?: number;
	pnlPercent?: number;
	joinedAt?: string;
}

export const RESERVED_HANDLES = new Set([
	'admin', 'api', 'app', 'creator', 'creators', 'explore', 'help', 'login',
	'logout', 'me', 'settings', 'signup', 'support', 'u', 'wallet', 'accesslayer',
]);

const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9_]{1,18}[a-z0-9])$/;

export type HandleError = 'format' | 'reserved' | 'taken';

/** Normalizes then validates a handle. `taken` is the server's availability answer. */
export function validateHandle(raw: string, taken = false): HandleError | null {
	const handle = raw.trim().toLowerCase();
	if (!HANDLE_PATTERN.test(handle)) return 'format';
	if (RESERVED_HANDLES.has(handle)) return 'reserved';
	if (taken) return 'taken';
	return null;
}

export const HANDLE_ERROR_MESSAGES: Record<HandleError, string> = {
	format: 'Use 3–20 lowercase letters, numbers or underscores, starting and ending with a letter or number.',
	reserved: 'This handle is reserved.',
	taken: 'This handle is already taken.',
};

const RANGE_BOUNDS = [10, 100, 1_000, 10_000, 100_000];

const compact = (n: number) => (n >= 1_000 ? `${n / 1_000}K` : `${n}`);

/** Buckets an exact XLM value into an order-of-magnitude range label. */
export function toValueRange(value: number): string {
	if (value < RANGE_BOUNDS[0]) return `<${RANGE_BOUNDS[0]} XLM`;
	for (let i = 1; i < RANGE_BOUNDS.length; i++) {
		if (value < RANGE_BOUNDS[i]) return `${compact(RANGE_BOUNDS[i - 1])}–${compact(RANGE_BOUNDS[i])} XLM`;
	}
	return `${compact(RANGE_BOUNDS[RANGE_BOUNDS.length - 1])}+ XLM`;
}

/** Returns only the fields a visitor may see, or null when the page is off. */
export function applyPortfolioVisibility(
	portfolio: PublicPortfolio,
	settings: PublicPortfolioSettings
): PublicPortfolio | null {
	if (!settings.enabled) return null;
	const view: PublicPortfolio = { handle: portfolio.handle };
	if (settings.showHoldings && portfolio.holdings) {
		view.holdings = portfolio.holdings.map(({ keyId, keyName, valueXlm, valueRange }) =>
			settings.useRanges
				? { keyId, keyName, valueRange: valueRange ?? (valueXlm !== undefined ? toValueRange(valueXlm) : undefined) }
				: { keyId, keyName, valueXlm }
		);
	}
	if (settings.showKeyCount) view.keyCount = portfolio.keyCount;
	if (settings.showPnl) view.pnlPercent = portfolio.pnlPercent;
	if (settings.showJoinDate) view.joinedAt = portfolio.joinedAt;
	return view;
}
