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
