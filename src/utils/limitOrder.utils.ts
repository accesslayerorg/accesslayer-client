import type { LimitOrderSide } from '@/services/orders';

export function validateLimitOrderPrice(
	side: LimitOrderSide,
	targetPrice: number,
	currentPrice: number
): string | null {
	if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
		return 'Enter a target price greater than zero.';
	}
	if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
		return 'The current price is unavailable.';
	}
	if (side === 'buy' && targetPrice >= currentPrice) {
		return 'Buy target price must be below the current price.';
	}
	if (side === 'sell' && targetPrice <= currentPrice) {
		return 'Sell target price must be above the current price.';
	}
	return null;
}
