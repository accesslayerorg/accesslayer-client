/** Revenue streams surfaced on the creator earnings dashboard (#1258). */
export type EarningsStream =
	'royalties' | 'tips' | 'subscriptions' | 'spotlight';

export type EarningsRecordStatus = 'unclaimed' | 'claimed';

/** A single earning event for one revenue stream. */
export interface CreatorEarningsRecord {
	id: string;
	creatorId: string;
	stream: EarningsStream;
	/** ISO timestamp of when the earning accrued. */
	earnedAt: string;
	amountXlm: number;
	status: EarningsRecordStatus;
	transactionHash?: string;
}

/** Aggregated totals for one revenue stream. */
export interface CreatorEarningsStreamSummary {
	stream: EarningsStream;
	totalEarnedXlm: number;
	unclaimedXlm: number;
	claimedXlm: number;
}

/** Authoritative totals for one stream, as reported by its data source. */
export type EarningsStreamTotals = Pick<
	CreatorEarningsStreamSummary,
	'totalEarnedXlm' | 'unclaimedXlm' | 'claimedXlm'
>;

/** Full earnings breakdown for a creator across every revenue stream. */
export interface CreatorEarningsSummary {
	creatorId: string;
	streams: Record<EarningsStream, CreatorEarningsStreamSummary>;
	totalEarnedXlm: number;
	/** Sum of every stream's unclaimed balance. */
	totalUnclaimedXlm: number;
	records: CreatorEarningsRecord[];
	lastUpdated: string | number;
}

/** One day of combined earnings for the 30-day chart. */
export interface DailyEarningsPoint {
	/** ISO date (YYYY-MM-DD). */
	date: string;
	totalXlm: number;
	royaltiesXlm: number;
	tipsXlm: number;
	subscriptionsXlm: number;
	spotlightXlm: number;
}

/** Result returned after submitting a per-stream claim transaction. */
export interface ClaimEarningsResult {
	success: true;
	stream: EarningsStream;
	amountXlm: number;
	claimedAt: number;
	transactionHash: string;
}
