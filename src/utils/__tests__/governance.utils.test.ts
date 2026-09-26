import { describe, expect, it } from 'vitest';
import type { Proposal } from '@/types/governance';
import {
	getEligibleVotingWeight,
	getParticipationPercentage,
	getProposalOutcome,
	isQuorumMet,
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
