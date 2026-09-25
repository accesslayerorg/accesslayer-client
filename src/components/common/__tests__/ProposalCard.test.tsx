import { MemoryRouter } from 'react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProposalCard from '../ProposalCard';
import { normalizeProposal } from '@/utils/governance.utils';

const proposal = normalizeProposal({
	id: 'proposal-42',
	title: 'Choose a treasury policy',
	description: 'Review the proposed policy.',
	status: 'active',
	creatorId: 'creator-1',
	options: ['Approve', 'Reject'],
	voteCounts: [12, 8],
	totalCirculatingSupply: 100,
	quorumBps: 5000,
	startDate: '2026-01-01T00:00:00.000Z',
	endDate: '2099-01-01T00:00:00.000Z',
});

describe('ProposalCard', () => {
	it('links to the proposal detail route and renders arbitrary options', () => {
		render(
			<MemoryRouter>
				<ProposalCard proposal={proposal} />
			</MemoryRouter>
		);

		expect(
			screen.getByRole('link', { name: 'View Choose a treasury policy' })
		).toHaveAttribute('href', '/governance/proposals/proposal-42');
		expect(screen.getByText('Approve')).toBeInTheDocument();
		expect(screen.getByText('Reject')).toBeInTheDocument();
	});
});
