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
