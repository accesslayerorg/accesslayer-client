export type RevenueTimeRange = '24h' | '7d' | '30d' | 'all';

/**
 * Breakdown of creator revenue by source.
 */
export interface CreatorRevenueSummary {
	creatorId: string;
	/** Royalties earned from key trades and secondary volume, in XLM. */
	royaltiesEarned: number;
	/** Subscription fees earned from keyholder subscriptions, in XLM. */
	subscriptionFees: number;
	/** Dividend deposits received from protocol revenue pool distributions, in XLM. */
	dividendDeposits: number;
	/** Total lifetime earnings across all sources (royalties + subscriptions + dividends), in XLM. */
	totalEarnings: number;
	/** Net proceeds currently available for withdrawal, in XLM. */
	claimableProceeds: number;
	/** Lifetime amount withdrawn by the creator, in XLM. */
	totalWithdrawn: number;
	/** ISO string or millisecond timestamp of last calculation / refresh. */
	lastUpdated: string | number;
}

/**
 * Single historical revenue data point for time-series charts.
 */
export interface RevenueHistoryPoint {
	timestamp: string | number;
	royalties: number;
	subscriptionFees: number;
	dividendDeposits: number;
	total: number;
}

/**
 * Historical record of a creator revenue withdrawal / claim.
 */
export interface CreatorWithdrawalRecord {
	id: string;
	creatorId: string;
	amount: number;
	timestamp: number;
	transactionHash: string;
	status: 'confirmed' | 'pending' | 'failed';
	wallet?: string;
}

/**
 * Result returned upon submitting a creator revenue claim transaction.
 */
export interface CreatorWithdrawalResult {
	success: true;
	transactionHash: string;
	claimedAt: number;
	amount: number;
	record: CreatorWithdrawalRecord;
}

/**
 * A single holder's estimated pro-rata share of a revenue distribution.
 */
export interface RevenueDistributionPreviewEntry {
	walletAddress: string;
	displayName: string;
	keyCount: number;
	/** Fraction of the total distributed amount allocated to this holder (0–1). */
	share: number;
	/** Estimated XLM allocated to this holder. */
	estimatedAmount: number;
}

/**
 * Historical record of a creator-initiated revenue distribution to key holders.
 */
export interface RevenueDistributionRecord {
	id: string;
	creatorId: string;
	/** Total XLM distributed across key holders. */
	amount: number;
	timestamp: number;
	/** Number of key holders that received a pro-rata share. */
	holderCount: number;
	wallet?: string;
	status: 'confirmed';
}

/**
 * Result returned upon submitting a distribute_revenue contract call.
 */
export interface RevenueDistributionResult {
	success: true;
	record: RevenueDistributionRecord;
}
