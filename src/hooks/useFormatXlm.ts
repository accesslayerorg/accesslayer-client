import { STROOPS_PER_XLM } from '@/constants/stellar';

export interface FormatXlmOptions {
	/** Number of decimal places to display. Defaults to 2. */
	decimals?: number;
}

/**
 * Formats a bigint stroop amount without ever passing through `number`,
 * so values beyond Number.MAX_SAFE_INTEGER keep every digit. The whole-XLM
 * part is formatted by Intl (which accepts bigint natively) for locale
 * grouping; the fractional digits are computed with integer arithmetic and
 * joined with the locale's decimal separator so output matches the number
 * path in any locale.
 */
function formatBigintXlm(stroops: bigint, decimals: number): string {
	const negative = stroops < 0n;
	const abs = negative ? -stroops : stroops;
	const stroopsPerXlm = BigInt(STROOPS_PER_XLM);
	const scale = 10n ** BigInt(decimals);

	// Round half up on the last displayed digit, mirroring Intl's rounding
	const scaled = (abs * scale + stroopsPerXlm / 2n) / stroopsPerXlm;
	const whole = scaled / scale;
	const fraction = scaled % scale;

	const wholeStr = new Intl.NumberFormat(undefined, {
		useGrouping: true,
	}).format(whole);

	const sign = negative && scaled !== 0n ? '-' : '';

	if (decimals === 0) {
		return `${sign}${wholeStr}`;
	}

	const decimalSeparator =
		new Intl.NumberFormat(undefined, { minimumFractionDigits: 1 })
			.formatToParts(1.1)
			.find(part => part.type === 'decimal')?.value ?? '.';

	const fractionStr = fraction.toString().padStart(decimals, '0');

	return `${sign}${wholeStr}${decimalSeparator}${fractionStr}`;
}

/**
 * Converts a stroop amount to a formatted XLM string.
 *
 * Accepts both `number` and `bigint` stroops. Bigint inputs are formatted
 * with integer arithmetic end to end, so amounts above
 * `Number.MAX_SAFE_INTEGER` render with full precision and never fall back
 * to scientific notation. Negative amounts (either type) format with a
 * leading minus sign.
 *
 * @param stroops - Amount in stroops (1 XLM = 10,000,000 stroops)
 * @param options - Formatting options
 * @returns Formatted XLM string, e.g. "1.50" for 15,000,000 stroops
 *
 * @example
 * formatXlm(10_000_000)           // "1.00"
 * formatXlm(10_000_000n)          // "1.00"
 * formatXlm(10_000_000, { decimals: 0 })  // "1"
 * formatXlm(15_000_000, { decimals: 7 })  // "1.5000000"
 */
export function formatXlm(
	stroops: number | bigint,
	options: FormatXlmOptions = {}
): string {
	const { decimals = 2 } = options;

	if (typeof stroops === 'bigint') {
		return formatBigintXlm(stroops, decimals);
	}

	const xlm = stroops / STROOPS_PER_XLM;

	return new Intl.NumberFormat(undefined, {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
		useGrouping: true,
	}).format(xlm);
}

/**
 * Hook that exposes a formatXlm formatter bound to the app locale.
 *
 * Returns a stable `format` function that converts a stroop amount to a
 * locale-aware XLM string.
 *
 * @example
 * const { format } = useFormatXlm();
 * format(10_000_000)              // "1.00"
 * format(10_000_000, { decimals: 0 })  // "1"
 */
export function useFormatXlm() {
	return { format: formatXlm };
}
