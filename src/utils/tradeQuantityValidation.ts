/**
 * Trade panel quantity input validation utilities.
 * Validates user input for buy/sell trade quantities.
 */

export type TradeValidationError =
	| 'empty'
	| 'invalid-number'
	| 'zero-or-negative'
	| 'insufficient-balance';

export interface ValidationResult {
	valid: boolean;
	error?: TradeValidationError;
	message?: string;
}

/**
 * Validates a trade quantity string.
 *
 * @param input - Raw user input (may contain whitespace, non-numeric chars, etc.)
 * @param side - Trade type: 'buy' or 'sell'
 * @param availableHoldings - Current holdings (used for sell validation)
 * @returns ValidationResult with error code and message if invalid
 */
export function validateTradeQuantity(
	input: string,
	side: 'buy' | 'sell',
	availableHoldings: number
): ValidationResult {
	const normalized = input.trim();

	// Empty input
	if (!normalized) {
		return {
			valid: false,
			error: 'empty',
			message: 'Please enter an amount.',
		};
	}

	// Try to parse as number
	const parsed = Number(normalized);

	// Non-numeric input
	if (!Number.isFinite(parsed)) {
		return {
			valid: false,
			error: 'invalid-number',
			message: 'Amount must be a valid number.',
		};
	}

	// Zero or negative value
	if (parsed <= 0) {
		return {
			valid: false,
			error: 'zero-or-negative',
			message: 'Amount must be greater than zero.',
		};
	}

	// Sell: check balance
	if (side === 'sell' && parsed > availableHoldings) {
		return {
			valid: false,
			error: 'insufficient-balance',
			message: `You can't sell more than your holdings (${Math.floor(availableHoldings)} keys).`,
		};
	}

	// Valid
	return { valid: true };
}

/**
 * Formats a validation error code into a user-friendly message.
 * Used when you have just the error code but need the message.
 */
export function formatValidationError(
	error: TradeValidationError,
	availableHoldings?: number
): string {
	switch (error) {
		case 'empty':
			return 'Please enter an amount.';
		case 'invalid-number':
			return 'Amount must be a valid number.';
		case 'zero-or-negative':
			return 'Amount must be greater than zero.';
		case 'insufficient-balance':
			return `You can't sell more than your holdings (${availableHoldings ? Math.floor(availableHoldings) : 0} keys).`;
		default:
			return 'Invalid amount.';
	}
}
