import { BaseApiService, type APIResponse } from './api.service';
import { STROOPS_PER_XLM } from '@/constants/stellar';

/**
 * One price level of the secondary-market order book.
 *
 * Prices are per fraction and expressed in XLM; volumes count the fractions
 * resting at the level.
 */
export interface KeyDepthLevel {
	/** Price per fraction, in XLM. */
	price: number;
	/** Volume resting at this level, in fractions. */
	volume: number;
}

/**
 * Normalized order-book snapshot for a key (#1220).
 *
 * `bids` are the open buy orders (best/highest price first) and `asks` are the
 * open sell listings (best/lowest price first).
 */
export interface KeyDepthSnapshot {
	/** Open buy orders, best (highest) price first. */
	bids: KeyDepthLevel[];
	/** Open sell listings, best (lowest) price first. */
	asks: KeyDepthLevel[];
	/** Server-reported mid price, when the backend provides one. */
	midPrice: number | null;
	/** Server-reported absolute spread, when the backend provides one. */
	spread: number | null;
}

/** Number of price levels requested per side of the book. */
export const KEY_DEPTH_LEVELS = 20;

type UnknownRecord = Record<string, unknown>;

/** Payload keys that may hold the bid ladder, in priority order. */
const BID_KEYS = ['bids', 'buyOrders', 'buys', 'buy', 'bid'] as const;

/** Payload keys that may hold the ask ladder, in priority order. */
const ASK_KEYS = [
	'asks',
	'sellOrders',
	'sells',
	'sell',
	'ask',
	'listings',
	'offers',
] as const;

function asRecord(value: unknown): UnknownRecord {
	return typeof value === 'object' && value !== null
		? (value as UnknownRecord)
		: {};
}

function asNumber(value: unknown, fallback = 0): number {
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function asOptionalNumber(value: unknown): number | null {
	if (value == null || value === '') return null;
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Reads a level price, accepting either XLM (`price`) or stroops
 * (`priceStroops`), and normalises it to XLM.
 */
function readLevelPrice(raw: UnknownRecord): number {
	const stroops = asOptionalNumber(raw.priceStroops);
	if (stroops != null) return stroops / STROOPS_PER_XLM;

	return asNumber(raw.price ?? raw.pricePerFraction ?? raw.rate);
}

/** Reads the resting volume of a level, in fractions. */
function readLevelVolume(raw: UnknownRecord): number {
	const volume =
		raw.volume ??
		raw.amount ??
		raw.quantity ??
		raw.size ??
		raw.total ??
		raw.fractions;

	return asNumber(volume);
}

/**
 * Normalises a single order-book level.
 *
 * Levels without a usable (positive) price carry no information for the
 * chart and are dropped; a level with no volume is kept so the snapshot still
 * reflects the book the server returned.
 */
export function normalizeDepthLevel(value: unknown): KeyDepthLevel | null {
	const raw = asRecord(value);
	const price = readLevelPrice(raw);

	if (!Number.isFinite(price) || price <= 0) return null;

	return { price, volume: Math.max(readLevelVolume(raw), 0) };
}

/** Sorts levels by price: descending for bids, ascending for asks. */
function sortLevels(
	levels: KeyDepthLevel[],
	direction: 'asc' | 'desc'
): KeyDepthLevel[] {
	return [...levels].sort((a, b) =>
		direction === 'asc' ? a.price - b.price : b.price - a.price
	);
}

/**
 * Reads a ladder that may be an array of levels or a price-keyed map
 * (`{ "1.05": 12 }`).
 */
function readLadder(
	payload: UnknownRecord,
	keys: readonly string[]
): KeyDepthLevel[] {
	for (const key of keys) {
		const value = payload[key];

		if (Array.isArray(value)) {
			return value
				.map(normalizeDepthLevel)
				.filter((level): level is KeyDepthLevel => level !== null);
		}

		if (value && typeof value === 'object') {
			return Object.entries(value as UnknownRecord)
				.map(([price, volume]) => normalizeDepthLevel({ price, volume }))
				.filter((level): level is KeyDepthLevel => level !== null);
		}
	}

	return [];
}

/**
 * Flattens the payload envelope so the ladders can be read regardless of
 * whether the backend nests them under `depth` / `orderBook` / `book`.
 */
function resolveDepthPayload(value: unknown): UnknownRecord {
	const root = asRecord(value);
	const nested = asRecord(root.depth ?? root.orderBook ?? root.book);

	if (Object.keys(nested).length === 0) return root;

	return { ...root, ...nested };
}

/** Reads the mid price the backend reports, when it reports one. */
function readMidPrice(payload: UnknownRecord): number | null {
	return asOptionalNumber(payload.midPrice ?? payload.mid ?? payload.lastPrice);
}

/** Reads the absolute spread the backend reports, when it reports one. */
function readSpread(payload: UnknownRecord): number | null {
	return asOptionalNumber(payload.spread ?? payload.spreadAmount);
}

/**
 * Normalises the raw depth payload into a {@link KeyDepthSnapshot}.
 *
 * Exported so the shape can be unit-tested without an HTTP round trip.
 */
export function normalizeKeyDepth(value: unknown): KeyDepthSnapshot {
	const payload = resolveDepthPayload(value);

	return {
		bids: sortLevels(readLadder(payload, BID_KEYS), 'desc'),
		asks: sortLevels(readLadder(payload, ASK_KEYS), 'asc'),
		midPrice: readMidPrice(payload),
		spread: readSpread(payload),
	};
}

class KeyDepthService extends BaseApiService {
	/**
	 * Order-book depth for a key — GET /keys/:keyId/depth?levels=20 (#1220).
	 *
	 * Returns the open buy orders (bids) and sell listings (asks) with the
	 * volume resting at each price level, normalised for the depth chart.
	 */
	async getKeyDepth(
		keyId: string,
		levels: number = KEY_DEPTH_LEVELS
	): Promise<KeyDepthSnapshot> {
		try {
			const response = await this.api.get<APIResponse<unknown>>(
				`/keys/${encodeURIComponent(keyId)}/depth`,
				{ params: { levels } }
			);

			return normalizeKeyDepth(response.data.data);
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const keyDepthService = new KeyDepthService();

export function fetchKeyDepth(
	keyId: string,
	levels: number = KEY_DEPTH_LEVELS
): Promise<KeyDepthSnapshot> {
	return keyDepthService.getKeyDepth(keyId, levels);
}
