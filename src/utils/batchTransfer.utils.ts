/**
 * Utility functions and constants for batch transferring creator keys (#batch-transfer).
 */

export const MAX_BATCH_TRANSFER_RECIPIENTS = 10;
export const MIN_BATCH_TRANSFER_RECIPIENTS = 1;

/**
 * Stellar public key regex pattern.
 * A valid Stellar account address is 56 characters long, starts with 'G',
 * and is encoded in RFC 4648 Base32 (A-Z, 2-7).
 */
export const STELLAR_WALLET_ADDRESS_PATTERN = /^G[A-Z2-7]{55}$/i;

export interface BatchTransferRecipient {
	address: string;
	quantity: number;
}

export interface BatchTransferRecipientRow {
	id: string;
	address: string;
	quantity: number | string;
}

export interface BatchTransferRowValidation {
	addressError?: string;
	quantityError?: string;
	isValid: boolean;
}

export interface BatchTransferValidationResult {
	isValid: boolean;
	totalKeys: number;
	rowErrors: Record<string, BatchTransferRowValidation>;
	balanceError?: string;
	generalError?: string;
}

/**
 * Validates whether a given string is a valid Stellar wallet public key (G-address).
 */
export function isValidStellarWalletAddress(address: string): boolean {
	if (!address) return false;
	const trimmed = address.trim();
	return STELLAR_WALLET_ADDRESS_PATTERN.test(trimmed);
}

/**
 * Normalises a wallet address by trimming whitespace and converting to uppercase.
 */
export function normalizeWalletAddress(address: string): string {
	return (address || '').trim().toUpperCase();
}

/**
 * Calculates the total number of keys to transfer across all recipient rows.
 */
export function calculateTotalBatchTransferKeys(
	rows: Array<{ quantity: number | string }>
): number {
	return rows.reduce((sum, row) => {
		const val = Number(row.quantity);
		return sum + (Number.isFinite(val) && val > 0 ? val : 0);
	}, 0);
}

/**
 * Validates all recipient rows for address validity, quantity bounds,
 * uniqueness, and liquid balance constraints.
 */
export function validateBatchTransferRows(
	rows: BatchTransferRecipientRow[],
	liquidBalance: number
): BatchTransferValidationResult {
	const rowErrors: Record<string, BatchTransferRowValidation> = {};
	let totalKeys = 0;
	let hasRowError = false;
	const seenAddresses = new Map<string, string>();

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const errors: BatchTransferRowValidation = { isValid: true };
		const trimmedAddress = (row.address || '').trim();

		// Address validation
		if (!trimmedAddress) {
			errors.addressError = 'Wallet address is required';
			errors.isValid = false;
			hasRowError = true;
		} else if (!isValidStellarWalletAddress(trimmedAddress)) {
			errors.addressError =
				'Invalid Stellar address (must start with G and be 56 characters)';
			errors.isValid = false;
			hasRowError = true;
		} else {
			const upper = normalizeWalletAddress(trimmedAddress);
			if (seenAddresses.has(upper)) {
				errors.addressError = 'Duplicate recipient address';
				errors.isValid = false;
				hasRowError = true;
			} else {
				seenAddresses.set(upper, row.id);
			}
		}

		// Quantity validation
		const qtyStr = String(row.quantity ?? '').trim();
		const numQuantity = Number(qtyStr);

		if (!qtyStr) {
			errors.quantityError = 'Quantity is required';
			errors.isValid = false;
			hasRowError = true;
		} else if (
			isNaN(numQuantity) ||
			!Number.isFinite(numQuantity) ||
			numQuantity <= 0
		) {
			errors.quantityError = 'Quantity must be at least 1';
			errors.isValid = false;
			hasRowError = true;
		} else if (!Number.isInteger(numQuantity)) {
			errors.quantityError = 'Quantity must be a whole number';
			errors.isValid = false;
			hasRowError = true;
		} else {
			totalKeys += numQuantity;
		}

		rowErrors[row.id] = errors;
	}

	let balanceError: string | undefined;
	if (totalKeys > liquidBalance) {
		balanceError = `Total quantity (${totalKeys}) exceeds your liquid balance of ${liquidBalance} keys.`;
	}

	let generalError: string | undefined;
	if (rows.length === 0) {
		generalError = 'At least one recipient is required';
	} else if (rows.length > MAX_BATCH_TRANSFER_RECIPIENTS) {
		generalError = `Maximum ${MAX_BATCH_TRANSFER_RECIPIENTS} recipients allowed`;
	}

	const isValid =
		!hasRowError &&
		!balanceError &&
		!generalError &&
		rows.length > 0 &&
		totalKeys > 0;

	return {
		isValid,
		totalKeys,
		rowErrors,
		balanceError,
		generalError,
	};
}
