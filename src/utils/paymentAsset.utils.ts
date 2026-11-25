import type { PaymentAsset, ConvertedQuoteResult } from '@/types/paymentAsset.types';

export const STROOPS_PER_XLM_BIGINT = 10_000_000n;

/**
 * Decimal-safe quote conversion from base stroops (7 decimals) to any target asset (6, 7, 18 decimals).
 *
 * @param quoteStroops - Base price quote in stroops (7 decimals)
 * @param asset - Target payment asset specification (decimals, rate, balance, oracleStatus)
 * @param slippageTolerancePercent - User configured slippage tolerance (e.g. 1.0 for 1%)
 */
export function convertQuoteToPaymentAsset(
	quoteStroops: number | bigint,
	asset: PaymentAsset,
	slippageTolerancePercent: number = 1.0
): ConvertedQuoteResult {
	const stroopsBig = BigInt(Math.max(0, Math.round(Number(quoteStroops))));
	const rate = asset.rateAgainstXlm;
	const decimals = asset.decimals;

	// Calculate base XLM amount
	const xlmAmount = Number(stroopsBig) / 10_000_000;
	const numericTarget = xlmAmount * rate;

	// Decimal-safe BigInt raw units scaling
	// scaledRate multiplier to avoid float truncation: scale by 10^9
	const RATE_SCALE = 1_000_000_000n;
	const scaledRateBig = BigInt(Math.round(rate * 1_000_000_000));
	const targetPowBig = 10n ** BigInt(decimals);

	// rawUnits = (stroopsBig * scaledRateBig * targetPowBig) / (10^7 * 10^9)
	const rawUnits =
		(stroopsBig * scaledRateBig * targetPowBig) / (10_000_000n * RATE_SCALE);

	// Format amount based on decimals
	const displayDecimals = Math.min(decimals, decimals === 18 ? 8 : decimals);
	const formattedAmount = numericTarget.toFixed(displayDecimals);

	// Calculate max pay including slippage
	const slippageMultiplier = 1 + slippageTolerancePercent / 100;
	const maxPayAmount = numericTarget * slippageMultiplier;
	const formattedMaxPay = maxPayAmount.toFixed(displayDecimals);

	// Balance and Shortfall
	const hasSufficientBalance = (asset.balance ?? 0) >= numericTarget;
	const shortfall = hasSufficientBalance ? 0 : numericTarget - (asset.balance ?? 0);
	const formattedShortfall = shortfall.toFixed(displayDecimals);

	const oracle = asset.oracleStatus;
	const isFallback = Boolean(oracle?.isFallback || oracle?.source === 'fallback');
	const rateSource = oracle?.sourceName || (isFallback ? 'Fallback Oracle' : 'Primary Feed');
	const rateAgeMs = oracle?.ageMs ?? 0;

	return {
		assetCode: asset.code,
		decimals,
		rate,
		rawUnits,
		numericAmount: numericTarget,
		formattedAmount,
		maxPayAmount,
		formattedMaxPay,
		hasSufficientBalance,
		shortfall,
		formattedShortfall,
		isFallback,
		rateSource,
		rateAgeMs,
	};
}
