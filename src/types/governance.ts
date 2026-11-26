/**
 * Governance proposal types for Access Layer (#826, #922).
 *
 * A proposal is an on-chain governance action tied to a creator key.
 * Each proposal carries its own quorum configuration and participation
 * metrics so the frontend can render a quorum indicator per-card.
 */

/** Current status of a governance proposal. */
export type ProposalStatus =
	| 'active'
	| 'closed'
	| 'passed'
	| 'rejected'
	| 'failed'
	| 'executed'
	| 'cancelled';

export type ProposalOutcome = 'passed' | 'failed' | 'quorum_not_met';

// ── Rage-quit (#1253) ─────────────────────────────────────────────────────

/**
 * Whether the connected holder is eligible to rage-quit a proposal.
 * Holders who voted *for* the proposal are not eligible.
 */
export type RageQuitEligibility =
	| 'eligible'
	| 'voted_for'
	| 'window_closed'
	| 'cap_reached'
	| 'unknown';

/** On-chain rage-quit window state for a passed proposal. */
export interface RageQuitStatus {
	proposalId: string;
	/** True while the rage-quit window is open and the cap has not been hit. */
	isOpen: boolean;
	/** ISO timestamp when the window closes. */
	windowEndsAt: string | null;
	/** Total keys that have already rage-quit as a fraction of supply (0–1). */
	exitedFraction: number;
	/** Maximum fraction of supply that may rage-quit (0–1). */
	maxExitFraction: number;
	/** Eligibility of the connected wallet. */
	eligibility: RageQuitEligibility;
	/** Pro-rata XLM payout the connected wallet would receive per key. */
	payoutPerKey: number | null;
}

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
	/** Optional protocol parameter name targeted by this proposal (#1126). */
	paramName?: string;
	/** Previous protocol parameter value before execution (#1126). */
	oldValue?: string | number;
	/** Proposed or executed new protocol parameter value (#1126). */
	newValue?: string | number;
	/** ISO timestamp (or ms epoch) when the timelock expires and the proposal can be executed (#1243). */
	timelockExpiresAt?: string;
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

export interface CreateProposalPayload {
	title: string;
	description: string;
	endDate: string;
}

export type CreateProposalInput = CreateProposalPayload;

// ── Governance audit feed (#1351) ─────────────────────────────────────────

/** Privileged protocol actions surfaced in the public governance audit feed. */
export type GovernanceEventType =
	| 'admin_transfer_proposed'
	| 'admin_transfer_accepted'
	| 'admin_transfer_cancelled'
	| 'config_change'
	| 'pause'
	| 'unpause'
	| 'upgrade';

/** A single privileged change recorded on-chain. */
export interface GovernanceEvent {
	id: string;
	type: GovernanceEventType;
	/** Account that performed the action. */
	actor: string;
	/** Account or setting the action applied to, when there is one. */
	target: string | null;
	/** ISO timestamp of the ledger close. */
	timestamp: string;
	/** Transaction hash, used for the explorer link and copy action. */
	txHash: string | null;
	/** Optional human-readable detail, e.g. `fee_bps: 100 → 150`. */
	details: string | null;
}

/** One cursor page of governance events. */
export interface GovernanceEventsPage {
	items: GovernanceEvent[];
	nextCursor: string | null;
}

/** Current protocol admin and any admin transfer awaiting acceptance. */
export interface GovernanceAdminState {
	currentAdmin: string;
	pendingAdmin: string | null;
	/** ISO timestamp after which the pending transfer can no longer be accepted. */
	pendingExpiresAt: string | null;
}
