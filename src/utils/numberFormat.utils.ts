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

	return new Intl.NumberFormat(undefined, {
		notation: style === 'compact' ? 'compact' : 'standard',
		compactDisplay: 'short',
		maximumFractionDigits: resolvedMaximumFractionDigits,
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

