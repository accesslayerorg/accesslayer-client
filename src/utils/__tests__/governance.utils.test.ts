import { describe, expect, it } from 'vitest';
import {
	getParticipationRate,
	getProposalOutcome,
	getProposalVoteTotal,
	normalizeProposal,
} from '../governance.utils';

describe('governance proposal utilities', () => {
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
		expect(proposal.options).toEqual([
			{ label: 'Ship it', weight: 70 },
			{ label: 'Keep building', weight: 30 },
		]);
		expect(getParticipationRate(proposal)).toBe(100);
		expect(getProposalOutcome(proposal)).toBe('passed');
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

		expect(proposal.options.map(option => option.label)).toEqual([
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

		expect(getProposalOutcome(proposal)).toBe('failed');
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
