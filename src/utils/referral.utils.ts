/**
 * Referral programme helpers for the referral dashboard (#963).
 *
 * A referrer earns a share of the trading fee on their referred wallet's
 * *first* trade only. This module holds the link builder, the reward
 * aggregation math, and the programme-terms copy so the dashboard, the share
 * button, and the terms section all read from one source.
 *
 * All amounts are in XLM — the unit the referral API reports fees in.
 */

import type { ReferralSummary, ReferredWallet } from '@/services/referral.service';

/**
 * Share of a referred wallet's first-trade fee paid to the referrer, in basis
 * points (500 = 5%). Used as the fallback when the API does not report
 * `rewardBps`, and quoted in the programme-terms section.
 */
export const DEFAULT_REFERRAL_REWARD_BPS = 500;

/** Query parameter carrying the referrer's wallet on a shared link. */
export const REFERRAL_QUERY_PARAM = 'ref';

export interface ReferralLinkOptions {
	/** Referrer's wallet address. */
	wallet: string;
	/** Optional key id to deep-link a specific creator key. */
	keyId?: string | null;
	/** Origin to build an absolute link against. Defaults to `window.location.origin`. */
	origin?: string;
}

/**
 * Builds the shareable referral link for a wallet.
 *
 * Returns an empty string when no wallet is known so callers never render a
 * broken `?ref=` link for a disconnected user.
 */
export function buildReferralLink({
	wallet,
	keyId,
	origin,
}: ReferralLinkOptions): string {
	const trimmedWallet = wallet?.trim() ?? '';
	if (!trimmedWallet) return '';

	const base =
		origin ??
		(typeof window !== 'undefined' && window.location?.origin
			? window.location.origin
			: '');

	const path = keyId ? `/keys/${keyId}` : '/';
	const params = new URLSearchParams();
	params.set(REFERRAL_QUERY_PARAM, trimmedWallet);

	return `${base}${path}?${params.toString()}`;
}

/** Plain-text share caption used by the share button. */
export function buildReferralShareText(link: string): string {
	return `Join AccessLayer with my link and start trading creator keys: ${link}`;
}

export interface ReferralEarnings {
	/** Lifetime referral fees earned, in XLM. */
	totalEarnedXlm: number;
	/** Earned but not yet withdrawn, in XLM. */
	pendingXlm: number;
	/** Already withdrawn, in XLM. */
	claimedXlm: number;
	/** Referrer's share of a referred wallet's first-trade fee, in bps. */
	rewardBps: number;
	/** Number of wallets that joined through the referrer's links. */
	referredCount: number;
	/** Number of referred wallets that have completed a first trade. */
	convertedCount: number;
	/** Whether there is a non-zero balance available to claim. */
	hasClaimable: boolean;
}

function toNonNegative(value: number | null | undefined): number {
	if (value == null || !Number.isFinite(value) || value <= 0) return 0;
	return value;
}

/**
 * Aggregates a referral summary into the figures the earnings tracker renders.
 *
 * When the API does not report a pending balance, it is derived as
 * `totalEarned - claimed` so the tracker never shows a blank pending figure.
 */
export function aggregateReferralEarnings(
	summary: ReferralSummary | null | undefined
): ReferralEarnings {
	const totalEarnedXlm = toNonNegative(summary?.totalEarnedXlm);
	const claimedXlm = toNonNegative(summary?.claimedXlm);
	const pendingXlm =
		summary?.pendingXlm != null
			? toNonNegative(summary.pendingXlm)
			: Math.max(0, totalEarnedXlm - claimedXlm);

	const rewardBps =
		summary?.rewardBps != null && Number.isFinite(summary.rewardBps)
			? Math.abs(summary.rewardBps)
			: DEFAULT_REFERRAL_REWARD_BPS;

	return {
		totalEarnedXlm,
		pendingXlm,
		claimedXlm,
		rewardBps,
		referredCount: toNonNegative(summary?.referredCount),
		convertedCount: toNonNegative(summary?.convertedCount),
		hasClaimable: pendingXlm > 0,
	};
}

/**
 * Sums the per-wallet referral fees across a page of referred wallets.
 *
 * Used as a cross-check against the API's aggregate `totalEarnedXlm` so the
 * dashboard can reconcile the two.
 */
export function sumReferralRewards(
	wallets: Array<ReferredWallet | null | undefined>
): number {
	return wallets.reduce<number>((total, wallet) => {
		if (!wallet || wallet.rewardClaimed) return total;
		return total + toNonNegative(wallet.rewardXlm);
	}, 0);
}

/** Human-readable label for a referred wallet's lifecycle status. */
export function describeReferredWalletStatus(
	wallet: ReferredWallet | null | undefined
): string {
	if (!wallet) return 'Unknown';
	switch (wallet.status) {
		case 'rewarded':
			return 'Reward earned';
		case 'traded':
			return 'First trade done';
		case 'joined':
		default:
			return 'Joined — no trade yet';
	}
}

/** Ordered programme-terms rows explaining the fee structure. */
export function buildReferralTerms(rewardBps: number): string[] {
	const sharePercent = (rewardBps / 100).toFixed(
		rewardBps % 100 === 0 ? 0 : 1
	);

	return [
		`You earn ${sharePercent}% of the trading fee on the first trade of every wallet you refer.`,
		'Only the first trade counts. Later trades by the same wallet do not earn a referral reward.',
		'Rewards accrue in XLM and can be withdrawn at any time from this dashboard.',
		'Wallets that join but never trade do not earn a reward, but they still count towards your referral total.',
	];
}
