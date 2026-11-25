import { ApiError } from './api.service';
import { cacheManager } from '@/utils/cache.utils';
import { royaltyService, type RoyaltyEarningsSummary } from './royalty.service';
import { tipService } from './tip.service';
import { keySubscriptionContractService } from './keySubscriptionContract.service';
import { spotlightAuctionService } from './spotlightAuction.service';
import { submitCreatorContractCall } from '@/hooks/useCreatorContractActions';
import { buildMockWithdrawalTxHash } from '@/utils/creatorRevenue.utils';
import {
	aggregateEarningsSummary,
	applyClaimToSummary,
	EARNINGS_STREAMS,
	EARNINGS_STREAM_CONTRACT_CALLS,
	isEarningsStream,
	toNonNegativeAmount,
} from '@/utils/creatorEarnings.utils';
import type {
	ClaimEarningsResult,
	CreatorEarningsRecord,
	CreatorEarningsSummary,
	EarningsStream,
	EarningsStreamTotals,
} from '@/types/creatorEarnings';

const EARNINGS_CACHE_PREFIX = 'creator_earnings_';
const EARNINGS_CACHE_TTL_MS = 15_000;

interface ClaimOverride {
	amountXlm: number;
	claimedAt: number;
	transactionHash: string;
}

/**
 * Claims submitted during this session. The underlying sources do not all
 * expose claim state, so these overrides reduce the reported unclaimed balance
 * by the claimed amount and mark the matching records as claimed.
 */
const claimOverrides = new Map<
	string,
	Partial<Record<EarningsStream, ClaimOverride>>
>();

function claimKey(creatorId: string, wallet?: string): string {
	return `${creatorId}|${wallet ?? ''}`;
}

function cacheKey(creatorId: string, wallet?: string): string {
	return `${EARNINGS_CACHE_PREFIX}${claimKey(creatorId, wallet)}`;
}

function toIsoOrNow(value: string | number | null | undefined): string {
	if (typeof value === 'number' && Number.isFinite(value)) {
		const ms = value < 1_000_000_000_000 ? value * 1000 : value;
		return new Date(ms).toISOString();
	}
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Date.parse(value);
		if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
	}
	return new Date().toISOString();
}

/** Treats a missing resource (404) as "no earnings yet" for optional streams. */
async function loadAllowingNotFound<T>(promise: Promise<T>): Promise<T | null> {
	try {
		return await promise;
	} catch (error) {
		if (error instanceof ApiError && error.status === 404) return null;
		throw error;
	}
}

/**
 * Per-transfer royalty records. The authoritative unclaimed total comes from
 * the source's `pendingXlm`; `claimedXlm` is allocated oldest-first so the
 * table's claim status matches the source totals.
 */
function buildRoyaltyRecords(
	creatorId: string,
	summary: RoyaltyEarningsSummary
): CreatorEarningsRecord[] {
	const transfers = [...summary.transfers].sort(
		(a, b) => Date.parse(a.transferredAt) - Date.parse(b.transferredAt)
	);
	let claimedBudget = toNonNegativeAmount(summary.claimedXlm);

	return transfers.flatMap(transfer => {
		const amountXlm = toNonNegativeAmount(transfer.royaltyEarnedXlm);
		if (amountXlm <= 0) return [];

		const claimed = claimedBudget >= amountXlm;
		if (claimed) claimedBudget -= amountXlm;

		return [
			{
				id: `royalty-${transfer.id}`,
				creatorId,
				stream: 'royalties' as const,
				earnedAt: toIsoOrNow(transfer.transferredAt),
				amountXlm,
				status: claimed ? ('claimed' as const) : ('unclaimed' as const),
				transactionHash: transfer.transactionHash,
			},
		];
	});
}

function applySessionClaims(
	creatorId: string,
	wallet: string | undefined,
	summary: CreatorEarningsSummary
): CreatorEarningsSummary {
	const overrides = claimOverrides.get(claimKey(creatorId, wallet));
	if (!overrides) return summary;

	return EARNINGS_STREAMS.reduce((acc, stream) => {
		const override = overrides[stream];
		return override
			? applyClaimToSummary(
					acc,
					stream,
					override.amountXlm,
					override.transactionHash,
					override.claimedAt
				)
			: acc;
	}, summary);
}

class CreatorEarningsService {
	/**
	 * Builds the earnings breakdown from the real per-stream data sources:
	 * royalty ledger, tip ledger, on-chain subscriptions, and the creator's
	 * live spotlight round. There is no generated fallback: if a required
	 * source fails, the request fails rather than reporting invented balances.
	 */
	async getCreatorEarnings(
		creatorId: string,
		wallet: string
	): Promise<CreatorEarningsSummary> {
		const key = cacheKey(creatorId, wallet);
		const cached = cacheManager.get<CreatorEarningsSummary>(key);
		if (cached) return cached;

		const [royalties, tips, subscriptions, spotlight] = await Promise.all([
			loadAllowingNotFound(
				royaltyService.getRoyaltyEarnings(creatorId, wallet)
			),
			tipService.getTipsForCreator(creatorId),
			keySubscriptionContractService.getSubscriptionsForCreator(creatorId),
			loadAllowingNotFound(
				spotlightAuctionService.getSpotlightAuction(creatorId)
			),
		]);

		const records: CreatorEarningsRecord[] = [];
		const overrides: Partial<Record<EarningsStream, EarningsStreamTotals>> = {
			royalties: {
				totalEarnedXlm: royalties?.totalEarnedXlm ?? 0,
				unclaimedXlm: royalties?.pendingXlm ?? 0,
				claimedXlm: royalties?.claimedXlm ?? 0,
			},
		};

		if (royalties) {
			records.push(...buildRoyaltyRecords(creatorId, royalties));
		}

		for (const tip of tips) {
			const amountXlm = toNonNegativeAmount(tip.netAmount);
			if (amountXlm <= 0) continue;
			records.push({
				id: `tip-${tip.id}`,
				creatorId,
				stream: 'tips',
				earnedAt: toIsoOrNow(tip.timestamp),
				amountXlm,
				status: 'unclaimed',
				transactionHash: tip.txHash,
			});
		}

		for (const subscription of subscriptions) {
			const amountXlm = toNonNegativeAmount(subscription.totalInvestedXlm);
			if (amountXlm <= 0) continue;
			records.push({
				id: `subscription-${subscription.id}`,
				creatorId,
				stream: 'subscriptions',
				earnedAt: toIsoOrNow(
					subscription.updatedAt || subscription.createdAt
				),
				amountXlm,
				status: 'unclaimed',
			});
		}

		// The live round's top bid is the creator's accrued spotlight balance.
		// The source only exposes the current round, so it is dated at read time.
		const spotlightAmount = toNonNegativeAmount(spotlight?.highestBid);
		if (spotlightAmount > 0) {
			records.push({
				id: `spotlight-${creatorId}`,
				creatorId,
				stream: 'spotlight',
				earnedAt: new Date().toISOString(),
				amountXlm: spotlightAmount,
				status: 'unclaimed',
			});
		}

		const summary = applySessionClaims(
			creatorId,
			wallet,
			aggregateEarningsSummary(creatorId, records, overrides)
		);
		cacheManager.set(key, summary, EARNINGS_CACHE_TTL_MS);
		return summary;
	}

	/**
	 * Claims the unclaimed balance for one stream by submitting the matching
	 * contract call, then records a session override so the next read reflects
	 * the withdrawal even before the source catches up.
	 */
	async claimEarningsStream(
		creatorId: string,
		stream: EarningsStream,
		amountXlm: number,
		wallet?: string
	): Promise<ClaimEarningsResult> {
		const amount = toNonNegativeAmount(amountXlm);
		if (!isEarningsStream(stream) || amount <= 0) {
			throw new Error('No unclaimed earnings for this stream');
		}

		await submitCreatorContractCall(EARNINGS_STREAM_CONTRACT_CALLS[stream], {
			creatorId,
			stream,
			amountXlm: amount,
			wallet,
		});

		const transactionHash = buildMockWithdrawalTxHash();
		const claimedAt = Date.now();
		const key = claimKey(creatorId, wallet);
		const existing = claimOverrides.get(key) ?? {};
		const previous = existing[stream];
		claimOverrides.set(key, {
			...existing,
			[stream]: {
				amountXlm: (previous?.amountXlm ?? 0) + amount,
				claimedAt,
				transactionHash,
			},
		});

		this.invalidateCreatorEarnings(creatorId, wallet);

		return {
			success: true,
			stream,
			amountXlm: amount,
			claimedAt,
			transactionHash,
		};
	}

	/** Drops the cached summary after a claim so the next read is fresh. */
	invalidateCreatorEarnings(creatorId: string, wallet?: string): void {
		cacheManager.invalidate(cacheKey(creatorId, wallet));
	}

	/** Clears session claim overrides (used by tests). */
	clearClaimOverrides(): void {
		claimOverrides.clear();
	}
}

export const creatorEarningsService = new CreatorEarningsService();

export async function fetchCreatorEarnings(
	creatorId: string,
	wallet: string
): Promise<CreatorEarningsSummary> {
	return creatorEarningsService.getCreatorEarnings(creatorId, wallet);
}

export async function submitEarningsClaim(
	creatorId: string,
	stream: EarningsStream,
	amountXlm: number,
	wallet?: string
): Promise<ClaimEarningsResult> {
	return creatorEarningsService.claimEarningsStream(
		creatorId,
		stream,
		amountXlm,
		wallet
	);
}
