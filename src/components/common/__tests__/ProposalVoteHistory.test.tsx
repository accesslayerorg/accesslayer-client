import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccount } from 'wagmi';
import ProposalVoteHistory from '@/components/common/ProposalVoteHistory';
import { fetchProposalVotesPage } from '@/services/governance.service';

vi.mock('wagmi', () => ({
	useAccount: vi.fn(),
}));

vi.mock('@/services/governance.service', () => ({
	fetchProposalVotesPage: vi.fn(),
}));

const mockUseAccount = vi.mocked(useAccount);
const mockFetchVotes = vi.mocked(fetchProposalVotesPage);

function renderHistory() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<ProposalVoteHistory proposalId="proposal-1" />
		</QueryClientProvider>
	);
}

describe('ProposalVoteHistory', () => {
	beforeEach(() => {
		mockUseAccount.mockReturnValue({
			address: '0xAbC0000000000000000000000000000000000001',
		} as ReturnType<typeof useAccount>);
		mockFetchVotes.mockReset();
	});

	it('renders vote details and highlights the connected wallet vote', async () => {
		mockFetchVotes.mockResolvedValue({
			votes: [
				{
					id: 'vote-1',
					voter: '0xabc0000000000000000000000000000000000001',
					direction: 'for',
					weight: 12.5,
					timestamp: '2026-09-20T12:00:00.000Z',
				},
				{
					id: 'vote-2',
					voter: '0xdef0000000000000000000000000000000000002',
					direction: 'against',
					weight: 7.25,
					timestamp: '2026-09-20T13:00:00.000Z',
				},
			],
			nextCursor: null,
		});

		renderHistory();

		expect(
			await screen.findByText('0xabc0000000000000000000000000000000000001')
		).toBeInTheDocument();
		expect(screen.getByText('For')).toBeInTheDocument();
		expect(screen.getByText('Against')).toBeInTheDocument();
		expect(screen.getByText('12.5')).toBeInTheDocument();
		expect(screen.getByText('7.25')).toBeInTheDocument();

		const ownVote = screen
			.getByText('0xabc0000000000000000000000000000000000001')
			.closest('tr');
		expect(ownVote).toHaveAttribute('data-own-vote', 'true');
		expect(ownVote).toHaveAccessibleName(/your vote: for, weight 12.5/i);
	});

	it('loads the next page and appends its votes', async () => {
		const user = userEvent.setup();
		mockFetchVotes
			.mockResolvedValueOnce({
				votes: [
					{
						id: 'vote-1',
						voter: '0xabc0000000000000000000000000000000000001',
						direction: 'for',
						weight: 10,
						timestamp: '2026-09-20T12:00:00.000Z',
					},
				],
				nextCursor: 'cursor-2',
			})
			.mockResolvedValueOnce({
				votes: [
					{
						id: 'vote-2',
						voter: '0xdef0000000000000000000000000000000000002',
						direction: 'abstain',
						weight: 4,
						timestamp: '2026-09-21T12:00:00.000Z',
					},
				],
				nextCursor: null,
			});

		renderHistory();

		await user.click(
			await screen.findByRole('button', { name: /load more votes/i })
		);

		expect(
			await screen.findByText('0xdef0000000000000000000000000000000000002')
		).toBeInTheDocument();
		expect(screen.getAllByTestId('proposal-vote-row')).toHaveLength(2);
		expect(
			screen.queryByRole('button', { name: /load more votes/i })
		).not.toBeInTheDocument();
		expect(mockFetchVotes).toHaveBeenNthCalledWith(1, 'proposal-1', null);
		expect(mockFetchVotes).toHaveBeenNthCalledWith(
			2,
			'proposal-1',
			'cursor-2'
		);
	});
});
