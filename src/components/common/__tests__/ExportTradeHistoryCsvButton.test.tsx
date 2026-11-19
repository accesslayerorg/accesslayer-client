import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExportTradeHistoryCsvButton from '@/components/common/ExportTradeHistoryCsvButton';
import type { Trade } from '@/services/tradeHistory.service';

const mockUseAccount = vi.fn();
vi.mock('wagmi', () => ({
	useAccount: () => mockUseAccount(),
}));

const mockDownloadCsv = vi.fn();
vi.mock('@/utils/transactionHistory.utils', () => ({
	downloadCsv: (...args: unknown[]) => mockDownloadCsv(...args),
}));

const mockFetchAllTrades = vi.fn();
vi.mock('@/hooks/useAllTradeHistory', () => ({
	fetchAllTrades: (...args: unknown[]) => mockFetchAllTrades(...args),
}));

const WALLET = 'GDEMOWALLET0000000000000000000000000000000000000000000000001';

const sampleTrades: Trade[] = [
	{
		id: 'trade-1',
		keyName: 'Alpha Key',
		tradeType: 'Buy',
		quantity: 5,
		pricePerKey: 2,
		feeXlm: 0.1,
		timestamp: Date.parse('2026-10-20T10:00:00.000Z'),
		transactionHash: 'hash-1',
	},
	{
		id: 'trade-2',
		keyName: 'Beta Key',
		tradeType: 'Sell',
		quantity: 2,
		pricePerKey: 4,
		feeXlm: 0.05,
		timestamp: Date.parse('2026-10-21T15:30:00.000Z'),
		transactionHash: 'hash-2',
	},
];

describe('ExportTradeHistoryCsvButton (#857)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseAccount.mockReturnValue({
			address: WALLET,
			isConnected: true,
		});
		mockFetchAllTrades.mockResolvedValue(sampleTrades);
	});

	it('does not render when the user is not authenticated', () => {
		mockUseAccount.mockReturnValue({
			address: undefined,
			isConnected: false,
		});

		render(<ExportTradeHistoryCsvButton walletAddress={WALLET} />);

		expect(
			screen.queryByRole('button', { name: /export csv/i })
		).not.toBeInTheDocument();
	});

	it('renders the Export CSV button when user is authenticated', () => {
		render(<ExportTradeHistoryCsvButton walletAddress={WALLET} />);

		const button = screen.getByRole('button', { name: /export csv/i });
		expect(button).toBeInTheDocument();
		expect(button).not.toBeDisabled();
	});

	it('shows loading spinner and disables button while fetch is in progress', async () => {
		let resolveFetch: (trades: Trade[]) => void = () => {};
		const pendingPromise = new Promise<Trade[]>(resolve => {
			resolveFetch = resolve;
		});
		mockFetchAllTrades.mockReturnValue(pendingPromise);

		render(<ExportTradeHistoryCsvButton walletAddress={WALLET} />);

		const button = screen.getByRole('button', { name: /export csv/i });
		fireEvent.click(button);

		// Spinner should be visible and button disabled while fetching
		expect(
			screen.getByTestId('export-trade-history-spinner')
		).toBeInTheDocument();
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute('aria-busy', 'true');

		// Resolve fetch
		resolveFetch(sampleTrades);

		await waitFor(() => {
			expect(
				screen.queryByTestId('export-trade-history-spinner')
			).not.toBeInTheDocument();
			expect(button).not.toBeDisabled();
		});
	});

	it('fetches all trades for the wallet and downloads CSV with correct columns and filename', async () => {
		render(<ExportTradeHistoryCsvButton walletAddress={WALLET} />);

		const button = screen.getByRole('button', { name: /export csv/i });
		fireEvent.click(button);

		await waitFor(() => {
			expect(mockFetchAllTrades).toHaveBeenCalledWith(WALLET);
			expect(mockDownloadCsv).toHaveBeenCalledTimes(1);
		});

		const [filename, csv] = mockDownloadCsv.mock.calls[0] as [string, string];

		// Filename includes truncated wallet and current date
		expect(filename).toMatch(/^trades-GDEM…0001-\d{4}-\d{2}-\d{2}\.csv$/);

		// CSV contains correct columns and data
		const lines = csv.split('\r\n');
		expect(lines[0]).toBe(
			'Date,Key Name,Type,Quantity,Price per Key,Total,Fee'
		);
		expect(lines[1]).toBe(
			'2026-10-20T10:00:00.000Z,Alpha Key,Buy,5,2,10.1,0.1'
		);
		expect(lines[2]).toBe(
			'2026-10-21T15:30:00.000Z,Beta Key,Sell,2,4,7.95,0.05'
		);
	});

	it('handles fetch error gracefully and resets loading state', async () => {
		const consoleSpy = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {});
		mockFetchAllTrades.mockRejectedValue(new Error('Network error'));

		render(<ExportTradeHistoryCsvButton walletAddress={WALLET} />);

		const button = screen.getByRole('button', { name: /export csv/i });
		fireEvent.click(button);

		await waitFor(() => {
			expect(button).not.toBeDisabled();
			expect(
				screen.queryByTestId('export-trade-history-spinner')
			).not.toBeInTheDocument();
		});

		expect(mockDownloadCsv).not.toHaveBeenCalled();
		consoleSpy.mockRestore();
	});
});
