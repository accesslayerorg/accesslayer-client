/**
 * A creator revenue distribution as seen by a key holder (#1223).
 *
 * The creator calls `distribute_revenue`; every eligible holder of the key
 * then claims their pro-rata slice with `claim_revenue_share`.
 */
export interface RevenueShareDistribution {
	/** Distribution id used by the contract call. */
	id: string;
	/** Creator key the distribution belongs to. */
	creatorId: string;
	/** Total XLM distributed across all holders. */
	amount: number;
	/** When the creator made the distribution, as a unix-ms timestamp. */
	timestamp: number;
	/** Number of holders that received a pro-rata share. */
	holderCount: number;
	/** This holder's pro-rata share of the distribution, in XLM. */
	userShare: number;
	/** Whether this holder already claimed their share. */
	claimed: boolean;
	/** Amount the holder actually received, once the claim settled. */
	receivedAmount: number | null;
	/** When the claim settled, as a unix-ms timestamp. */
	claimedAt: number | null;
}

/**
 * A settled claim recorded for a holder.
 *
 * Claims are stored locally so the "claimed" state (and the amount received)
 * survives a reload even before the backend reports it.
 */
export interface RevenueShareClaim {
	/** Distribution the claim was made for. */
	distributionId: string;
	/** Amount received, in XLM. */
	receivedAmount: number;
	/** When the claim settled, as a unix-ms timestamp. */
	claimedAt: number;
}
