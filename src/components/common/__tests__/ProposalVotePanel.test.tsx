import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { normalizeProposal } from '@/utils/governance.utils';

const hooks = vi.hoisted(() => ({
	useProposalSnapshotWeight: vi.fn(),
	useCastProposalVote: vi.fn(),
	useStellarWallet: vi.fn(),
}));

vi.mock('@/hooks/useGovernanceProposals', () => ({
	useProposalSnapshotWeight: hooks.useProposalSnapshotWeight,
	useCastProposalVote: hooks.useCastProposalVote,
}));

vi.mock('@/hooks/useStellarWallet', () => ({
	useStellarWallet: hooks.useStellarWallet,
}));

import { ProposalVotePanel } from '../ProposalVotePanel';

const proposal = normalizeProposal({
	id: 'proposal-1',
	title: 'Vote on the policy',
	status: 'active',
	creatorAddress: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4',
	pollId: 1,
	options: ['Approve', 'Reject'],
	voteCounts: [0, 0],
	startDate: '2026-01-01T00:00:00.000Z',
	endDate: '2099-01-01T00:00:00.000Z',
});

describe('ProposalVotePanel', () => {
	it('shows live weight and requires confirmation before submitting', () => {
		const mutate = vi.fn();
		hooks.useStellarWallet.mockReturnValue({
			address: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
			isConnected: true,
			loading: false,
			activeSigner: { type: 'software' },
		});
		hooks.useProposalSnapshotWeight.mockReturnValue({
			data: { weight: 10, isCaptured: false, source: 'balance' },
			isFetching: false,
			isError: false,
		});
		hooks.useCastProposalVote.mockReturnValue({
			mutate,
			isPending: false,
			isError: false,
		});

		render(<ProposalVotePanel proposal={proposal} />);

		expect(screen.getByText('10')).toBeInTheDocument();
		expect(
			screen.getByText(/Voting weight that will be locked on first vote/i)
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole('radio', { name: /Approve/ }));
		fireEvent.click(screen.getByRole('button', { name: 'Review vote' }));
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'Sign and submit' }));

		expect(mutate).toHaveBeenCalledWith(
			{ optionIndex: 0 },
			expect.objectContaining({ onSuccess: expect.any(Function) })
		);
	});
});
