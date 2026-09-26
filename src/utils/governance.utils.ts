import type {
	Proposal,
	ProposalOutcome,
	ProposalStatus,
} from '@/types/governance';

export type ProposalDisplayOutcome =
	'active' | 'passed' | 'failed' | 'quorum_not_met';

export function getEligibleVotingWeight(
	proposal: Pick<Proposal, 'eligibleVotingWeight' | 'totalCirculatingSupply'>
): number {
	const eligibleWeight = proposal.eligibleVotingWeight;
	if (typeof eligibleWeight === 'number' && Number.isFinite(eligibleWeight)) {
		return Math.max(0, eligibleWeight);
	}

	return Number.isFinite(proposal.totalCirculatingSupply)
		? Math.max(0, proposal.totalCirculatingSupply)
		: 0;
}

export function getParticipationPercentage(
	totalVotingWeight: number,
	eligibleVotingWeight: number
): number {
	if (
		!Number.isFinite(totalVotingWeight) ||
		!Number.isFinite(eligibleVotingWeight) ||
		totalVotingWeight <= 0 ||
		eligibleVotingWeight <= 0
	) {
		return 0;
	}

	return (totalVotingWeight / eligibleVotingWeight) * 100;
}

export function getQuorumPercentage(quorumBps: number): number {
	if (!Number.isFinite(quorumBps)) return 0;
	return Math.min(100, Math.max(0, quorumBps / 100));
}

export function isQuorumMet(
	totalVotingWeight: number,
	eligibleVotingWeight: number,
	quorumBps: number
): boolean {
	return (
		getParticipationPercentage(totalVotingWeight, eligibleVotingWeight) >=
		getQuorumPercentage(quorumBps)
	);
}

export function isProposalClosed(status: ProposalStatus): boolean {
	return status !== 'active';
}

export function isProposalOutcome(
	outcome: ProposalDisplayOutcome
): outcome is ProposalOutcome {
	return outcome !== 'active';
}

export function getProposalOutcome(proposal: Proposal): ProposalDisplayOutcome {
	if (!isProposalClosed(proposal.status)) return 'active';
	if (proposal.outcome) return proposal.outcome;
	if (proposal.status === 'passed' || proposal.status === 'executed') {
		return 'passed';
	}
	if (proposal.status === 'cancelled') return 'failed';

	return isQuorumMet(
		proposal.totalVotingWeight,
		getEligibleVotingWeight(proposal),
		proposal.quorumBps
	)
		? 'failed'
		: 'quorum_not_met';
}
