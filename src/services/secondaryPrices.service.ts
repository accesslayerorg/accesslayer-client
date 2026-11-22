import { BaseApiService, type APIResponse } from './api.service';

export type SecondaryPriceRange = '7d' | '30d' | 'all';

/** One secondary-market trade point from GET /keys/:keyId/secondary_prices. */
export interface SecondaryPricePoint {
	/** Trade time as a unix-ms timestamp. */
	timestamp: number;
	/** Trade price per fraction, in XLM. */
	price: number;
	/** Trade size (fractions) for the transaction. */
	volume: number;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
	return typeof value === 'object' && value !== null
		? (value as UnknownRecord)
		: {};
}

function asNumber(value: unknown, fallback = 0): number {
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeTimestamp(value: unknown): number {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value < 1_000_000_000_000 ? value * 1_000 : value;
	}
	if (typeof value === 'string') {
		const numericValue = Number(value);
		if (Number.isFinite(numericValue) && value.trim() !== '') {
			return normalizeTimestamp(numericValue);
		}
		const parsed = new Date(value).getTime();
		if (Number.isFinite(parsed)) return parsed;
	}
	return Date.now();
}

export function normalizeSecondaryPricePoint(
	value: unknown
): SecondaryPricePoint {
	const raw = asRecord(value);
	return {
		timestamp: normalizeTimestamp(
			raw.timestamp ?? raw.createdAt ?? raw.tradedAt ?? raw.time
		),
		price: asNumber(raw.price ?? raw.pricePerFraction ?? raw.tradePrice),
		volume: asNumber(raw.volume ?? raw.quantity ?? raw.amount ?? raw.size),
	};
}

export function normalizeSecondaryPrices(value: unknown): SecondaryPricePoint[] {
	const data =
		asRecord(value).prices ?? asRecord(value).trades ?? asRecord(value).data ?? value;
	const rows = Array.isArray(data) ? data : [];

	return rows
		.map(normalizeSecondaryPricePoint)
		.sort((a, b) => a.timestamp - b.timestamp);
}

class SecondaryPricesService extends BaseApiService {
	async getSecondaryPrices(
		keyId: string,
		range: SecondaryPriceRange = '7d'
	): Promise<SecondaryPricePoint[]> {
		try {
			const response = await this.api.get<APIResponse<unknown>>(
				`/keys/${encodeURIComponent(keyId)}/secondary_prices`,
				{ params: { range } }
			);
			return normalizeSecondaryPrices(response.data.data);
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const secondaryPricesService = new SecondaryPricesService();

export function fetchSecondaryPrices(
	keyId: string,
	range: SecondaryPriceRange = '7d'
): Promise<SecondaryPricePoint[]> {
	return secondaryPricesService.getSecondaryPrices(keyId, range);
}
