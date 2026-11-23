import type { EarningsStream } from '@/types/stream';

/**
 * Calculates current claimable balance for a continuous earnings stream.
 *
 * Rules:
 * 1. Accrues linearly based on ratePerSecond and elapsed time.
 * 2. If the stream is paused, accrual stops at pausedAt and the balance freezes.
 * 3. Never exceeds (fundedAmount - withdrawnAmount).
 */
export function calculateClaimableBalance(
	stream: EarningsStream,
	nowMs: number = Date.now()
): number {
	const maxClaimable = Math.max(
		0,
		stream.fundedAmount - stream.withdrawnAmount
	);
	if (maxClaimable <= 0) return 0;

	// When stream is paused, time freezes at pausedAt
	const effectiveTime = stream.isPaused
		? stream.pausedAt ?? stream.startTime
		: Math.min(stream.stopTime, nowMs);

	const elapsedSeconds = Math.max(
		0,
		(effectiveTime - stream.startTime) / 1000
	);

	const totalAccrued = Math.min(
		stream.fundedAmount,
		elapsedSeconds * stream.ratePerSecond
	);

	const claimable = Math.max(0, totalAccrued - stream.withdrawnAmount);

	// Strict cap: never exceed funded minus withdrawn (#acceptance criteria)
	return Math.min(maxClaimable, claimable);
}

/**
 * Calculates fee and net payout for an earnings stream withdrawal.
 * Default: 0.5% protocol fee, minimum 0.01 XLM.
 */
export function calculateWithdrawalFee(amountXlm: number): {
	feeXlm: number;
	netAmountXlm: number;
} {
	const safeAmount = Math.max(0, amountXlm);
	if (safeAmount <= 0) {
		return { feeXlm: 0, netAmountXlm: 0 };
	}

	const rawFee = safeAmount * 0.005; // 0.5% fee
	const feeXlm = Number(Math.max(0.01, rawFee).toFixed(4));
	const netAmountXlm = Number(Math.max(0, safeAmount - feeXlm).toFixed(4));

	return { feeXlm, netAmountXlm };
}

/**
 * Formats stream rate into daily and per-second rates.
 */
export function formatStreamRate(ratePerSecond: number): string {
	const safeRate = Math.max(0, ratePerSecond);
	const dailyRate = safeRate * 86400;
	return `${dailyRate.toLocaleString(undefined, {
		maximumFractionDigits: 2,
	})} XLM/day (${safeRate.toFixed(4)} XLM/s)`;
}
