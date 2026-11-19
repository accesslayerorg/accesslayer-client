import { formatCompactNumber } from '@/utils/numberFormat.utils';

/** A limit is only enforced when it is a finite, positive number (#1160). */
export function hasTradeLimit(limit: number | null | undefined): limit is number {
	return limit != null && Number.isFinite(limit) && limit > 0;
}

/**
 * Caps a raw amount input at the configured trade limit (#1160).
 * Blank or non-numeric input passes through so the usual validation messages
 * still apply while the user is typing.
 */
export function clampTradeAmountInput(
	value: string,
	limit: number | null | undefined
): string {
	if (!hasTradeLimit(limit) || value.trim() === '') return value;

	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return value;

	return parsed > limit ? String(limit) : value;
}

/** True once the entered amount has reached the per-swap limit (#1160). */
export function isTradeLimitReached(
	amount: number,
	limit: number | null | undefined
): boolean {
	return hasTradeLimit(limit) && Number.isFinite(amount) && amount >= limit;
}

/** Compact display for limits, e.g. `1.5K` or `10K` (#1160). */
export function formatTradeLimit(limit: number): string {
	return formatCompactNumber(limit);
}
