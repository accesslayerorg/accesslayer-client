/**
 * Types for Conviction Voting Governance Proposals.
 */

export type ConvictionProposalStatus =
	| 'active'
	| 'passed'
	| 'executed'
	| 'cancelled';

export interface ConvictionProposal {
	id: string;
	title: string;
	description: string;
	creatorId: string;
	creatorAddress?: string;
	/** Requested funding amount in XLM. */
	requestedAmount: number;
	status: ConvictionProposalStatus;
	/** Conviction threshold required to pass. */
	threshold: number;
	/** Current accumulated conviction. */
	currentConviction: number;
	/** Total stake allocated by all users to this proposal. */
	totalStake: number;
	/** User's currently allocated stake to this proposal. */
	userStake: number;
	/** Decay rate parameter alpha (0 < alpha < 1), default ~0.9. */
	alpha: number;
	/** Final outcome message if passed/executed. */
	outcome?: string | null;
	/** Timestamp when proposal was executed, if applicable. */
	executedAt?: string | null;
	/** Target beneficiary address for the requested funds. */
	beneficiary?: string;
	/** Creation timestamp. */
	createdAt: string;
}

export interface ConvictionBalances {
	/** Total stakeable governance voting balance. */
	totalStakeableBalance: number;
	/** Sum of stake allocated across all active proposals. */
	totalAllocatedStake: number;
	/** Balance remaining that can be allocated to proposals. */
	unallocatedBalance: number;
}

export interface ConvictionProjection {
	/** Whether the threshold has already been crossed. */
	isCrossed: boolean;
	/** Whether the threshold is reachable with the current stake. */
	isReachable: boolean;
	/** Maximum asymptotic conviction reachable with current stake: S / (1 - alpha). */
	maxConviction: number;
	/** Estimated seconds until threshold is reached, or null if unreachable. */
	projectedSeconds: number | null;
	/** Human-readable projection string (e.g. "Estimated crossing in 3 hours" or "Threshold reached"). */
	displayText: string;
}
