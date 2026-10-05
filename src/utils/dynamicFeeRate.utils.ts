/**
 * Dynamic fee rate utilities for the trade confirmation screen (#994).
 *
 * Fees are quoted on-chain in basis points: base fee, volume-tier discount,
 * protocol fee, and creator royalty. These helpers turn the raw contract
 * payload into the exact values rendered by `DynamicFeeBreakdown`, so the
 * confirmation screen always matches what the contract will charge.
 */

import { bpsToPercent } from '@/utils/numberFormat.utils';

/** Base fee percentage applied to every trade, in basis points. */
export const DEFAULT_BASE_FEE_BPS = 500; // 5%
/** Upper bound for the base fee, in basis points, used to clamp contract values. */
export const MAX_BASE_FEE_BPS = 1000; // 10%
/** Volume-tier discount applied on top of the base fee, in basis points. */
export const DEFAULT_VOLUME_TIER_DISCOUNT_BPS = 0; // no discount by default
/** Max discount the tier system can grant, in basis points, used to clamp. */
export const MAX_VOLUME_TIER_DISCOUNT_BPS = 200; // 2%
/** Protocol fee collected on every trade, in basis points. */
export const DEFAULT_PROTOCOL_FEE_BPS = 250; // 2.5%
/** Upper bound for the protocol fee, in basis points, used to clamp. */
export const MAX_PROTOCOL_FEE_BPS = 1000; // 10%
/** Creator royalty collected on every trade, in basis points. */
export const DEFAULT_CREATOR_ROYALTY_BPS = 250; // 2.5%
/** Upper bound for the creator royalty, in basis points, used to clamp. */
export const MAX_CREATOR_ROYALTY_BPS = 1000; // 10%

/**
 * Raw dynamic fee payload returned by the contract read path.
 * Every field is optional: absent fields fall back to the protocol defaults
 * so a partially populated response can never render a misleading quote.
 */
export interface ContractDynamicFeeRate {
	/** Base fee percentage in basis points. */
	baseFeeBps?: number;
	/** Volume-tier discount in basis points (subtracted from the base fee). */
	volumeTierDiscountBps?: number;
	/** Protocol fee in basis points. */
	protocolFeeBps?: number;
	/** Creator royalty in basis points. */
	creatorRoyaltyBps?: number;
}

/**
 * Fee quote used to render the confirmation-screen breakdown.
 * Amounts are stroops; `netProceedsStroops` is only populated for sells.
 */
export interface DynamicFeeBreakdown {
	/** Base fee component before the volume-tier discount, in stroops. */
	baseFeeStroops: number;
	/** Volume-tier discount component (credit back to the trader), in stroops. */
	volumeTierDiscountStroops: number;
	/** Protocol fee component in stroops. */
	protocolFeeStroops: number;
	/** Creator royalty component in stroops. */
	creatorRoyaltyStroops: number;
	/** Effective (net) fee percentage in basis points. */
	effectiveFeeBps: number;
	/** Total fee charged in stroops after the tier discount. */
	totalFeeStroops: number;
	/** Total trade value the fee is computed on, in stroops. */
	notionalStroops: number;
	/** True when this quote is for a sell (proceeds-based components). */
	isSell: boolean;
	/** Estimated USD value of the total fee; null when no USD rate is known. */
	totalFeeUsd: number | null;
	/** Net proceeds after fees for sells; null for buys. */
	netProceedsStroops: number | null;
}

/**
 * Deterministically selects a volume-tier discount based on trade notional.
 *
 * Mirrors the contract's tier schedule so the confirmation screen agrees
 * with what the contract charges without an extra round trip:
 * ≥ 500 XLM → 200 bps, ≥ 100 XLM → 100 bps, ≥ 10 XLM → 50 bps, else 0.
 */
export function getVolumeTierDiscountBps(notionalStroops: number): number {
	if (!Number.isFinite(notionalStroops) || notionalStroops <= 0) {
		return 0;
	}

	if (notionalStroops >= 5_000_000_000) return 200; // ≥ 500 XLM
	if (notionalStroops >= 1_000_000_000) return 100; // ≥ 100 XLM
	if (notionalStroops >= 100_000_000) return 50; // ≥ 10 XLM
	return 0;
}

function clampBps(value: number | undefined, fallback: number, max: number): number {
	if (value == null || !Number.isFinite(value)) return fallback;
	if (value < 0) return 0;
	return Math.min(Math.round(value), max);
}

/**
 * Builds the complete fee quote for a trade from contract-supplied rates.
 *
 * @param params.notionalStroops  Trade value the fee is computed on.
 *   Buys pass the gross key cost; sells pass estimated gross proceeds.
 * @param params.rates            Raw dynamic fee payload from the contract.
 * @param params.isSell           Whether this quote is for a sell trade.
 * @param params.xlmUsdRate      Optional USD price of 1 XLM for the USD equivalent.
 */
export function buildDynamicFeeBreakdown(params: {
	notionalStroops: number | null | undefined;
	rates: ContractDynamicFeeRate;
	isSell: boolean;
	xlmUsdRate?: number | null;
}): DynamicFeeBreakdown {
	const { notionalStroops, rates, isSell, xlmUsdRate } = params;

	const safeNotional =
		notionalStroops != null && Number.isFinite(notionalStroops) && notionalStroops > 0
			? notionalStroops
			: 0;

	const baseFeeBps = clampBps(
		rates.baseFeeBps,
		DEFAULT_BASE_FEE_BPS,
		MAX_BASE_FEE_BPS
	);
	const protocolFeeBps = clampBps(
		rates.protocolFeeBps,
		DEFAULT_PROTOCOL_FEE_BPS,
		MAX_PROTOCOL_FEE_BPS
	);
	const creatorRoyaltyBps = clampBps(
		rates.creatorRoyaltyBps,
		DEFAULT_CREATOR_ROYALTY_BPS,
		MAX_CREATOR_ROYALTY_BPS
	);

	const rawTierDiscountBps =
		rates.volumeTierDiscountBps != null && Number.isFinite(rates.volumeTierDiscountBps)
			? clampBps(rates.volumeTierDiscountBps, 0, MAX_VOLUME_TIER_DISCOUNT_BPS)
			: getVolumeTierDiscountBps(safeNotional);

	// The discount can never exceed the base fee, so the effective rate and
	// every component stays non-negative even for malformed contract data.
	const tierDiscountBps = Math.min(rawTierDiscountBps, baseFeeBps);

	const baseFeeStroops = Math.round((safeNotional * baseFeeBps) / 10_000);
	const volumeTierDiscountStroops =
		safeNotional > 0 && tierDiscountBps > 0
			? Math.round((safeNotional * tierDiscountBps) / 10_000)
			: 0;
	const protocolFeeStroops = Math.round((safeNotional * protocolFeeBps) / 10_000);
	const creatorRoyaltyStroops = Math.round(
		(safeNotional * creatorRoyaltyBps) / 10_000
	);

	const effectiveFeeBps =
		baseFeeBps - tierDiscountBps + protocolFeeBps + creatorRoyaltyBps;
	const totalFeeStroops =
		baseFeeStroops -
		volumeTierDiscountStroops +
		protocolFeeStroops +
		creatorRoyaltyStroops;

	const totalFeeUsd =
		xlmUsdRate != null && Number.isFinite(xlmUsdRate) && xlmUsdRate > 0
			? (totalFeeStroops / 10_000_000) * xlmUsdRate
			: null;

	return {
		baseFeeStroops,
		volumeTierDiscountStroops,
		protocolFeeStroops,
		creatorRoyaltyStroops,
		effectiveFeeBps,
		totalFeeStroops,
		notionalStroops: safeNotional,
		isSell,
		totalFeeUsd,
		netProceedsStroops:
			isSell && safeNotional > 0 ? safeNotional - totalFeeStroops : null,
	};
}

/**
 * Single-line summary of the effective fee rate for assistive tech and
 * compact displays, e.g. `"Effective fee rate: 5.0%"`.
 */
export function formatEffectiveFeeRate(effectiveFeeBps: number): string {
	if (!Number.isFinite(effectiveFeeBps)) return 'Effective fee rate: —';
	return `Effective fee rate: ${bpsToPercent(effectiveFeeBps)}`;
}
