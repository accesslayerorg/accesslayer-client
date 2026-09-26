import { STROOPS_PER_XLM } from '@/constants/stellar';
import {
	formatDisplayKeyPrice,
	resolveCreatorKeyPriceStroops,
	type CreatorKeyPriceFields,
} from '@/utils/keyPriceDisplay.utils';
import {
	DEFAULT_BONDING_CURVE_PARAMS,
	computeBondingCurvePrice,
	type BondingCurveParams,
} from '@/utils/bondingCurve.utils';

/**
 * Price + supply fields needed to value a creator key against the bonding
 * curve. `Course` records satisfy this shape structurally, so the same
 * resolvers can be pointed at either a held position or its creator.
 */
export interface BondingCurvePriceFields extends CreatorKeyPriceFields {
	/** Live bonding-curve supply (number of keys minted). */
	currentSupply?: number | null;
	/** Alias accepted from `Course` records so creators resolve directly. */
	creatorShareSupply?: number | null;
	/** Per-creator curve base price override (stroops at zero supply). */
	curveBasePriceStroops?: number | null;
	/** Per-creator curve growth factor override. */
	curveGrowthFactor?: number | null;
}

export interface HeldKeyPosition extends BondingCurvePriceFields {
	creatorId: string;
	quantity: number | null | undefined;
	/**
	 * Weighted-average purchase price (cost basis per key) in stroops for this
	 * position (#935). This is the denominator of the unrealised P&L: it is
	 * persisted per key position and re-weighted on every new buy, so repeated
	 * buys at different curve prices converge on the true average entry price.
	 *
	 * `null`/absent means the position has no known cost basis, in which case
	 * the P&L is withheld rather than guessed.
	 */
	averagePurchasePriceStroops?: number | null;
	frozenQuantity?: number | null;
	liquidQuantity?: number | null;
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
 * Normalises a per-key cost basis value, rejecting nulls, non-finite numbers
 * and non-positive prices so a malformed payload can never produce a negative
 * or `NaN` invested amount.
 */
const normalizeCostBasisStroops = (value: number | null | undefined) => {
	if (value == null || !Number.isFinite(value) || value <= 0) {
		return null;
	}

	return value;
};

const resolveSupply = (position: BondingCurvePriceFields) => {
	const supply = position.currentSupply ?? position.creatorShareSupply;

	if (supply == null || !Number.isFinite(supply) || supply < 0) {
		return null;
	}

	return supply;
};

/**
 * Resolves the bonding-curve parameters to use for a key, falling back to the
 * platform defaults whenever a creator-specific override is absent or invalid.
 */
export function resolveBondingCurveParams(
	position: BondingCurvePriceFields
): BondingCurveParams {
	const basePriceStroops = normalizeCostBasisStroops(
		position.curveBasePriceStroops
	);

	return {
		basePriceStroops:
			basePriceStroops ?? DEFAULT_BONDING_CURVE_PARAMS.basePriceStroops,
		growthFactor:
			normalizeCostBasisStroops(position.curveGrowthFactor) ??
			DEFAULT_BONDING_CURVE_PARAMS.growthFactor,
	};
}

/**
 * Whether a position carries enough information to evaluate the bonding curve
 * locally. A curve cannot be reconstructed from supply alone — its shape needs
 * both the base price and the growth factor — so a position that only reports
 * supply is priced from the live quote instead.
 */
function hasResolvableCurveParams(
	position: BondingCurvePriceFields
): boolean {
	return (
		normalizeCostBasisStroops(position.curveBasePriceStroops) != null &&
		normalizeCostBasisStroops(position.curveGrowthFactor) != null
	);
}

/**
 * Resolves the live bonding-curve *sell* price for a key, in stroops.
 *
 * A holder can only exit at the price the curve quotes, so that quote is what
 * the position is worth today. It is resolved in two steps:
 *
 * 1. When the position carries both curve parameters and live supply, the
 *    price is evaluated on the bonding curve itself, so it always tracks the
 *    curve as supply moves.
 * 2. Otherwise the price reported by the contract for the key is used. That
 *    report is itself the curve's current sell quote, so the two paths agree.
 */
export function resolveCurrentSellPriceStroops(
	position: BondingCurvePriceFields
): number | null {
	const supply = resolveSupply(position);

	if (supply != null && hasResolvableCurveParams(position)) {
		const priceStroops = computeBondingCurvePrice(
			supply,
			resolveBondingCurveParams(position)
		);

		if (Number.isFinite(priceStroops) && priceStroops > 0) {
			return Math.round(priceStroops);
		}
	}

	return resolveCreatorKeyPriceStroops(position);
}

/**
 * Resolves the average purchase price to display for a position (#935).
 *
 * Precedence is deliberate: server-provided cost basis wins, then the locally
 * tracked cost basis, and finally the current sell price. Seeding from the
 * current sell price means a position synced without cost history starts at
 * zero P&L and accrues from the live curve price, instead of being withheld
 * forever.
 */
export function resolveAveragePurchasePriceStroops(
	position: HeldKeyPosition,
	trackedAveragePurchasePriceStroops?: number | null
): number | null {
	return (
		normalizeCostBasisStroops(position.averagePurchasePriceStroops) ??
		normalizeCostBasisStroops(trackedAveragePurchasePriceStroops) ??
		resolveCurrentSellPriceStroops(position)
	);
}

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
		position => resolveCurrentSellPriceStroops(position) == null
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
		const priceStroops = resolveCurrentSellPriceStroops(position);

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
 * Calculates the total value (in stroops) for a single held key position,
 * valued at the live bonding-curve sell price.
 */
export function calculatePositionTotalValue(
	position: HeldKeyPosition
): number | null {
	const priceStroops = resolveCurrentSellPriceStroops(position);
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

export type PositionPnLStatus = 'ready' | 'loading' | 'unavailable';

export interface PositionPnL {
	/** Keys held in this position. */
	quantity: number;
	/** Weighted-average purchase price per key, in stroops. */
	averagePurchasePriceStroops: number | null;
	/** Total XLM originally paid for the keys still held, in stroops. */
	costBasisStroops: number | null;
	/** Live bonding-curve sell price per key, in stroops. */
	currentPriceStroops: number | null;
	/** What the position would return if sold now, in stroops. */
	currentValueStroops: number | null;
	/** `currentValueStroops - costBasisStroops`, in stroops. */
	unrealisedPnLStroops: number | null;
	/** Unrealised P&L as a percentage of the cost basis. */
	pnlPercentage: number | null;
	status: PositionPnLStatus;
}

const buildEmptyPositionPnL = (
	quantity: number,
	averagePurchasePriceStroops: number | null,
	currentPriceStroops: number | null,
	status: PositionPnLStatus
): PositionPnL => ({
	quantity,
	averagePurchasePriceStroops,
	costBasisStroops: null,
	currentPriceStroops,
	currentValueStroops: null,
	unrealisedPnLStroops: null,
	pnlPercentage: null,
	status,
});

/**
 * Calculates the unrealised P&L for a single held position (#935).
 *
 * Unrealised P&L is the difference between what the keys would fetch if sold at
 * the current bonding-curve sell price and what was originally paid for them:
 *
 *   currentValue = currentSellPrice x quantity
 *   costBasis    = averagePurchasePrice x quantity
 *   P&L          = currentValue - costBasis
 *
 * When a position has no cost basis the P&L is withheld (`null`) rather than
 * reported as zero, so an unknown entry price is never mistaken for break-even.
 */
export function calculatePositionPnL(
	position: HeldKeyPosition
): PositionPnL {
	const quantity = normalizeHeldQuantity(position.quantity);
	const currentPriceStroops = resolveCurrentSellPriceStroops(position);
	const averagePurchasePriceStroops = normalizeCostBasisStroops(
		position.averagePurchasePriceStroops
	);

	if (quantity === 0) {
		return buildEmptyPositionPnL(
			quantity,
			averagePurchasePriceStroops,
			currentPriceStroops,
			'unavailable'
		);
	}

	if (position.isPriceLoading) {
		return buildEmptyPositionPnL(
			quantity,
			averagePurchasePriceStroops,
			currentPriceStroops,
			'loading'
		);
	}

	if (currentPriceStroops == null) {
		return buildEmptyPositionPnL(
			quantity,
			averagePurchasePriceStroops,
			currentPriceStroops,
			'unavailable'
		);
	}

	const currentValueStroops = Math.round(currentPriceStroops * quantity);

	if (averagePurchasePriceStroops == null) {
		return {
			...buildEmptyPositionPnL(quantity, null, currentPriceStroops, 'ready'),
			currentValueStroops,
		};
	}

	const costBasisStroops = Math.round(averagePurchasePriceStroops * quantity);
	const unrealisedPnLStroops = currentValueStroops - costBasisStroops;

	return {
		quantity,
		averagePurchasePriceStroops,
		costBasisStroops,
		currentPriceStroops,
		currentValueStroops,
		unrealisedPnLStroops,
		pnlPercentage:
			costBasisStroops > 0 ? (unrealisedPnLStroops / costBasisStroops) * 100 : 0,
		status: 'ready',
	};
}

export interface PnLSummary {
	totalInvested: number;
	currentValue: number;
	unrealisedPnL: number;
	pnlPercentage: number;
	/** Held positions in total, regardless of cost basis availability. */
	heldPositionCount: number;
	/** Positions that contributed to the P&L figures (cost basis known). */
	costBasisPositionCount: number;
	status: 'ready' | 'loading' | 'unavailable';
}

const buildEmptyPnLSummary = (
	status: PnLSummary['status'],
	heldPositionCount = 0
): PnLSummary => ({
	totalInvested: 0,
	currentValue: 0,
	unrealisedPnL: 0,
	pnlPercentage: 0,
	heldPositionCount,
	costBasisPositionCount: 0,
	status,
});

/**
 * Aggregates the portfolio's unrealised P&L across every held position.
 *
 * `totalInvested` and `currentValue` are both summed over the same set of
 * positions — those with a known cost basis — so the two figures are directly
 * comparable and `currentValue - totalInvested` is always the reported P&L.
 * Positions without a cost basis are counted in `heldPositionCount` but cannot
 * contribute a meaningful profit or loss, so they are excluded from the totals
 * rather than silently counted as break-even.
 */
export function calculatePnLSummary(
	positions: HeldKeyPosition[]
): PnLSummary {
	const heldPositions = positions.filter(
		position => normalizeHeldQuantity(position.quantity) > 0
	);

	if (heldPositions.length === 0) {
		return buildEmptyPnLSummary('ready');
	}

	if (heldPositions.some(position => position.isPriceLoading)) {
		return buildEmptyPnLSummary('loading', heldPositions.length);
	}

	if (
		heldPositions.some(position => resolveCurrentSellPriceStroops(position) == null)
	) {
		return buildEmptyPnLSummary('unavailable', heldPositions.length);
	}

	const pricedPositions = heldPositions
		.map(position => calculatePositionPnL(position))
		.filter(
			(pnl): pnl is PositionPnL & {
				costBasisStroops: number;
				currentValueStroops: number;
			} =>
				pnl.status === 'ready' &&
				pnl.costBasisStroops != null &&
				pnl.currentValueStroops != null
		);

	const totalInvested = pricedPositions.reduce(
		(total, pnl) => total + pnl.costBasisStroops,
		0
	);
	const currentValue = pricedPositions.reduce(
		(total, pnl) => total + pnl.currentValueStroops,
		0
	);
	const unrealisedPnL = currentValue - totalInvested;
	const pnlPercentage =
		totalInvested > 0 ? (unrealisedPnL / totalInvested) * 100 : 0;

	return {
		totalInvested,
		currentValue,
		unrealisedPnL,
		pnlPercentage,
		heldPositionCount: heldPositions.length,
		costBasisPositionCount: pricedPositions.length,
		status: 'ready',
	};
}

/**
 * Direction of a P&L value, used to colour it consistently across the UI:
 * green for a gain, red for a loss, neutral for break-even or unknown.
 */
export type PnLTone = 'positive' | 'negative' | 'neutral';

export function getPnLTone(pnl: number | null | undefined): PnLTone {
	if (pnl == null || !Number.isFinite(pnl) || pnl === 0) {
		return 'neutral';
	}

	return pnl > 0 ? 'positive' : 'negative';
}

const PNL_TONE_TEXT_CLASS_NAMES: Record<PnLTone, string> = {
	positive: 'text-emerald-400',
	negative: 'text-red-400',
	neutral: 'text-white',
};

const PNL_TONE_CHIP_CLASS_NAMES: Record<PnLTone, string> = {
	positive: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
	negative: 'border-red-500/30 bg-red-500/10 text-red-400',
	neutral: 'border-white/10 bg-white/5 text-white/70',
};

/**
 * Tailwind text-colour class for a P&L value. Kept as a class-string map (not a
 * composed `cn()` result) so Tailwind's static class extraction keeps both the
 * green and the red variants in the stylesheet.
 */
export function getPnLToneClassName(pnl: number | null | undefined): string {
	return PNL_TONE_TEXT_CLASS_NAMES[getPnLTone(pnl)];
}

/** Border/background/text chip classes for a P&L badge. */
export function getPnLToneChipClassName(pnl: number | null | undefined): string {
	return PNL_TONE_CHIP_CLASS_NAMES[getPnLTone(pnl)];
}

export function formatPnLDisplay(pnl: number): string {
	const xlm = pnl / STROOPS_PER_XLM;
	if (xlm === 0) return '0.00 XLM';
	const sign = xlm > 0 ? '+' : '';
	return `${sign}${xlm.toFixed(2)} XLM`;
}

export function formatPnLPercentage(percentage: number): string {
	if (percentage === 0) return '0%';
	const sign = percentage >= 0 ? '+' : '';
	return `${sign}${percentage.toFixed(1)}%`;
}
