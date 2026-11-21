import type { TipBreakdown } from '@/types/tip.types';

export const TIP_FEE_PERCENT = 2; // 2% protocol deduction
export const TIP_MESSAGE_MAX_LENGTH = 280;
export const PRESET_TIP_AMOUNTS = [5, 10, 25, 50];

/**
 * Computes the 2% fee deduction and net amount to the creator.
 */
export function calculateTipBreakdown(amount: number): TipBreakdown {
	if (!Number.isFinite(amount) || amount <= 0) {
		return {
			amount: 0,
			fee: 0,
			netAmount: 0,
			feePercent: TIP_FEE_PERCENT,
		};
	}

	// 2% fee deduction
	const fee = Number(((amount * TIP_FEE_PERCENT) / 100).toFixed(4));
	const netAmount = Number((amount - fee).toFixed(4));

	return {
		amount,
		fee,
		netAmount,
		feePercent: TIP_FEE_PERCENT,
	};
}

/**
 * Validates that an optional message is within the 280-character limit.
 */
export function isTipMessageValid(message: string | null | undefined): boolean {
	if (!message) return true;
	return message.length <= TIP_MESSAGE_MAX_LENGTH;
}

/**
 * Validates that a tip amount is a positive finite number.
 */
export function isTipAmountValid(amount: number | null | undefined): boolean {
	if (amount == null || !Number.isFinite(amount)) return false;
	return amount > 0;
}
