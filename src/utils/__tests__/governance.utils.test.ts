import type { Proposal } from '@/types/governance';
import {
	getEligibleVotingWeight,
	getFinalProposalOutcome,
	getParticipationPercentage,
	getProposalOptions,
	getProposalOutcome,
	getProposalVoteTotal,
	isQuorumMet,
	normalizeProposal,
} from '@/utils/governance.utils';

function createProposal(overrides: Partial<Proposal> = {}): Proposal {
	return {
		id: 'proposal-1',
		creatorId: 'creator-1',
		title: 'Proposal',
		description: 'Description',
		status: 'active',
		quorumBps: 4000,
		eligibleVotingWeight: 200,
		totalCirculatingSupply: 100,
		totalVotingWeight: 0,
		startDate: '2026-09-01T00:00:00.000Z',
		endDate: '2026-09-08T00:00:00.000Z',
		forVotes: 0,
		againstVotes: 0,
		abstainVotes: 0,
		...overrides,
	};
}

describe('governance utilities', () => {
	it('calculates participation from explicit eligible voting weight', () => {
		const proposal = createProposal({
			eligibleVotingWeight: 80,
			totalCirculatingSupply: 100,
			totalVotingWeight: 20,
		});

		expect(getEligibleVotingWeight(proposal)).toBe(80);
		expect(getParticipationPercentage(20, 80)).toBe(25);
	});

	it('falls back to circulating supply when eligible weight is unavailable', () => {
		const proposal = createProposal({
			eligibleVotingWeight: undefined,
			totalCirculatingSupply: 250,
		});

		expect(getEligibleVotingWeight(proposal)).toBe(250);
	});

	it('handles an empty or invalid eligible voting weight', () => {
		expect(getParticipationPercentage(25, 0)).toBe(0);
		expect(getParticipationPercentage(Number.NaN, 100)).toBe(0);
		expect(
			getEligibleVotingWeight(createProposal({ eligibleVotingWeight: -1 }))
		).toBe(0);
	});

	it('evaluates quorum at the exact threshold', () => {
		expect(isQuorumMet(40, 100, 4000)).toBe(true);
		expect(isQuorumMet(39.99, 100, 4000)).toBe(false);
	});

	it.each([
		['active', 'active'],
		['passed', 'passed'],
		['executed', 'passed'],
		['cancelled', 'failed'],
	] as const)('resolves the %s proposal state', (status, expected) => {
		const proposal = createProposal({ status, totalVotingWeight: 80 });
		expect(getProposalOutcome(proposal)).toBe(expected);
	});

	it('distinguishes a failed vote from a quorum failure', () => {
		expect(
			getProposalOutcome(
				createProposal({ status: 'rejected', totalVotingWeight: 80 })
			)
		).toBe('failed');
		expect(
			getProposalOutcome(
				createProposal({ status: 'rejected', totalVotingWeight: 20 })
			)
		).toBe('quorum_not_met');
	});

	it('uses the server outcome when one is provided', () => {
		expect(
			getProposalOutcome(
				createProposal({
					status: 'rejected',
					outcome: 'passed',
					totalVotingWeight: 20,
				})
			)
		).toBe('passed');
	});
});

describe('governance proposal normalisation', () => {
	it('normalizes arbitrary on-chain options and closed result metadata', () => {
		const proposal = normalizeProposal({
			proposalId: 'server-proposal-1',
			title: 'Choose a direction',
			status: 'closed',
			creatorAddress:
				'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4',
			pollId: '42',
			options: ['Ship it', 'Keep building'],
			results: { 'Ship it': '70', 'Keep building': '30' },
			totalVotingWeight: 100,
			totalCirculatingSupply: 100,
			quorumBps: 5000,
			startDate: '2026-01-01T00:00:00.000Z',
			endDate: '2026-01-02T00:00:00.000Z',
		});

		expect(proposal.id).toBe('server-proposal-1');
		expect(proposal.pollId).toBe(42);
		expect(proposal.status).toBe('closed');
		expect(getProposalOptions(proposal)).toEqual([
			{ label: 'Ship it', weight: 70 },
			{ label: 'Keep building', weight: 30 },
		]);
		expect(
			getParticipationPercentage(getProposalVoteTotal(proposal), 100)
		).toBe(100);
		expect(getFinalProposalOutcome(proposal)).toBe('passed');
	});

	it('preserves legacy directional fields when options are not supplied', () => {
		const proposal = normalizeProposal({
			id: 'legacy-1',
			title: 'Legacy proposal',
			status: 'active',
			forVotes: 10,
			againstVotes: 5,
			abstainVotes: 1,
			startDate: '2026-01-01T00:00:00.000Z',
			endDate: '2099-01-01T00:00:00.000Z',
		});

		expect(getProposalOptions(proposal).map(option => option.label)).toEqual([
			'For',
			'Against',
			'Abstain',
		]);
		expect(proposal.totalVotingWeight).toBe(16);
	});

	it('reports a closed proposal with no quorum as failed to pass', () => {
		const proposal = normalizeProposal({
			id: 'closed-tie',
			status: 'closed',
			options: ['A', 'B'],
			voteCounts: [5, 5],
			quorumBps: 1000,
			totalCirculatingSupply: 100,
			startDate: '2026-01-01T00:00:00.000Z',
			endDate: '2026-01-02T00:00:00.000Z',
		});

		expect(getFinalProposalOutcome(proposal)).toBe('failed');
	});

	it('derives totals from option weights when API numeric fields are stale', () => {
		const proposal = normalizeProposal({
			id: 'stale-total',
			status: 'active',
			options: ['A', 'B'],
			voteCounts: ['3', '4'],
			totalVotingWeight: '0',
			pollId: '',
			startDate: '2026-01-01T00:00:00.000Z',
			endDate: '2099-01-01T00:00:00.000Z',
		});

		expect(proposal.pollId).toBeUndefined();
		expect(proposal.totalVotingWeight).toBe(7);
		expect(getProposalVoteTotal(proposal)).toBe(7);
	});
});
