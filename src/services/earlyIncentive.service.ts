import { BaseApiService, type APIResponse } from './api.service';

/** Early funding incentive returned by GET /keys/:keyId/early-incentive. */
export interface EarlyIncentive {
	/** Bonus yield in basis points granted to early investors. */
	bonusBps: number;
	/** Remaining early funding slots; 0 means every slot is taken. */
	slotsRemaining: number;
	/** Total early funding slots, when the API reports it. */
	slotsTotal?: number;
	/** False when the key has no early incentive configured. */
	configured: boolean;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
	return typeof value === 'object' && value !== null
		? (value as UnknownRecord)
		: {};
}

function asNonNegativeInt(value: unknown): number {
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

/**
 * Normalize the early-incentive payload so the UI never depends on
 * backend field aliases (slots_remaining vs slotsRemaining, etc.).
 */
export function normalizeEarlyIncentive(value: unknown): EarlyIncentive {
	const raw = asRecord(value);
	const bonusBps = asNonNegativeInt(raw.bonusBps ?? raw.bonus_bps ?? raw.bps);
	const slotsRemaining = asNonNegativeInt(
		raw.slotsRemaining ?? raw.slots_remaining ?? raw.remainingSlots
	);
	const slotsTotalRaw =
		raw.slotsTotal ?? raw.slots_total ?? raw.totalSlots ?? undefined;
	const slotsTotal =
		slotsTotalRaw === undefined || slotsTotalRaw === null
			? undefined
			: asNonNegativeInt(slotsTotalRaw);

	const configuredFlag = raw.configured ?? raw.isConfigured ?? raw.active;
	const configured =
		typeof configuredFlag === 'boolean'
			? configuredFlag
			: bonusBps > 0 || slotsRemaining > 0 || Boolean(slotsTotal);

	return {
		bonusBps,
		slotsRemaining,
		...(slotsTotal !== undefined ? { slotsTotal } : {}),
		configured,
	};
}

class EarlyIncentiveService extends BaseApiService {
	async getEarlyIncentive(keyId: string): Promise<EarlyIncentive> {
		try {
			const response = await this.api.get<APIResponse<unknown>>(
				`/keys/${encodeURIComponent(keyId)}/early-incentive`
			);
			return normalizeEarlyIncentive(response.data.data);
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const earlyIncentiveService = new EarlyIncentiveService();

export function fetchEarlyIncentive(keyId: string): Promise<EarlyIncentive> {
	return earlyIncentiveService.getEarlyIncentive(keyId);
}
