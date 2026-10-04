/**
 * Merge proposal voting types for source key holders (#983).
 *
 * A merge proposal lets holders of a "source" creator key vote on whether
 * that key should be merged into a target key. Voting is weighted by the
 * number of source keys held, runs until `votingDeadline`, and passes only
 * if the approval share of cast votes clears `approvalThresholdBps`.
 */

/** Lifecycle status of a merge proposal. */
export type MergeProposalStatus =
	| 'active'
	| 'passed'
	| 'failed'
	| 'pending_execution'
	| 'executed';

/** Direction of a single holder's merge vote. */
export type MergeVoteDirection = 'approve' | 'reject';

/**
 * Merge proposal fetched from the backend for a given source key.
 *
 * `approveWeight` / `rejectWeight` are already-aggregated vote weights
 * (1 unit of weight per source key held at the time of voting).
 */
export interface MergeProposal {
	id: string;
	/** ID of the source creator key this proposal was raised on. */
	sourceKeyId: string;
	/** ID of the key the source key would merge into. */
	targetKeyId: string;
	/** Display name of the target key, for the banner copy. */
	targetKeyName?: string;
	title: string;
	description: string;
	status: MergeProposalStatus;
	/** Aggregate approve-vote weight. */
	approveWeight: number;
	/** Aggregate reject-vote weight. */
	rejectWeight: number;
	/**
	 * Approval threshold in basis points (e.g. 6000 = 60%) of votes cast
	 * (approve + reject) required for the proposal to pass.
	 */
	approvalThresholdBps: number;
	/** Minimum source keys a wallet must hold to be a qualifying voter. */
	minHoldingToVote: number;
	/** Timestamp voting opened. */
	startDate: string;
	/** Timestamp voting closes. */
	votingDeadline: string;
	/** The connected wallet's own vote direction, if it has already voted. */
	userVote?: MergeVoteDirection | null;
}

/** Response returned after successfully casting a merge vote. */
export interface MergeVoteCastResult {
	proposal: MergeProposal;
	direction: MergeVoteDirection;
}
