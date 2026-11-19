import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProposalDetailPage from '@/pages/ProposalDetailPage';
import { useGovernanceProposal } from '@/hooks/useGovernanceProposals';
import type { Proposal } from '@/types/governance';

vi.mock('@/hooks/useGovernanceProposals', () => ({
	useGovernanceProposal: vi.fn(),
}));

vi.mock('@/components/common/ProposalVoteHistory', () => ({
	default: () => <div>Vote history table</div>,
}));

const mockUseGovernanceProposal = vi.mocked(useGovernanceProposal);

const proposal: Proposal = {
	id: 'proposal-1',
	creatorId: '0xcreator000000000000000000000000000000000001',
	title: 'Fund community grants',
	description: 'Allocate funding to community grants.\nSecond paragraph.',
	status: 'rejected',
	quorumBps: 4000,
	eligibleVotingWeight: 80,
	totalCirculatingSupply: 100,
	totalVotingWeight: 20,
	startDate: '2026-09-01T00:00:00.000Z',
	endDate: '2026-09-08T00:00:00.000Z',
	forVotes: 12,
	againstVotes: 6,
	abstainVotes: 2,
};

describe('ProposalDetailPage', () => {
	beforeEach(() => {
		mockUseGovernanceProposal.mockReset();
	});

	it('renders the full proposal, final outcome, participation, and vote history', async () => {
		mockUseGovernanceProposal.mockReturnValue({
			data: proposal,
			error: null,
			isLoading: false,
			refetch: vi.fn(),
		} as ReturnType<typeof useGovernanceProposal>);

		render(
			<MemoryRouter initialEntries={['/governance/proposal-1']}>
				<Routes>
					<Route
						path="/governance/:proposalId"
						element={<ProposalDetailPage />}
					/>
				</Routes>
			</MemoryRouter>
		);

		expect(
			await screen.findByRole('heading', { name: 'Fund community grants' })
		).toBeInTheDocument();
		expect(
			screen.getByText(/Allocate funding to community grants\./)
		).toBeInTheDocument();
		expect(
			screen.getByRole('region', { name: 'Final outcome: Quorum not met' })
		).toBeInTheDocument();
		expect(
			screen.getByTestId('proposal-participation-rate')
		).toHaveTextContent('25%');
		expect(screen.getByText('Vote history table')).toBeInTheDocument();
		expect(document.title).toBe('Fund community grants — AccessLayer');
	});
});
