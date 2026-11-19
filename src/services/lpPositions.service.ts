import { BaseApiService, type APIResponse } from './api.service';
import {
	parseLpLock,
	parseStroops,
	parseXlmInputToStroops,
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
	const keyRecord = raw as LpPositionApiRecord & KeyLpPositionApiRecord;
	const lpId =
		parseLpId(raw.lpId) ?? parsePositionId(keyRecord.id ?? keyRecord.lp_id);
	const keyId =
		(typeof raw.keyId === 'string' ? raw.keyId.trim() : '') ||
		firstString(keyRecord.key_id) ||
		'';
	const contributionStroops =
		parseStroops(raw.contribution) ??
		parseKeyAmount(keyRecord.lp_tokens ?? keyRecord.lpTokens);
	const keySharePct = parsePercent(
		keyRecord.pool_share_pct ?? keyRecord.poolSharePct
	);

	if (!lpId || !keyId || contributionStroops == null) return null;
	if (contributionStroops === 0n) return null;

	return {
		lpId,
		keyId,
		keyName:
			raw.keyName?.trim() ||
			firstString(keyRecord.key_name) ||
			shortKey(keyId),
		creatorId:
			raw.creatorId?.trim() || firstString(keyRecord.creator_id) || null,
		contributionStroops,
		shareBps:
			parseBps(raw.share) ??
			(keySharePct != null ? Math.round(keySharePct * 100) : null),
		poolTotalLiquidityStroops:
			parseStroops(raw.poolTotalLiquidity) ??
			parseKeyAmount(
				keyRecord.pool_total_liquidity ?? keyRecord.poolTotalLiquidity
			),
		pendingRewardsStroops:
			parseStroops(raw.pendingRewards) ??
			parseKeyAmount(keyRecord.accrued_rewards ?? keyRecord.accruedRewards),
		claimedRewardsStroops:
			parseStroops(raw.claimedRewards) ??
			parseKeyAmount(keyRecord.claimed_rewards ?? keyRecord.claimedRewards),
		lock: parseLpLock(
			raw.unlocksAt ?? keyRecord.unlocks_at ?? keyRecord.unlocksAt
		),
	};
}

// ---------------------------------------------------------------------------
// Key-scoped LP endpoint (#1276)
// ---------------------------------------------------------------------------

/**
 * Raw key-scoped LP record. The server snake_cases these fields; the camelCase
 * aliases keep the normalizer tolerant of proxied / already-mapped payloads.
 */
export interface KeyLpPositionApiRecord {
	id?: string | number | null;
	lp_id?: string | number | null;
	lpId?: string | number | null;
	positionId?: string | number | null;
	key_id?: string | null;
	keyId?: string | null;
	key_name?: string | null;
	keyName?: string | null;
	creator_id?: string | number | null;
	creatorId?: string | number | null;
	lp_tokens?: string | number | null;
	lpTokens?: string | number | null;
	contribution?: string | number | null;
	pool_share_pct?: string | number | null;
	poolSharePct?: string | number | null;
	share?: string | number | null;
	shareBps?: string | number | null;
	pool_total_liquidity?: string | number | null;
	poolTotalLiquidity?: string | number | null;
	accrued_rewards?: string | number | null;
	accruedRewards?: string | number | null;
	pending_rewards?: string | number | null;
	pendingRewards?: string | number | null;
	claimed_rewards?: string | number | null;
	claimedRewards?: string | number | null;
	claimable?: boolean | string | number | null;
	unlocks_at?: string | number | null;
	unlocksAt?: string | number | null;
	lock_until?: string | number | null;
	lockUntil?: string | number | null;
}

/** Normalized key-scoped LP position, compatible with `LpPosition`. */
export interface KeyLpPosition extends LpPosition {
	/** Alias for `lpId`, for callers that just want `position.id`. */
	id: string;
	/** Exact LP token / contribution amount in stroops. */
	lpTokensStroops: bigint;
	/** Alias retained for tests that use the snake_case name. */
	lpTokens: bigint;
	/** Reported pool share as a percentage (e.g. `12.5`). */
	poolSharePct: number | null;
	/** Exact accrued reward amount in stroops. */
	accruedRewardsStroops: bigint | null;
	/** Alias retained for tests that use the snake_case name. */
	accruedRewards: bigint | null;
	/** Whether the API says this position can be claimed now. */
	claimable: boolean;
}

export interface KeyLpClaimResult {
	success: boolean;
	claimedStroops: bigint | null;
	message: string | null;
}

type KeyPositionsPayload =
	| KeyLpPositionApiRecord[]
	| {
			positions?: KeyLpPositionApiRecord[] | null;
			lp_positions?: KeyLpPositionApiRecord[] | null;
			lpPositions?: KeyLpPositionApiRecord[] | null;
	  };

function firstString(...values: unknown[]): string | null {
	for (const value of values) {
		if (typeof value === 'string' && value.trim()) return value.trim();
	}
	return null;
}

function parsePositionId(value: unknown): string | null {
	if (typeof value === 'number') {
		return Number.isSafeInteger(value) && value >= 0 ? String(value) : null;
	}
	if (typeof value === 'string' && value.trim()) return value.trim();
	return null;
}

/** Parses integer stroops first, then plain XLM decimals from the key API. */
function parseKeyAmount(value: unknown): bigint | null {
	const stroops = parseStroops(value);
	if (stroops != null) return stroops;
	if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
		const parsed = parseXlmInputToStroops(value.toString());
		return typeof parsed === 'bigint' ? parsed : null;
	}
	if (typeof value === 'string') {
		const parsed = parseXlmInputToStroops(value);
		return typeof parsed === 'bigint' ? parsed : null;
	}
	return null;
}

function parsePercent(value: unknown): number | null {
	const parsed =
		typeof value === 'string'
			? Number(value.trim().replace(/%$/, ''))
			: value;
	if (typeof parsed !== 'number' || !Number.isFinite(parsed) || parsed < 0) {
		return null;
	}
	if (parsed <= 100) return parsed;
	return parsed <= 10_000 ? parsed / 100 : null;
}

function parseClaimable(
	value: unknown,
	rewardsStroops: bigint | null
): boolean {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'number' && Number.isFinite(value)) return value > 0;
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		if (['true', 'yes', 'y', '1'].includes(normalized)) return true;
		if (['false', 'no', 'n', '0', ''].includes(normalized)) return false;
		const numeric = Number(normalized);
		if (Number.isFinite(numeric)) return numeric > 0;
	}
	return rewardsStroops != null && rewardsStroops > 0n;
}

/**
 * Validates one `/keys/:id/lp/:wallet` record. Keeps positions with a zero
 * contribution when they still report rewards, since rewards can remain
 * claimable for a short window after the principal is withdrawn.
 */
export function normalizeKeyLpPosition(
	raw: KeyLpPositionApiRecord,
	keyId = ''
): KeyLpPosition | null {
	if (!raw || typeof raw !== 'object') return null;

	const resolvedKeyId =
		firstString(raw.key_id, raw.keyId, keyId)?.trim() ?? '';
	const lpTokensStroops =
		parseKeyAmount(raw.lp_tokens ?? raw.lpTokens ?? raw.contribution) ?? 0n;
	const accruedRewardsStroops = parseKeyAmount(
		raw.accrued_rewards ??
			raw.accruedRewards ??
			raw.pending_rewards ??
			raw.pendingRewards
	);
	const claimable = parseClaimable(raw.claimable, accruedRewardsStroops);
	const lpId =
		parsePositionId(raw.lp_id ?? raw.lpId ?? raw.id ?? raw.positionId) ??
		`${resolvedKeyId || 'key'}:${lpTokensStroops.toString()}`;

	const shareBpsFromApi = parseBps(raw.share ?? raw.shareBps);
	const poolSharePct =
		parsePercent(raw.pool_share_pct ?? raw.poolSharePct) ??
		(shareBpsFromApi != null ? shareBpsFromApi / 100 : null);
	const shareBps =
		shareBpsFromApi ??
		(poolSharePct != null ? Math.round(poolSharePct * 100) : null);

	const poolTotalLiquidityStroops =
		parseKeyAmount(raw.pool_total_liquidity ?? raw.poolTotalLiquidity) ??
		(shareBps != null && shareBps > 0
			? (lpTokensStroops * 10_000n) / BigInt(shareBps)
			: null);

	return {
		lpId,
		id: lpId,
		keyId: resolvedKeyId,
		keyName:
			firstString(raw.key_name, raw.keyName) || shortKey(resolvedKeyId),
		creatorId: firstString(raw.creator_id, raw.creatorId) ?? null,
		contributionStroops: lpTokensStroops,
		lpTokensStroops,
		lpTokens: lpTokensStroops,
		shareBps,
		poolSharePct,
		poolTotalLiquidityStroops,
		pendingRewardsStroops: accruedRewardsStroops,
		accruedRewardsStroops,
		accruedRewards: accruedRewardsStroops,
		claimedRewardsStroops: parseKeyAmount(
			raw.claimed_rewards ?? raw.claimedRewards
		),
		claimable,
		lock: parseLpLock(
			raw.unlocks_at ?? raw.unlocksAt ?? raw.lock_until ?? raw.lockUntil
		),
	};
}

/** Normalizes a whole key-scoped LP payload (array, `positions`, or `lp_positions`). */
export function normalizeKeyLpPositions(
	payload: unknown,
	keyId = ''
): KeyLpPosition[] {
	let records: unknown[] = [];
	if (Array.isArray(payload)) {
		records = payload;
	} else if (payload && typeof payload === 'object') {
		const value = payload as Exclude<
			KeyPositionsPayload,
			KeyLpPositionApiRecord[]
		>;
		const candidates = [
			value.positions,
			value.lp_positions,
			value.lpPositions,
		];
		const found = candidates.find(Array.isArray);
		if (found) records = found;
	}

	return records
		.map(record =>
			normalizeKeyLpPosition(record as KeyLpPositionApiRecord, keyId)
		)
		.filter((position): position is KeyLpPosition => position !== null);
}

/** Alias for callers using the singular `record` naming. */
export const normalizeKeyLpPositionRecord = normalizeKeyLpPosition;

/** Normalizes the claim response, tolerating bare and wrapped payloads. */
export function normalizeKeyLpClaim(value: unknown): KeyLpClaimResult {
	let payload = value;
	if (payload && typeof payload === 'object' && 'data' in payload) {
		const wrapped = payload as { data?: unknown };
		if (wrapped.data !== undefined && wrapped.data !== null) {
			payload = wrapped.data;
		}
	}
	if (typeof payload === 'boolean') {
		return { success: payload, claimedStroops: null, message: null };
	}
	if (payload == null) {
		return { success: true, claimedStroops: null, message: null };
	}
	if (typeof payload !== 'object') {
		return { success: true, claimedStroops: null, message: String(payload) };
	}

	const record = payload as Record<string, unknown>;
	const claimedStroops =
		parseKeyAmount(
			record.claimed_stroops ??
				record.claimedStroops ??
				record.claimed ??
				record.amount ??
				record.claimedRewards
		) ?? null;
	const message = firstString(record.message, record.status) ?? null;
	const success =
		typeof record.success === 'boolean'
			? record.success
			: message?.toLowerCase().includes('fail') !== true;

	return { success, claimedStroops, message };
}

/** Alias for callers that spell out `result`. */
export const normalizeKeyLpClaimResult = normalizeKeyLpClaim;

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

	async getKeyPositions(
		keyId: string,
		wallet: string
	): Promise<KeyLpPosition[]> {
		try {
			const response = await this.api.get<APIResponse<unknown>>(
				`/keys/${encodeURIComponent(keyId)}/lp/${encodeURIComponent(wallet)}`
			);
			return normalizeKeyLpPositions(response.data.data, keyId);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async claimKeyRewards(
		keyId: string,
		wallet: string
	): Promise<KeyLpClaimResult> {
		try {
			const response = await this.api.post<APIResponse<unknown>>(
				`/keys/${encodeURIComponent(keyId)}/lp/${encodeURIComponent(wallet)}/claim`
			);
			return normalizeKeyLpClaim(response.data.data ?? response.data);
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

/** Key-scoped polling source for #1276. */
export async function fetchKeyLpPositions(
	keyId: string,
	wallet: string
): Promise<KeyLpPosition[]> {
	return lpPositionsService.getKeyPositions(keyId, wallet);
}

/** Key-scoped claim action for #1276. */
export async function claimKeyLpRewards(
	keyId: string,
	wallet: string
): Promise<KeyLpClaimResult> {
	return lpPositionsService.claimKeyRewards(keyId, wallet);
}
