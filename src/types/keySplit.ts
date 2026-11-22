/**
 * Key split types and interfaces (#1151).
 */

export interface SplitExecutedEvent {
	/** Identifier of the creator key that underwent the split. */
	keyId: string;
	/** Split ratio applied (e.g. 2 for 2:1, 3 for 3:1). */
	ratio: number;
	/** Timestamp when the split was executed (ISO string or epoch ms). */
	executedAt: string | number;
	/** Pre-split holding balance for the holder, if known. */
	preSplitBalance?: number;
	/** Post-split holding balance for the holder, if known. */
	postSplitBalance?: number;
	/** Optional transaction hash for on-chain execution. */
	txHash?: string;
}

export type KeySplitEvent = SplitExecutedEvent;
