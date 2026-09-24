import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProtocolRevenueDistributionTable from '../ProtocolRevenueDistributionTable';
import * as stakerRevenueService from '@/services/stakerRevenue.service';

const WALLET = 'GDEMOWALLET0000000000000000000000000000000000000000000000001';

function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});
}

describe('ProtocolRevenueDistributionTable', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('displays empty state when no distributions exist', async () => {
		vi.spyOn(
			stakerRevenueService,
			'fetchProtocolRevenuePage'
		).mockResolvedValueOnce({
			distributions: [],
			nextCursor: null,
		});

		const queryClient = createQueryClient();
		render(
			<QueryClientProvider client={queryClient}>
				<ProtocolRevenueDistributionTable walletAddress={WALLET} />
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(
				screen.getByText('No protocol revenue distributions yet')
			).toBeInTheDocument();
		});

		expect(
			screen.getByTestId('protocol-revenue-history-empty')
		).toBeInTheDocument();
	});

	it('displays required columns and sorts rows by distributionDate descending', async () => {
		const mockData: stakerRevenueService.ProtocolRevenueDistribution[] = [
			{
				id: 'dist-1',
				distributionDate: '2026-08-15T12:00:00Z',
				totalDistributed: 1000,
				stakerCount: 50,
				amountReceived: 20,
			},
			{
				id: 'dist-2',
				distributionDate: '2026-09-20T12:00:00Z',
				totalDistributed: 5000,
				stakerCount: 120,
				amountReceived: 41.6667,
			},
			{
				id: 'dist-3',
				distributionDate: '2026-09-01T12:00:00Z',
				totalDistributed: 2500,
				stakerCount: 80,
				amountReceived: 31.25,
			},
		];

		vi.spyOn(
			stakerRevenueService,
			'fetchProtocolRevenuePage'
		).mockResolvedValueOnce({
			distributions: mockData,
			nextCursor: null,
		});

		const queryClient = createQueryClient();
		render(
			<QueryClientProvider client={queryClient}>
				<ProtocolRevenueDistributionTable walletAddress={WALLET} />
			</QueryClientProvider>
		);

		await waitFor(() => {
			const rows = screen.getAllByTestId('protocol-revenue-row');
			expect(rows).toHaveLength(3);
		});

		const dates = screen.getAllByTestId('distribution-date');
		const totals = screen.getAllByTestId('total-distributed');
		const stakers = screen.getAllByTestId('staker-count');
		const amounts = screen.getAllByTestId('amount-received');

		// Check sorting: Sept 20, then Sept 1, then Aug 15
		expect(dates[0].textContent).toContain('Sep 20, 2026');
		expect(dates[1].textContent).toContain('Sep 1, 2026');
		expect(dates[2].textContent).toContain('Aug 15, 2026');

		// Check column values for Sept 20 (dist-2)
		expect(totals[0].textContent).toBe('5,000 XLM');
		expect(stakers[0].textContent).toBe('120');
		expect(amounts[0].textContent).toBe('+41.6667 XLM');

		// Check column values for Sept 1 (dist-3)
		expect(totals[1].textContent).toBe('2,500 XLM');
		expect(stakers[1].textContent).toBe('80');
		expect(amounts[1].textContent).toBe('+31.2500 XLM');
	});

	it('loads next page correctly using cursor pagination', async () => {
		const spy = vi
			.spyOn(stakerRevenueService, 'fetchProtocolRevenuePage')
			.mockResolvedValueOnce({
				distributions: [
					{
						id: 'dist-page1',
						distributionDate: '2026-09-20T12:00:00Z',
						totalDistributed: 5000,
						stakerCount: 100,
						amountReceived: 50,
					},
				],
				nextCursor: 'cursor-page-2',
			})
			.mockResolvedValueOnce({
				distributions: [
					{
						id: 'dist-page2',
						distributionDate: '2026-09-10T12:00:00Z',
						totalDistributed: 3000,
						stakerCount: 60,
						amountReceived: 50,
					},
				],
				nextCursor: null,
			});

		const queryClient = createQueryClient();
		render(
			<QueryClientProvider client={queryClient}>
				<ProtocolRevenueDistributionTable walletAddress={WALLET} />
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(
				screen.getByTestId('protocol-revenue-load-more')
			).toBeInTheDocument();
		});

		expect(screen.getAllByTestId('protocol-revenue-row')).toHaveLength(1);

		const loadMoreBtn = screen.getByTestId('protocol-revenue-load-more');
		fireEvent.click(loadMoreBtn);

		await waitFor(() => {
			expect(screen.getAllByTestId('protocol-revenue-row')).toHaveLength(2);
		});

		expect(spy).toHaveBeenCalledTimes(2);
		expect(spy).toHaveBeenLastCalledWith(WALLET, 'cursor-page-2');
		expect(
			screen.queryByTestId('protocol-revenue-load-more')
		).not.toBeInTheDocument();
	});
});
