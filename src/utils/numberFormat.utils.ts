export type NumberFormatStyle = 'full' | 'compact';

export interface FormatNumberOptions {
	style?: NumberFormatStyle;
	maximumFractionDigits?: number;
	minimumFractionDigits?: number;
}

function getNumberFormatter({
	style = 'full',
	maximumFractionDigits,
	minimumFractionDigits,
}: FormatNumberOptions) {
	const resolvedMaximumFractionDigits =
		maximumFractionDigits ?? (style === 'compact' ? 1 : 2);
	const resolvedMinimumFractionDigits = minimumFractionDigits ?? 0;

	// Ensure minimumFractionDigits does not exceed maximumFractionDigits
	const finalMaximumFractionDigits = Math.max(
		resolvedMaximumFractionDigits,
		resolvedMinimumFractionDigits
	);

	return new Intl.NumberFormat(undefined, {
		notation: style === 'compact' ? 'compact' : 'standard',
		compactDisplay: 'short',
		maximumFractionDigits: finalMaximumFractionDigits,
		minimumFractionDigits: resolvedMinimumFractionDigits,
	});
}

export function formatNumber(
	value: number | null | undefined,
	options: FormatNumberOptions = {}
): string {
	if (value == null) return '—';
	if (!Number.isFinite(value)) return '—';
	return getNumberFormatter(options).format(value);
}

export function formatCompactNumber(
	value: number | null | undefined,
	options: Omit<FormatNumberOptions, 'style'> = {}
): string {
	return formatNumber(value, { ...options, style: 'compact' });
}

/**
 * Formats an XLM price with two decimal places.
 */
export function formatXlmPrice(value: number | null | undefined): string {
	if (value == null || !Number.isFinite(value)) return '0.00 XLM';
	const formatted = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
		useGrouping: false,
	}).format(value);
	return `${formatted} XLM`;
}


/**
 * Formats holder counts for compact display across creator profile surfaces.
 *
 * - Below 1,000: plain string (e.g. `999`)
 * - 1,000–999,999: one decimal K suffix (e.g. `1.2K`, `1K` at exactly 1,000)
 * - 1,000,000+: one decimal M suffix (e.g. `2.4M`, `1M` at exactly 1,000,000)
 */
export function formatHolderCount(count: number): string {
	if (count >= 1_000_000) {
		return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
	}
	if (count >= 1_000) {
		return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
	}
	return count.toString();
}

export function formatFollowerCount(count: number): string {
	return formatHolderCount(count);
}

export interface FormatPercentOptions {
	/** Maximum fractional digits in the rendered value. Defaults to 2. */
	maximumFractionDigits?: number;
	/** Minimum fractional digits. Defaults to 0 so whole-number values render cleanly. */
	minimumFractionDigits?: number;
	/**
	 * Prefix positive values with `+` so badges read `+12.5%` / `-3.4%`.
	 * Defaults to false.
	 */
	signed?: boolean;
	/** Placeholder rendered when the value is missing or non-finite. Defaults to `—`. */
	emptyPlaceholder?: string;
}

/**
 * Formats a percentage value for badges and chips with consistent precision.
 *
 * Treats the input as a percentage (i.e. `12.5` renders as `12.5%`, not `1250%`).
 * Edge cases are stable: `null`, `undefined`, `NaN`, and `Infinity` all render
 * as the placeholder; values smaller than the requested precision are rounded
 * (the previous hand-rolled `toFixed(2)` behavior) so badges never show
 * scientific notation.
 */
export function formatPercent(
	value: number | null | undefined,
	options: FormatPercentOptions = {}
): string {
	const {
		maximumFractionDigits = 2,
		minimumFractionDigits = 0,
		signed = false,
		emptyPlaceholder = '—',
	} = options;

	if (value == null || !Number.isFinite(value)) {
		return emptyPlaceholder;
	}

	const formatted = new Intl.NumberFormat(undefined, {
		maximumFractionDigits,
		minimumFractionDigits,
	}).format(value);

	const sign = signed && value > 0 ? '+' : '';
	return `${sign}${formatted}%`;
}

/**
 * Converts basis points (bps) to a percentage string (e.g. 500 -> "5%", 250 -> "2.5%").
 */
export function bpsToPercent(
	bps: number | null | undefined,
	options: FormatPercentOptions = {}
): string {
	if (bps == null || !Number.isFinite(bps)) {
		return options.emptyPlaceholder ?? '—';
	}
	return formatPercent(bps / 100, options);
}
