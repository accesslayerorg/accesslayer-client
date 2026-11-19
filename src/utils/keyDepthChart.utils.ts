import type {
	KeyDepthLevel,
	KeyDepthSnapshot,
} from '@/services/keyDepth.service';

/**
 * A single plotted price level of the depth chart.
 *
 * Bid levels carry a cumulative bid volume and a null ask volume; ask levels
 * are the mirror image. The nulls are what create the gap between the two
 * ladders around the mid price.
 */
export interface DepthChartPoint {
	/** Price level on the x-axis, in XLM per fraction. */
	price: number;
	/** Cumulative bid volume at (and above) this level; null on the ask side. */
	bidVolume: number | null;
	/** Cumulative ask volume at (and above) this level; null on the bid side. */
	askVolume: number | null;
	/** Volume resting exactly at this level (bid side). */
	bidAmount: number;
	/** Volume resting exactly at this level (ask side). */
	askAmount: number;
	/** Which side of the book the level belongs to. */
	side: 'bid' | 'ask';
}

/** Everything the depth chart needs in order to render. */
export interface DepthChartModel {
	/** Plotted levels, ascending by price. */
	points: DepthChartPoint[];
	/** Highest bid price, in XLM. */
	bestBid: number | null;
	/** Lowest ask price, in XLM. */
	bestAsk: number | null;
	/** Mid price between the best bid and the best ask, in XLM. */
	midPrice: number | null;
	/** Absolute spread between the best ask and the best bid, in XLM. */
	spread: number | null;
	/** Spread as a percentage of the mid price. */
	spreadPercent: number | null;
	/** Total volume resting on the bid side. */
	totalBidVolume: number;
	/** Total volume resting on the ask side. */
	totalAskVolume: number;
	/** Largest cumulative volume on either side; drives the y-axis scale. */
	maxCumulativeVolume: number;
	/** Price bounds of the plotted domain, symmetric around the mid price. */
	domain: [number, number];
}

const EMPTY_MODEL: DepthChartModel = {
	points: [],
	bestBid: null,
	bestAsk: null,
	midPrice: null,
	spread: null,
	spreadPercent: null,
	totalBidVolume: 0,
	totalAskVolume: 0,
	maxCumulativeVolume: 0,
	domain: [0, 0],
};

/** Keeps the levels that can be plotted: a positive price and resting volume. */
function plottableLevels(levels: KeyDepthLevel[]): KeyDepthLevel[] {
	return levels.filter(
		level =>
			Number.isFinite(level.price) &&
			level.price > 0 &&
			Number.isFinite(level.volume) &&
			level.volume > 0
	);
}

/**
 * Builds the cumulative ladders.
 *
 * Bids are walked from the best (highest) price downwards and asks from the
 * best (lowest) price upwards, so the running total at a level is the volume
 * that can be filled by walking the book towards that level.
 */
function buildLadder(
	levels: KeyDepthLevel[],
	side: 'bid' | 'ask'
): DepthChartPoint[] {
	let cumulative = 0;

	return levels.map(level => {
		cumulative += level.volume;

		return {
			price: level.price,
			bidVolume: side === 'bid' ? cumulative : null,
			askVolume: side === 'ask' ? cumulative : null,
			bidAmount: side === 'bid' ? level.volume : 0,
			askAmount: side === 'ask' ? level.volume : 0,
			side,
		};
	});
}

/**
 * Turns a depth snapshot into the series rendered by the depth chart.
 *
 * The two ladders are merged into a single price-ascending series so the
 * chart can use one numeric x-axis: bids sit to the left of the mid price and
 * asks to the right, each drawn as a cumulative step area. The plotted domain
 * is symmetric around the mid price, which keeps the mid marker exactly at the
 * centre of the chart.
 */
export function buildDepthChartModel(
	snapshot: KeyDepthSnapshot | null | undefined
): DepthChartModel {
	if (!snapshot) return EMPTY_MODEL;

	// Bids are walked from the best (highest) price downwards and asks from
	// the best (lowest) price upwards, so the ladders are sorted here rather
	// than relying on the caller to hand them over in order.
	const bids = plottableLevels(snapshot.bids ?? []).sort(
		(a, b) => b.price - a.price
	);
	const asks = plottableLevels(snapshot.asks ?? []).sort(
		(a, b) => a.price - b.price
	);

	if (bids.length === 0 && asks.length === 0) return EMPTY_MODEL;

	const bidPoints = buildLadder(bids, 'bid');
	const askPoints = buildLadder(asks, 'ask');

	const points = [...bidPoints, ...askPoints].sort((a, b) => a.price - b.price);

	const bestBid = bids.length > 0 ? bids[0].price : null;
	const bestAsk = asks.length > 0 ? asks[0].price : null;

	const derivedMid =
		bestBid != null && bestAsk != null ? (bestBid + bestAsk) / 2 : null;
	const midPrice = derivedMid ?? snapshot.midPrice ?? bestBid ?? bestAsk ?? null;

	const derivedSpread =
		bestBid != null && bestAsk != null ? bestAsk - bestBid : null;
	const spread = derivedSpread ?? snapshot.spread ?? null;

	const spreadPercent =
		spread != null && midPrice != null && midPrice !== 0
			? (spread / midPrice) * 100
			: null;

	const lastBidPoint = bidPoints[bidPoints.length - 1];
	const lastAskPoint = askPoints[askPoints.length - 1];
	const totalBidVolume = lastBidPoint?.bidVolume ?? 0;
	const totalAskVolume = lastAskPoint?.askVolume ?? 0;

	const maxCumulativeVolume = Math.max(totalBidVolume, totalAskVolume);

	const prices = points.map(point => point.price);
	const minPrice = Math.min(...prices);
	const maxPrice = Math.max(...prices);

	// Symmetric domain around the mid price: the green ladder and the red
	// ladder get the same horizontal space, so the mid marker lands exactly at
	// the centre of the plot.
	let halfWidth = 0;
	if (midPrice != null) {
		halfWidth = Math.max(midPrice - minPrice, maxPrice - midPrice);
	}

	if (halfWidth <= 0) {
		const reference = midPrice ?? maxPrice;
		halfWidth = Math.max(reference, 1) * 0.01;
	}

	const domain: [number, number] =
		midPrice != null
			? [midPrice - halfWidth, midPrice + halfWidth]
			: [minPrice, maxPrice];

	return {
		points,
		bestBid,
		bestAsk,
		midPrice,
		spread,
		spreadPercent,
		totalBidVolume,
		totalAskVolume,
		maxCumulativeVolume,
		domain,
	};
}

/**
 * Formats a per-fraction price for display.
 *
 * Sub-XLM prices keep four decimals so small quotes stay readable; anything
 * from 1 XLM up is shown with two.
 */
export function formatDepthPrice(value: number | null | undefined): string {
	if (value == null || !Number.isFinite(value)) return '—';

	const magnitude = Math.abs(value);
	const decimals = magnitude > 0 && magnitude < 1 ? 4 : 2;

	return `${value.toLocaleString(undefined, {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	})} XLM`;
}

/**
 * Formats a price for an axis tick, without the currency suffix.
 */
export function formatDepthPriceTick(value: number | null | undefined): string {
	if (value == null || !Number.isFinite(value)) return '';

	const magnitude = Math.abs(value);
	const decimals = magnitude > 0 && magnitude < 1 ? 4 : 2;

	return value.toLocaleString(undefined, {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	});
}
