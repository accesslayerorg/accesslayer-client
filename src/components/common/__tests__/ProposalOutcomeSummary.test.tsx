import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProposalOutcomeSummary from '@/components/common/ProposalOutcomeSummary';
import type { Proposal } from '@/types/governance';

function createProposal(overrides: Partial<Proposal> = {}): Proposal {
	return {
		id: 'proposal-1',
		creatorId: 'creator-1',
		title: 'Proposal',
		description: 'Description',
		status: 'active',
		quorumBps: 4000,
		eligibleVotingWeight: 80,
		totalCirculatingSupply: 100,
		totalVotingWeight: 20,
		startDate: '2026-09-01T00:00:00.000Z',
		endDate: '2026-09-08T00:00:00.000Z',
		forVotes: 12,
		againstVotes: 6,
		abstainVotes: 2,
		...overrides,
	};
}

describe('ProposalOutcomeSummary', () => {
	it('uses explicit eligible weight for the participation rate', () => {
		render(<ProposalOutcomeSummary proposal={createProposal()} />);

		expect(
			screen.getByTestId('proposal-participation-rate')
		).toHaveTextContent('25%');
		expect(screen.getByText(/of 80 eligible weight/i)).toBeInTheDocument();
		expect(
			screen.queryByTestId('proposal-final-outcome')
		).not.toBeInTheDocument();
	});

	it.each([
		['passed', 'Passed'],
		['cancelled', 'Failed'],
	] as const)('shows the final outcome for a %s proposal', (status, label) => {
		render(
			<ProposalOutcomeSummary
				proposal={createProposal({ status, totalVotingWeight: 80 })}
			/>
		);

		expect(
			screen.getByRole('region', { name: `Final outcome: ${label}` })
		).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: label })).toBeInTheDocument();
	});

	it('shows quorum not met separately from a failed vote', () => {
		render(
			<ProposalOutcomeSummary
				proposal={createProposal({
					status: 'rejected',
					totalVotingWeight: 20,
				})}
			/>
		);

		expect(
			screen.getByRole('region', { name: 'Final outcome: Quorum not met' })
		).toBeInTheDocument();
		expect(
			screen.queryByRole('heading', { name: 'Failed' })
		).not.toBeInTheDocument();
	});
});
