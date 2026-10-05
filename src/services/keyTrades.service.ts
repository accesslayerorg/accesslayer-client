import { BaseApiService, type APIResponse } from './api.service';

export type KeyTradeSide = 'buy' | 'sell';

/** Normalized public trade returned by GET /keys/:keyId/trades. */
export interface KeyTrade {
	id: string;
	keyId: string;
	walletAddress: string;
	type: KeyTradeSide;
	quantity: number;
	price?: number;
	timestamp: number;
	transactionHash?: string | null;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
	return typeof value === 'object' && value !== null
		? (value as UnknownRecord)
		: {};
}

function asPositiveNumber(value: unknown): number | undefined {
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function normalizeTimestamp(value: unknown): number {
	if (typeof value === 'number' && Number.isFinite(value)) {
		// Unix seconds are occasionally returned by backend jobs.
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

function normalizeSide(value: unknown): KeyTradeSide {
	return String(value ?? '').toLowerCase() === 'sell' ? 'sell' : 'buy';
}

/**
 * Normalize the small set of historical response shapes used by the key
 * activity endpoint so the UI never has to know backend field aliases.
 */
export function normalizeKeyTrade(value: unknown, keyId: string, index = 0): KeyTrade {
	const raw = asRecord(value);
	const timestamp = normalizeTimestamp(
		raw.timestamp ?? raw.createdAt ?? raw.tradedAt ?? raw.time
	);
	const rawType = raw.tradeType ?? raw.type ?? raw.side;
	const transactionHash = raw.transactionHash ?? raw.txHash ?? raw.hash;

	return {
		id: String(raw.id ?? raw.tradeId ?? transactionHash ?? `${keyId}-${timestamp}-${index}`),
		keyId: String(raw.keyId ?? keyId),
		walletAddress: String(
			raw.walletAddress ?? raw.traderAddress ?? raw.wallet ?? raw.trader ?? 'Unknown wallet'
		),
		type: normalizeSide(rawType),
		quantity:
			asPositiveNumber(raw.quantity ?? raw.amount ?? raw.shares) ?? 0,
		price: asPositiveNumber(raw.price ?? raw.pricePerKey),
		timestamp,
		transactionHash:
			typeof transactionHash === 'string' ? transactionHash : null,
	};
}

export function normalizeKeyTrades(value: unknown, keyId: string): KeyTrade[] {
	const data = asRecord(value).trades ?? asRecord(value).data ?? value;
	const trades = Array.isArray(data) ? data : [];

	return trades
		.map((trade, index) => normalizeKeyTrade(trade, keyId, index))
		.sort((a, b) => b.timestamp - a.timestamp);
}

class KeyTradeService extends BaseApiService {
	async getKeyTrades(keyId: string, limit = 5): Promise<KeyTrade[]> {
		try {
			const response = await this.api.get<APIResponse<unknown>>(
				`/keys/${encodeURIComponent(keyId)}/trades`,
				{ params: { limit } }
			);
			return normalizeKeyTrades(response.data.data, keyId).slice(0, limit);
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const keyTradeService = new KeyTradeService();

export function fetchKeyTrades(keyId: string, limit = 5): Promise<KeyTrade[]> {
	return keyTradeService.getKeyTrades(keyId, limit);
}
