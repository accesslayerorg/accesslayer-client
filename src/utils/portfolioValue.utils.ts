import {
	formatDisplayKeyPrice,
	resolveCreatorKeyPriceStroops,
	type CreatorKeyPriceFields,
} from '@/utils/keyPriceDisplay.utils';

export interface HeldKeyPosition extends CreatorKeyPriceFields {
	creatorId: string;
	quantity: number | null | undefined;
	isPriceLoading?: boolean;
	isPriceStale?: boolean;
	pending?: boolean;
	last_buy_timestamp?: number | string | null;
	/**
	 * Unclaimed dividends (in XLM) accrued on this held position. When greater
	 * than zero the holding row surfaces a badge and a Reinvest action that
	 * compounds the balance back into more creator keys.
	 */
	unclaimedDividend?: number | null;
	/**
	 * Timestamp after which this user may next buy this key, enforcing a
	 * per-user buy cooldown (#873). `null`/absent means no cooldown is in
	 * effect. Populated by the backend/contract once a buy-cooldown concept
	 * lands there; the key detail page's countdown simply reflects whatever
	 * value is present here.
	 */
	nextBuyAllowedAt?: number | string | null;
}

export type PortfolioValueStatus = 'ready' | 'loading' | 'unavailable';

export interface PortfolioValueResult {
	status: PortfolioValueStatus;
	totalStroops: number | null;
	heldPositionCount: number;
	missingPriceCount: number;
	stalePriceCount: number;
}

const normalizeHeldQuantity = (quantity: number | null | undefined) => {
	if (quantity == null || !Number.isFinite(quantity) || quantity <= 0) {
		return 0;
	}

	return quantity;
};

/**
 * Aggregates the current portfolio value across all held creator-key positions.
 *
 * The helper intentionally withholds a partial total when any held position has
 * loading, missing, or stale price data so the UI never presents an incorrect
 * portfolio value as complete.
 */
export function calculatePortfolioValue(
	positions: HeldKeyPosition[]
): PortfolioValueResult {
	const heldPositions = positions.filter(
		position => normalizeHeldQuantity(position.quantity) > 0
	);

	if (heldPositions.length === 0) {
		return {
			status: 'ready',
			totalStroops: 0,
			heldPositionCount: 0,
			missingPriceCount: 0,
			stalePriceCount: 0,
		};
	}

	const missingPriceCount = heldPositions.filter(
		position => resolveCreatorKeyPriceStroops(position) == null
	).length;
	const stalePriceCount = heldPositions.filter(
		position => position.isPriceStale
	).length;

	if (heldPositions.some(position => position.isPriceLoading)) {
		return {
			status: 'loading',
			totalStroops: null,
			heldPositionCount: heldPositions.length,
			missingPriceCount,
			stalePriceCount,
		};
	}

	if (missingPriceCount > 0 || stalePriceCount > 0) {
		return {
			status: 'unavailable',
			totalStroops: null,
			heldPositionCount: heldPositions.length,
			missingPriceCount,
			stalePriceCount,
		};
	}

	const totalStroops = heldPositions.reduce((total, position) => {
		const priceStroops = resolveCreatorKeyPriceStroops(position);

		return (
			total + (priceStroops ?? 0) * normalizeHeldQuantity(position.quantity)
		);
	}, 0);

	return {
		status: 'ready',
		totalStroops,
		heldPositionCount: heldPositions.length,
		missingPriceCount: 0,
		stalePriceCount: 0,
	};
}

export function formatPortfolioValueDisplay(result: PortfolioValueResult) {
	if (result.status === 'loading') {
		return 'Loading prices…';
	}

	if (result.status === 'unavailable') {
		return 'Unavailable';
	}

	return formatDisplayKeyPrice(result.totalStroops);
}

export function getPortfolioValueHelperText(result: PortfolioValueResult) {
	if (result.status === 'loading') {
		return 'Refreshing key prices before calculating your total.';
	}

	if (result.status === 'unavailable') {
		if (result.stalePriceCount > 0) {
			return 'One or more held positions has stale price data. Refresh prices to show the total.';
		}

		return 'One or more held positions is missing current price data.';
	}

	if (result.heldPositionCount === 0) {
		return 'No held creator keys yet.';
	}

	return `Across ${result.heldPositionCount} held creator ${result.heldPositionCount === 1 ? 'position' : 'positions'}.`;
}

/**
 * Calculates the total value (in stroops) for a single held key position.
 */
export function calculatePositionTotalValue(
	position: HeldKeyPosition
): number | null {
	const priceStroops = resolveCreatorKeyPriceStroops(position);
	const quantity = normalizeHeldQuantity(position.quantity);

	if (priceStroops == null || quantity === 0) {
		return null;
	}

	return priceStroops * quantity;
}

/**
 * Sorts held key positions by total value in descending order.
 * Positions with equal total values maintain a stable secondary sort by creator ID.
 */
export function sortHoldingsByTotalValue(
	positions: HeldKeyPosition[]
): HeldKeyPosition[] {
	return [...positions].sort((a, b) => {
		const aValue = calculatePositionTotalValue(a) ?? 0;
		const bValue = calculatePositionTotalValue(b) ?? 0;

		// Primary sort: descending by total value
		if (bValue !== aValue) {
			return bValue - aValue;
		}

		// Secondary sort: stable by creator ID for equal values
		return a.creatorId.localeCompare(b.creatorId);
	});
}

export interface PnLSummary {
	totalInvested: number;
	currentValue: number;
	unrealisedPnL: number;
	pnlPercentage: number;
	status: 'ready' | 'loading' | 'unavailable';
}

/**
 * Calculates PnL summary for portfolio holdings.
 * Note: costBasis is not available in the current data model, so totalInvested
 * is computed as currentValue (assuming positions were bought at current price).
 * This results in 0 PnL until cost basis data is added to the data model.
 */
export function calculatePnLSummary(
	positions: HeldKeyPosition[]
): PnLSummary {
	const heldPositions = positions.filter(
		position => normalizeHeldQuantity(position.quantity) > 0
	);

	if (heldPositions.length === 0) {
		return {
			totalInvested: 0,
			currentValue: 0,
			unrealisedPnL: 0,
			pnlPercentage: 0,
			status: 'ready',
		};
	}

	if (heldPositions.some(position => position.isPriceLoading)) {
		return {
			totalInvested: 0,
			currentValue: 0,
			unrealisedPnL: 0,
			pnlPercentage: 0,
			status: 'loading',
		};
	}

	const hasMissingPrices = heldPositions.some(
		position => resolveCreatorKeyPriceStroops(position) == null
	);
	if (hasMissingPrices) {
		return {
			totalInvested: 0,
			currentValue: 0,
			unrealisedPnL: 0,
			pnlPercentage: 0,
			status: 'unavailable',
		};
	}

	const currentValue = heldPositions.reduce((total, position) => {
		const priceStroops = resolveCreatorKeyPriceStroops(position);
		return total + (priceStroops ?? 0) * normalizeHeldQuantity(position.quantity);
	}, 0);

	// TODO: Replace with actual costBasis when available in data model
	const totalInvested = currentValue;
	const unrealisedPnL = currentValue - totalInvested;
	const pnlPercentage = totalInvested > 0 ? (unrealisedPnL / totalInvested) * 100 : 0;

	return {
		totalInvested,
		currentValue,
		unrealisedPnL,
		pnlPercentage,
		status: 'ready',
	};
}

export function formatPnLDisplay(pnl: number): string {
	const xlm = pnl / 10_000_000;
	if (xlm === 0) return '0.00 XLM';
	const sign = xlm > 0 ? '+' : '';
	return `${sign}${xlm.toFixed(2)} XLM`;
}

export function formatPnLPercentage(percentage: number): string {
	if (percentage === 0) return '0%';
	const sign = percentage >= 0 ? '+' : '';
	return `${sign}${percentage.toFixed(1)}%`;
}
