/**
 * Price impact calculation for the key simulation tool (#887).
 *
 * impact = (simulated_price - spot_price) / spot_price * 100
 */

export function calculatePriceImpact(
	simulatedPrice: number,
	spotPrice: number
): number {
	if (!spotPrice) return 0;
	return ((simulatedPrice - spotPrice) / spotPrice) * 100;
}

export function formatPriceImpact(impact: number): string {
	if (impact === 0) return '0.00%';
	if (impact > 0) return `+${impact.toFixed(2)}%`;
	return `${impact.toFixed(2)}%`;
}
