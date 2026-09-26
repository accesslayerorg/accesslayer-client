/**
 * Governance proposal types for Access Layer (#826, #922).
 *
 * A proposal is an on-chain governance action tied to a creator key.
 * Each proposal carries its own quorum configuration and participation
 * metrics so the frontend can render a quorum indicator per-card.
 */

/** Current status of a governance proposal. */
export type ProposalStatus =
	'active' | 'closed' | 'passed' | 'rejected' | 'executed' | 'cancelled';

export type ProposalOutcome = 'passed' | 'failed' | 'quorum_not_met';

/** A single selectable option on an on-chain proposal. */
export interface ProposalOption {
	label: string;
	weight: number;
}

/** A single vote cast on a proposal. */
export interface Vote {
	id?: string;
	voter: string;
	/** Weight of the vote (number of keys held * multiplier). */
	weight: number;
	/** 'for' | 'against' | 'abstain' */
	direction: 'for' | 'against' | 'abstain';
	timestamp: string;
}

/** One page of the proposal vote history feed. */
export interface ProposalVotesPage {
	votes: Vote[];
	nextCursor: string | null;
}

/**
 * Governance proposal fetched from the backend API.
 *
 * Fields `quorumBps`, `totalCirculatingSupply`, and `totalVotingWeight`
 * are required for quorum computation (issue #826).
 */
export interface Proposal {
	id: string;
	creatorId: string;
	title: string;
	description: string;
	status: ProposalStatus;
	/** On-chain option set. Falls back to For / Against / Abstain when absent. */
	options?: ProposalOption[];
	outcome?: ProposalOutcome | null;
	/** Quorum threshold in basis points (e.g. 4000 = 40%). */
	quorumBps: number;
	eligibleVotingWeight?: number;
	/** Total circulating supply of the creator key. */
	totalCirculatingSupply: number;
	/** Current total voting weight across all votes. */
	totalVotingWeight: number;
	/** Stellar address of the creator key owner (required for on-chain reads). */
	creatorAddress?: string;
	/** On-chain poll ID (required to read snapshots and cast votes). */
	pollId?: number;
	/** Ledger the snapshot was captured at, when known. */
	snapshotLedger?: number;
	/** Timestamp the proposal closed, when known. */
	closedAt?: string;
	/** Timestamp when voting began. */
	startDate: string;
	/** Timestamp when voting ends. */
	endDate: string;
	/** Aggregate for-votes weight. */
	forVotes: number;
	/** Aggregate against-votes weight. */
	againstVotes: number;
	/** Aggregate abstain weight. */
	abstainVotes: number;
}

/** Props accepted by the QuorumIndicator component. */
export interface QuorumIndicatorProps {
	/** Quorum threshold in basis points. */
	quorumBps: number;
	/** Current total voting weight. */
	totalVotingWeight: number;
	/** Total circulating supply of the key. */
	totalCirculatingSupply: number;
	/** Optional extra class names. */
	className?: string;
}
