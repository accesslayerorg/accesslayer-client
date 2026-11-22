import { BaseApiService, type APIResponse } from './api.service';
import { submitCreatorContractCall } from '@/hooks/useCreatorContractActions';
import type { ContentGateConfig } from '@/types/contentGate';
import { resolveContentGateType } from '@/utils/contentGate.utils';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
	return typeof value === 'object' && value !== null
		? (value as UnknownRecord)
		: {};
}

function asOptionalNumber(value: unknown): number | null {
	if (value == null || value === '') return null;
	const parsed = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return null;
	return parsed;
}

/**
 * Normalises the gate payload into a {@link ContentGateConfig}.
 *
 * A payload without a usable gate type means "no gate" — the content is
 * open until the creator configures otherwise.
 */
export function normalizeContentGateConfig(
	value: unknown
): ContentGateConfig {
	const raw = asRecord(value);
	const gateType = resolveContentGateType(
		raw.gateType ?? raw.gate_type ?? raw.type ?? raw.mode
	);

	return {
		gateType: gateType ?? 'none',
		thresholdAmount:
			gateType === 'threshold'
				? asOptionalNumber(
						raw.thresholdAmount ??
							raw.threshold_amount ??
							raw.threshold ??
							raw.minimumAmount ??
							raw.minimum_amount ??
							raw.minimumHolding ??
							raw.amount
					)
				: null,
	};
}

class ContentGateService extends BaseApiService {
	/**
	 * Current content gate configuration for a key:
	 * GET /keys/:keyId/gate (#1221).
	 */
	async getGateConfig(keyId: string): Promise<ContentGateConfig> {
		try {
			const response = await this.api.get<APIResponse<unknown>>(
				`/keys/${encodeURIComponent(keyId)}/gate`
			);

			return normalizeContentGateConfig(response.data.data);
		} catch (error) {
			const apiError = this.handleError(error);
			// The endpoint may not be deployed yet; an unconfigured key has no
			// gate, so the panel opens on "No Gate".
			if (apiError.status === 404) {
				return { gateType: 'none', thresholdAmount: null };
			}
			throw apiError;
		}
	}
}

export const contentGateService = new ContentGateService();

/**
 * Convenience wrapper for reading a key's content gate configuration.
 */
export function fetchContentGateConfig(
	keyId: string
): Promise<ContentGateConfig> {
	return contentGateService.getGateConfig(keyId);
}

/**
 * Submits the `set_gate` contract call for a key's content gate.
 */
export async function setContentGate(
	keyId: string,
	config: ContentGateConfig,
	wallet?: string
): Promise<{ success: true }> {
	return submitCreatorContractCall('set_gate', {
		creatorId: keyId,
		gateType: config.gateType,
		thresholdAmount: config.thresholdAmount,
		wallet,
	});
}
