import type {
	MergeProposal,
	MergeProposalStatus,
} from '@/types/mergeProposal';

/** Display outcome once voting has closed (post-deadline). */
export type MergeProposalOutcome = 'passed' | 'failed' | 'pending_execution';

/**
 * Total weight of votes cast so far (approve + reject). Abstentions don't
 * exist for merge votes — a qualifying holder either approves or rejects.
 */
export function getTotalVotesCast(
	proposal: Pick<MergeProposal, 'approveWeight' | 'rejectWeight'>
): number {
	const approve = Number.isFinite(proposal.approveWeight)
		? proposal.approveWeight
		: 0;
	const reject = Number.isFinite(proposal.rejectWeight)
		? proposal.rejectWeight
		: 0;
	return Math.max(0, approve) + Math.max(0, reject);
}

/**
 * Current approval percentage of votes cast, 0-100. Returns 0 when no
 * votes have been cast yet, rather than dividing by zero.
 */
export function getApprovalPercentage(
	proposal: Pick<MergeProposal, 'approveWeight' | 'rejectWeight'>
): number {
	const total = getTotalVotesCast(proposal);
	if (total <= 0) return 0;
	return (Math.max(0, proposal.approveWeight) / total) * 100;
}

/** Required approval percentage (0-100) derived from basis points. */
export function getRequiredThresholdPercentage(
	approvalThresholdBps: number
): number {
	if (!Number.isFinite(approvalThresholdBps)) return 0;
	return Math.min(100, Math.max(0, approvalThresholdBps / 100));
}

/** Whether the current tally already clears the pass threshold. */
export function isApprovalThresholdMet(proposal: MergeProposal): boolean {
	return (
		getApprovalPercentage(proposal) >=
		getRequiredThresholdPercentage(proposal.approvalThresholdBps)
	);
}

/** Milliseconds remaining until the voting deadline (never negative). */
export function getRemainingMs(
	votingDeadline: string,
	now: number = Date.now()
): number {
	const deadline = new Date(votingDeadline).getTime();
	if (Number.isNaN(deadline)) return 0;
	return Math.max(0, deadline - now);
}

/** Whether the voting window is still open. */
export function isVotingOpen(
	proposal: Pick<MergeProposal, 'status' | 'votingDeadline'>,
	now: number = Date.now()
): boolean {
	return (
		proposal.status === 'active' &&
		getRemainingMs(proposal.votingDeadline, now) > 0
	);
}

/** Formats a remaining-time duration as e.g. "2d 04h 11m 09s" or "45s". */
export function formatCountdownDuration(remainingMs: number): string {
	if (remainingMs <= 0) return '0s';

	const totalSeconds = Math.floor(remainingMs / 1000);
	const days = Math.floor(totalSeconds / 86_400);
	const hours = Math.floor((totalSeconds % 86_400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	const parts: string[] = [];
	if (days > 0) parts.push(`${days}d`);
	if (days > 0 || hours > 0) parts.push(`${String(hours).padStart(2, '0')}h`);
	if (days > 0 || hours > 0 || minutes > 0) {
		parts.push(`${String(minutes).padStart(2, '0')}m`);
	}
	parts.push(`${String(seconds).padStart(2, '0')}s`);

	return parts.join(' ');
}

/**
 * Derives the display outcome for a proposal whose voting window has
 * closed. Prefers the authoritative backend `status`; falls back to a
 * client-side computation from the tally only when the backend hasn't
 * caught up yet (deadline passed but status still reads 'active').
 */
export function getMergeProposalOutcome(
	proposal: MergeProposal,
	now: number = Date.now()
): MergeProposalOutcome | null {
	const deadlinePassed = getRemainingMs(proposal.votingDeadline, now) <= 0;

	const statusOutcome: Partial<Record<MergeProposalStatus, MergeProposalOutcome>> =
		{
			passed: 'passed',
			failed: 'failed',
			pending_execution: 'pending_execution',
			executed: 'passed',
		};

	if (proposal.status !== 'active') {
		return statusOutcome[proposal.status] ?? null;
	}

	if (!deadlinePassed) return null;

	// Deadline has passed but the backend hasn't re-classified the
	// proposal yet — show a best-effort outcome from the current tally so
	// the banner doesn't sit in a stale "active" state.
	return isApprovalThresholdMet(proposal) ? 'pending_execution' : 'failed';
}

/**
 * Whether a wallet qualifies to vote on this proposal: it must hold at
 * least `minHoldingToVote` source keys and not have already voted.
 */
export function isQualifyingVoter(
	proposal: Pick<MergeProposal, 'minHoldingToVote' | 'userVote'>,
	holdingsCount: number
): boolean {
	if (proposal.userVote) return false;
	const threshold = Number.isFinite(proposal.minHoldingToVote)
		? proposal.minHoldingToVote
		: 1;
	return holdingsCount >= Math.max(1, threshold);
}
