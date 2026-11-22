/**
 * Type definitions for the batch swap / batch trade flow (#1155).
 *
 * Allows users to queue multiple buy or sell orders across different keys
 * and submit them as a single atomic transaction with per-item slippage controls.
 */

export type BatchTradeDirection = 'buy' | 'sell';

export interface BatchTradeItem {
	/** Creator / course ID — the key's on-chain identifier. */
	keyId: string;
	/** Human-readable display name shown in the batch drawer. */
	keyName: string;
	/** Current on-chain key price in stroops. */
	priceStroops: number;
	/** Number of keys to buy or sell (clamped to bounds). */
	amount: number;
	/** Trade direction ('buy' or 'sell'). */
	direction: BatchTradeDirection;
	/** Per-item slippage tolerance percentage (e.g. 1 for 1%). */
	slippageTolerance: number;
	/** Current circulating supply, used for price impact estimates. */
	currentSupply?: number | null;
	/** Optional protocol fee in basis points. */
	protocolFeeBps?: number;
	/** Optional creator fee in basis points. */
	creatorFeeBps?: number;
	/** Optional thumbnail / avatar URL. */
	thumbnail?: string;
}

export type BatchTradeInput = Omit<BatchTradeItem, 'slippageTolerance'> & {
	slippageTolerance?: number;
};

/** One line in the `batch_swap` contract call payload. */
export interface BatchSwapRequestItem {
	keyId: string;
	direction: BatchTradeDirection;
	amount: number;
	slippageTolerance: number;
	priceStroops: number;
	maxPriceStroops?: number | null;
	minPriceStroops?: number | null;
}

/** Complete payload handed to the `batch_swap` contract call. */
export interface BatchSwapPayload {
	items: BatchSwapRequestItem[];
	totalCostStroops: number;
	combinedPriceImpactPercent?: number | null;
}

/** Result summary for one item after a batch trade execution. */
export interface BatchSwapItemResult {
	keyId: string;
	keyName: string;
	direction: BatchTradeDirection;
	amount: number;
	costStroops: number;
	success: boolean;
	error?: string;
}

/** Confirmation payload passed to the BatchSwapExecuted toast. */
export interface BatchSwapReceipt {
	success: boolean;
	transactionHash?: string;
	items: BatchSwapItemResult[];
	totalCostStroops: number;
}
