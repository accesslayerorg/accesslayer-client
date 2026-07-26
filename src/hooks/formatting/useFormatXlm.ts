import { useMemo } from 'react';
import { STROOPS_PER_XLM } from '@/constants/stellar';

/**
 * Formats an XLM amount for display with locale-aware thousands separators and a
 * configurable number of decimal places.
 *
 * Accepts either:
 * - a `number`, treated as an already-denominated XLM value (e.g. `12.5` XLM), or
 * - a `bigint`, treated as a raw stroop count and converted to XLM using the
 *   same `STROOPS_PER_XLM` factor the rest of the codebase relies on
 *   (see `keyPriceDisplay.utils.ts`). Using `bigint` division here preserves the
 *   fractional part without the precision loss a naive `Number(amount)` would
 *   introduce for large stroop values.
 *
 * The `'en-US'` locale is pinned deliberately so separator/precision output is
 * deterministic across environments (matching the issue's stated example).
 */
export function useFormatXlm(amount: bigint | number, decimals = 2): string {
	return useMemo(() => {
		let xlm: number;

		if (typeof amount === 'bigint') {
			const perXlm = BigInt(STROOPS_PER_XLM);
			const whole = amount / perXlm;
			const fraction = amount % perXlm;
			xlm = Number(whole) + Number(fraction) / STROOPS_PER_XLM;
		} else {
			xlm = amount;
		}

		if (!Number.isFinite(xlm)) return '—';

		return new Intl.NumberFormat('en-US', {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		}).format(xlm);
	}, [amount, decimals]);
}
