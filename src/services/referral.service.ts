// src/services/referral.service.ts
import { BaseApiService, type APIResponse } from './api.service';
import { cacheManager } from '@/utils/cache.utils';

/**
 * Lifecycle status of a referred wallet.
 *
 * A referral only earns once the referred wallet completes its *first* trade,
 * so wallets that have joined but not traded are still `joined`.
 */
export type ReferredWalletStatus = 'joined' | 'traded' | 'rewarded';

/** A wallet that signed up through a user's referral link (#963). */
export interface ReferredWallet {
	/** The referred wallet address. */
	address: string;
	/** Optional display name resolved by the backend. */
	displayName?: string | null;
	/** ISO timestamp of when the wallet joined through the referral link. */
	joinedAt: string;
	/** Current referral lifecycle status. */
	status: ReferredWalletStatus;
	/** ISO timestamp of the referred wallet's first trade, when it has one. */
	firstTradeAt?: string | null;
	/** Referral fee earned from this wallet's first trade, in XLM. */
	rewardXlm?: number | null;
	/** Whether this referral's fee has already been claimed. */
	rewardClaimed?: boolean;
}

/** Cursor-paginated envelope for the referred-wallet list. */
export interface ReferredWalletsPage {
	wallets: ReferredWallet[];
	nextCursor: string | null;
}

/**
 * Aggregated referral earnings for a wallet (#963).
 *
 * `totalEarnedXlm` is the lifetime sum of every referral fee credited to the
 * wallet; `pendingXlm` is the portion not yet withdrawn.
 */
export interface ReferralSummary {
	/** Wallet the referral programme is registered to. */
	wallet: string;
	/** Public referral code, used to build shareable links. */
	referralCode?: string | null;
	/** Number of wallets that joined through this wallet's links. */
	referredCount?: number | null;
	/** Number of referred wallets that have completed a first trade. */
	convertedCount?: number | null;
	/** Lifetime referral fees earned, in XLM. */
	totalEarnedXlm?: number | null;
	/** Referral fees earned but not yet withdrawn, in XLM. */
	pendingXlm?: number | null;
	/** Referral fees already withdrawn, in XLM. */
	claimedXlm?: number | null;
	/** Share of the referred wallet's first-trade fee paid to the referrer, in bps. */
	rewardBps?: number | null;
}

const REFERRAL_CACHE_PREFIX = 'referral_';
const REFERRAL_SUMMARY_TTL_MS = 15_000;

class ReferralService extends BaseApiService {
	/**
	 * Referral programme summary for a wallet - GET /referrals/:wallet/summary.
	 *
	 * Cached for 15s because the earnings tracker is polled by the dashboard;
	 * `invalidateReferralSummary` drops it after a claim.
	 */
	async getReferralSummary(wallet: string): Promise<ReferralSummary> {
		const cacheKey = `${REFERRAL_CACHE_PREFIX}summary_${wallet}`;
		const cached = cacheManager.get<ReferralSummary>(cacheKey);
		if (cached) return cached;

		try {
			const response = await this.api.get<APIResponse<ReferralSummary>>(
				`/referrals/${wallet}/summary`
			);
			const data = response.data.data;
			cacheManager.set(cacheKey, data, REFERRAL_SUMMARY_TTL_MS);
			return data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * One cursor-paginated page of referred wallets - GET /referrals/:wallet/wallets.
	 */
	async getReferredWallets(
		wallet: string,
		cursor?: string | null
	): Promise<ReferredWalletsPage> {
		try {
			const response = await this.api.get<
				APIResponse<ReferredWalletsPage>
			>(`/referrals/${wallet}/wallets`, {
				params: cursor ? { cursor } : undefined,
			});

			const data = response.data.data;
			return {
				wallets: Array.isArray(data?.wallets) ? data.wallets : [],
				nextCursor: data?.nextCursor ?? null,
			};
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** Drops the cached summary for a wallet after a successful claim. */
	invalidateReferralSummary(wallet: string): void {
		cacheManager.invalidate(`${REFERRAL_CACHE_PREFIX}summary_${wallet}`);
	}
}

export const referralService = new ReferralService();

/**
 * Convenience wrapper for fetching a page of referred wallets.
 * Exposed as a plain function to facilitate test spying.
 */
export async function fetchReferredWalletsPage(
	wallet: string,
	cursor: string | null | undefined
): Promise<ReferredWalletsPage> {
	return referralService.getReferredWallets(wallet, cursor);
}
