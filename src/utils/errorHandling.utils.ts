/**
 * Wallet and Signature error handling utilities
 */

/**
 * Standard wallet error types and their corresponding user-friendly messages
 */
export const WALLET_ERROR_COPY = {
	SIGNATURE_REJECTED: "Signature request was declined. Please try again when you're ready to confirm.",
	SIGNATURE_FAILED: "The signature request failed. Please ensure your wallet is unlocked and try again.",
	GENERIC_TRANSACTION_FAILED: "Transaction failed. Please check your balance or connection and try again.",
	MaxSupplyReached: "Maximum supply reached. No more keys can be minted.",
};

export const ERROR_CODE_TO_COPY: Record<string, string> = {
	...WALLET_ERROR_COPY,
};

export function getErrorMessage(code: string): string {
	return ERROR_CODE_TO_COPY[code] ?? code;
}

interface WalletError {
	message?: string;
	code?: number | string;
}

/**
 * Determines if an error is a user rejection of a signature or transaction
 * 
 * @param error - The error object to check
 * @returns boolean
 */
export function isUserRejection(error: unknown): boolean {
	if (!error || typeof error !== 'object') return false;
	
	const err = error as WalletError;
	// Check common error codes and names across different wallets/libraries
	const errorMessage = (err.message || '').toLowerCase();
	const errorCode = err.code;
	
	return (
		errorCode === 4001 || // EIP-1193 userRejectedRequest
		errorCode === 'ACTION_REJECTED' || // ethers.js
		errorMessage.includes('user rejected') ||
		errorMessage.includes('declined') ||
		errorMessage.includes('cancelled')
	);
}

/**
 * Gets a human-readable error message for a wallet signature failure
 * 
 * @param error - The error object
 * @returns Targeted error message
 */
export function getSignatureErrorMessage(error: unknown): string {
	if (isUserRejection(error)) {
		return WALLET_ERROR_COPY.SIGNATURE_REJECTED;
	}
	
	// For other failures that aren't explicit rejections
	return WALLET_ERROR_COPY.SIGNATURE_FAILED;
}
