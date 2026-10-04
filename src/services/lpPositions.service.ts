import { BaseApiService, type APIResponse } from './api.service';
import {
	parseLpLock,
	parseStroops,
	type LpLockInfo,
} from '@/utils/lpPositions.utils';

/**
 * Liquidity-provider positions API client (#1030).
 *
 * Reads the endpoints specified in accesslayer-server #980:
 * - `GET /lp/positions?wallet=`: every active LP position for a wallet
 * - `GET /lp/pool/:keyId`: pool size and APR estimate for a key pair
 *
 * Amounts arrive as i128 stroop values from the LP reward contract
 * (accesslayer-contracts #1002). They are normalised to `bigint` here so no
 * component ever handles them as floating point.
 *
 * Deliberately no `cacheManager` layer: after an add/claim/remove the hooks
 * invalidate React Query, and a second in-memory TTL cache here would serve
 * the pre-transaction values back to that refetch.
 */

/** Raw position as sent by the API. Fields are optional because we validate. */
export interface LpPositionApiRecord {
	lpId?: string | number;
	keyId?: string;
	keyName?: string | null;
	creatorId?: string | null;
	contribution?: string | number;
	share?: number | string | null;
	poolTotalLiquidity?: string | number | null;
	pendingRewards?: string | number | null;
	claimedRewards?: string | number | null;
	unlocksAt?: string | number | null;
}

/** A validated, display-ready LP position. */
export interface LpPosition {
	/** Contract `lp_id` (u64) as a decimal string. */
	lpId: string;
	/** Contract `key_id`: the creator key's Stellar address. */
	keyId: string;
	/** Display name for the pool / key. */
	keyName: string;
	/** App creator id for linking to `/creator/:id`, when the API knows it. */
	creatorId: string | null;
	contributionStroops: bigint;
	/** Contract-reported share in basis points (truncated), if provided. */
	shareBps: number | null;
	/** Total liquidity in this key's pool, for an exact share. */
	poolTotalLiquidityStroops: bigint | null;
	/** Unclaimed rewards; `null` when the API couldn't provide them. */
	pendingRewardsStroops: bigint | null;
	/** Rewards already claimed from this position, when reported. */
	claimedRewardsStroops: bigint | null;
	lock: LpLockInfo;
}

export interface LpPoolStats {
	keyId: string;
	totalLiquidityStroops: bigint | null;
	/** Current APR estimate in basis points, or `null` when unavailable. */
	aprBps: number | null;
}

interface LpPoolApiRecord {
	keyId?: string;
	totalLiquidity?: string | number | null;
	aprBps?: number | string | null;
}

type PositionsPayload =
	LpPositionApiRecord[] | { positions?: LpPositionApiRecord[] };

function parseLpId(value: unknown): string | null {
	if (typeof value === 'number') {
		return Number.isSafeInteger(value) && value >= 0 ? String(value) : null;
	}
	if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
		return value.trim();
	}
	return null;
}

function parseBps(value: unknown): number | null {
	const parsed =
		typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
	return typeof parsed === 'number' &&
		Number.isSafeInteger(parsed) &&
		parsed >= 0
		? parsed
		: null;
}

function shortKey(keyId: string): string {
	return keyId.length > 12 ? `${keyId.slice(0, 4)}…${keyId.slice(-4)}` : keyId;
}

/**
 * Validates one API record. Returns `null` for records missing an id, key,
 * or contribution, and for closed positions (the contract reports a closed
 * position with `contribution = 0`), so only active positions are listed.
 */
export function normalizeLpPosition(
	raw: LpPositionApiRecord
): LpPosition | null {
	const lpId = parseLpId(raw.lpId);
	const keyId = typeof raw.keyId === 'string' ? raw.keyId.trim() : '';
	const contributionStroops = parseStroops(raw.contribution);

	if (!lpId || !keyId || contributionStroops == null) return null;
	if (contributionStroops === 0n) return null;

	return {
		lpId,
		keyId,
		keyName: raw.keyName?.trim() || shortKey(keyId),
		creatorId: raw.creatorId?.trim() || null,
		contributionStroops,
		shareBps: parseBps(raw.share),
		poolTotalLiquidityStroops: parseStroops(raw.poolTotalLiquidity),
		pendingRewardsStroops: parseStroops(raw.pendingRewards),
		claimedRewardsStroops: parseStroops(raw.claimedRewards),
		lock: parseLpLock(raw.unlocksAt),
	};
}

class LpPositionsService extends BaseApiService {
	async getPositions(wallet: string): Promise<LpPosition[]> {
		try {
			const response = await this.api.get<APIResponse<PositionsPayload>>(
				'/lp/positions',
				{ params: { wallet } }
			);
			const payload = response.data.data;
			const records = Array.isArray(payload)
				? payload
				: Array.isArray(payload?.positions)
					? payload.positions
					: [];
			return records
				.map(normalizeLpPosition)
				.filter((position): position is LpPosition => position !== null);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async getPool(keyId: string): Promise<LpPoolStats> {
		try {
			const response = await this.api.get<APIResponse<LpPoolApiRecord>>(
				`/lp/pool/${encodeURIComponent(keyId)}`
			);
			const pool = response.data.data ?? {};
			return {
				keyId,
				totalLiquidityStroops: parseStroops(pool.totalLiquidity),
				aprBps: parseBps(pool.aprBps),
			};
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const lpPositionsService = new LpPositionsService();

/** Spy-friendly wrapper, mirroring `fetchStakingPositions`. */
export async function fetchLpPositions(wallet: string): Promise<LpPosition[]> {
	return lpPositionsService.getPositions(wallet);
}

export async function fetchLpPool(keyId: string): Promise<LpPoolStats> {
	return lpPositionsService.getPool(keyId);
}
