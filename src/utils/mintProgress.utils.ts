/**
 * Pure calculation helpers for creator key mint progress and supply cap.
 */

export interface MintProgressResult {
	/** Whether a max supply cap is configured and valid (> 0). */
	isCapped: boolean;
	/** Safe normalized current supply (>= 0). */
	currentSupply: number;
	/** Configured max supply cap, or null if uncapped. */
	maxSupply: number | null;
	/** Remaining mintable keys before cap is hit (maxSupply - currentSupply, never negative). */
	remaining: number;
	/** Progress percentage clamped to 0–100. */
	percentage: number;
	/** User-facing percentage string. Never shows 100% unless currentSupply >= maxSupply. */
	percentageLabel: string;
	/** True when currentSupply >= maxSupply. */
	isAtCap: boolean;
}

/**
 * Format mint progress as a safe percentage string.
 *
 * Requirements:
 * - Clamp between 0% and 100%
 * - Safe divide-by-zero
 * - Sensible rounding: never show 100% unless supply has actually reached the cap
 * - Handles tiny fractions cleanly (e.g. 0.05%, <0.01%)
 */
export function formatMintPercentage(current: number, max: number): string {
	if (max <= 0 || !Number.isFinite(max)) return '0%';
	if (current >= max) return '100%';
	if (current <= 0 || !Number.isFinite(current)) return '0%';

	const raw = (current / max) * 100;

	if (raw >= 100) return '100%';

	// Tiny fractions (< 1%)
	if (raw < 1) {
		const formatted = parseFloat(raw.toFixed(2));
		if (formatted <= 0) return '<0.01%';
		return `${formatted}%`;
	}

	// Between 1% and 100%: ensure we never round up to 100% prematurely
	const rounded = Math.round(raw);
	if (rounded >= 100) {
		return '99.9%';
	}
	return `${rounded}%`;
}

/**
 * Computes mint progress and supply cap state from current and max supply.
 *
 * An uncapped key has null, undefined, or <= 0 max supply.
 */
export function calculateMintProgress(
	currentSupply?: number | null,
	maxSupply?: number | null
): MintProgressResult {
	const safeMax =
		maxSupply != null && Number.isFinite(maxSupply) && maxSupply > 0
			? maxSupply
			: null;
	const isCapped = safeMax !== null;
	const safeCurrent =
		currentSupply != null && Number.isFinite(currentSupply) && currentSupply > 0
			? currentSupply
			: 0;

	if (!isCapped) {
		return {
			isCapped: false,
			currentSupply: safeCurrent,
			maxSupply: null,
			remaining: 0,
			percentage: 0,
			percentageLabel: '0%',
			isAtCap: false,
		};
	}

	const remaining = Math.max(0, safeMax - safeCurrent);
	const isAtCap = safeCurrent >= safeMax;
	const rawPercentage = (safeCurrent / safeMax) * 100;
	const percentage = Math.min(100, Math.max(0, rawPercentage));
	const percentageLabel = formatMintPercentage(safeCurrent, safeMax);

	return {
		isCapped: true,
		currentSupply: safeCurrent,
		maxSupply: safeMax,
		remaining,
		percentage,
		percentageLabel,
		isAtCap,
	};
}
