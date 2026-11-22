import { BaseApiService, type APIResponse } from './api.service';
import { cacheManager } from '@/utils/cache.utils';

/**
 * A single airdrop allocation for a held creator key, returned from
 * GET /users/:wallet/airdrop-claims.
 *
 * Each entry captures the snapshot that determined eligibility, the
 * total amount distributed by the creator, and the connected wallet's
 * share of that distribution. Claimed entries carry the received amount
 * and claim date so the history section can render them without a
 * second endpoint.
 */
export interface AirdropAllocation {
	/** Unique airdrop identifier used in the `claim_airdrop` call. */
	id: string;
	/** Creator key whose holders were snapshotted for this airdrop. */
	keyId: string;
	/** Human-readable key / creator name (e.g. "Alpha Key"). */
	keyName: string;
	/** ISO timestamp of the holder snapshot that determined eligibility. */
	snapshotDate: string;
	/** Total amount distributed to all holders, in XLM. */
	totalDistributed: number;
	/** The connected wallet's allocated share of the airdrop, in XLM. */
	userAllocation: number;
	/** Whether the connected wallet has already claimed this airdrop. */
	claimed: boolean;
	/** Amount actually received on claim, in XLM. Null until claimed. */
	receivedAmount: number | null;
	/** ISO timestamp of when the wallet claimed this airdrop. */
	claimedAt: string | null;
	/** Transaction hash of the successful `claim_airdrop` call, when known. */
	claimTxHash?: string | null;
}

/** Response envelope for the airdrop claims endpoint. */
export interface AirdropClaimsResponse {
	airdrops: AirdropAllocation[];
}

/** Parameters accepted by {@link AirdropClaimsService.getAirdropClaims}. */
export interface GetAirdropClaimsParams {
	wallet: string;
}

const AIRDROP_CLAIMS_CACHE_PREFIX = 'airdrop_claims_';
/** Cache for 15 s — claim status changes right after a successful
 *  `claim_airdrop` call, so keep the window short. */
const AIRDROP_CLAIMS_CACHE_TTL_MS = 15_000;

class AirdropClaimsService extends BaseApiService {
	async getAirdropClaims({
		wallet,
	}: GetAirdropClaimsParams): Promise<AirdropClaimsResponse> {
		const cacheKey = `${AIRDROP_CLAIMS_CACHE_PREFIX}${wallet}`;
		const cached = cacheManager.get<AirdropClaimsResponse>(cacheKey);
		if (cached) return cached;

		try {
			const response = await this.api.get<
				APIResponse<AirdropClaimsResponse>
			>(`/users/${wallet}/airdrop-claims`);

			const data = response.data.data;
			cacheManager.set(cacheKey, data, AIRDROP_CLAIMS_CACHE_TTL_MS);
			return data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const airdropClaimsService = new AirdropClaimsService();

/**
 * Convenience wrapper that can be spied on in tests without mocking the
 * service class instance directly.
 */
export async function fetchAirdropClaims(
	wallet: string
): Promise<AirdropClaimsResponse> {
	return airdropClaimsService.getAirdropClaims({ wallet });
}
