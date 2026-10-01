import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CreatorRevenueCards from '../CreatorRevenueCards';
import type { CreatorRevenueSummary } from '@/types/creatorRevenue';

describe('CreatorRevenueCards', () => {
	it('renders summary cards for all revenue sources and total', () => {
		const summary: CreatorRevenueSummary = {
			creatorId: 'c-1',
			royaltiesEarned: 450.75,
			subscriptionFees: 200.5,
			dividendDeposits: 100.25,
			totalEarnings: 751.5,
			claimableProceeds: 300.0,
			totalWithdrawn: 451.5,
			lastUpdated: Date.now(),
		};

		render(<CreatorRevenueCards summary={summary} />);

		// Royalties
		expect(screen.getByText('Royalties Earned')).toBeInTheDocument();
		expect(screen.getByTestId('revenue-royalties-value')).toHaveTextContent(
			'450.75 XLM'
		);

		// Subscriptions
		expect(screen.getByText('Subscription Fees')).toBeInTheDocument();
		expect(
			screen.getByTestId('revenue-subscriptions-value')
		).toHaveTextContent('200.50 XLM');

		// Dividend deposits
		expect(screen.getByText('Dividend Deposits')).toBeInTheDocument();
		expect(screen.getByTestId('revenue-dividends-value')).toHaveTextContent(
			'100.25 XLM'
		);

		// Total revenue
		expect(screen.getByText('Total Revenue')).toBeInTheDocument();
		expect(screen.getByTestId('revenue-total-value')).toHaveTextContent(
			'751.50 XLM'
		);
	});

	it('renders skeleton placeholders while loading', () => {
		render(<CreatorRevenueCards isLoading={true} />);
		expect(screen.getByTestId('revenue-cards-skeleton')).toBeInTheDocument();
	});

	it('handles zero or missing values safely', () => {
		render(<CreatorRevenueCards summary={null} />);
		expect(screen.getByTestId('revenue-royalties-value')).toHaveTextContent(
			'0.00 XLM'
		);
		expect(
			screen.getByTestId('revenue-subscriptions-value')
		).toHaveTextContent('0.00 XLM');
		expect(screen.getByTestId('revenue-dividends-value')).toHaveTextContent(
			'0.00 XLM'
		);
		expect(screen.getByTestId('revenue-total-value')).toHaveTextContent(
			'0.00 XLM'
		);
	});
});
