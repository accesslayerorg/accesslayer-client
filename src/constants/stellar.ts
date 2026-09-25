/** Stellar / Soroban native asset precision: 1 XLM = 10^7 stroops. */
export const STROOPS_PER_XLM = 10_000_000;

/** Stellar Expert network identifiers. */
export type StellarNetwork = 'mainnet' | 'testnet';

/**
 * Builds a Stellar Expert transaction explorer URL.
 *
 * @param txHash  - The full transaction hash.
 * @param network - The Stellar network to link to ('mainnet' or 'testnet').
 * @returns The full Stellar Expert URL for the transaction.
 */
export function buildStellarExpertTxUrl(
	txHash: string,
	network: StellarNetwork
): string {
	return `https://stellar.expert/explorer/${network}/tx/${txHash}`;
}

/**
 * Truncates a transaction hash for display purposes.
 *
 * @param txHash    - The full transaction hash.
 * @param prefixLen - Number of leading characters to keep (default 8).
 * @param suffixLen - Number of trailing characters to keep (default 6).
 * @returns A truncated string like `0x1a2b3c…ef1234`.
 */
export function truncateTxHash(
	txHash: string,
	prefixLen = 8,
	suffixLen = 6
): string {
	if (txHash.length <= prefixLen + suffixLen + 1) return txHash;
	return `${txHash.slice(0, prefixLen)}…${txHash.slice(-suffixLen)}`;
}
