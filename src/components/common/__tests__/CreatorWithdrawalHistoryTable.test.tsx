import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CreatorWithdrawalHistoryTable from '../CreatorWithdrawalHistoryTable';
import type { CreatorWithdrawalRecord } from '@/types/creatorRevenue';

describe('CreatorWithdrawalHistoryTable', () => {
	it('renders empty state when no withdrawals exist', () => {
		render(<CreatorWithdrawalHistoryTable withdrawals={[]} />);

		expect(
			screen.getByTestId('withdrawal-history-empty')
		).toBeInTheDocument();
		expect(screen.getByText('No withdrawals yet')).toBeInTheDocument();
	});

	it('renders table rows with amount, tx link, and status badge', () => {
		const mockWithdrawals: CreatorWithdrawalRecord[] = [
			{
				id: 'wd-1',
				creatorId: 'c1',
				amount: 125.5,
				timestamp: 1700000000000,
				transactionHash:
					'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
				status: 'confirmed',
			},
			{
				id: 'wd-2',
				creatorId: 'c1',
				amount: 45.0,
				timestamp: 1700000500000,
				transactionHash:
					'123456abcdef7890123456abcdef7890123456abcdef7890123456abcdef7890',
				status: 'pending',
			},
		];

		render(<CreatorWithdrawalHistoryTable withdrawals={mockWithdrawals} />);

		expect(screen.getByTestId('withdrawal-count-badge')).toHaveTextContent(
			'2 withdrawals'
		);
		expect(screen.getAllByTestId('withdrawal-history-row')).toHaveLength(2);

		// Amounts
		expect(
			screen.getAllByTestId('withdrawal-history-amount')[0]
		).toHaveTextContent('+125.50 XLM');

		// Transaction links
		const links = screen.getAllByTestId('withdrawal-history-tx-link');
		expect(links[0]).toHaveAttribute('href');
		expect(links[0].getAttribute('href')).toContain(
			'stellar.expert/explorer/'
		);
		expect(links[0].getAttribute('href')).toContain(
			'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'
		);

		// Status
		expect(
			screen.getByTestId('withdrawal-status-confirmed')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('withdrawal-status-pending')
		).toBeInTheDocument();
	});

	it('renders skeleton loading state', () => {
		render(<CreatorWithdrawalHistoryTable isLoading={true} />);
		expect(
			screen.getByTestId('withdrawal-history-skeleton')
		).toBeInTheDocument();
	});
});
