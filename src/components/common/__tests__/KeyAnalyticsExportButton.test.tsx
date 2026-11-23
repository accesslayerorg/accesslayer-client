import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { downloadCsvMock, buildKeyAnalyticsExportFilenameMock } = vi.hoisted(() => ({
	downloadCsvMock: vi.fn(),
	buildKeyAnalyticsExportFilenameMock: vi.fn((creatorId, wallet, type) => `${type}-${creatorId}-${wallet}-test.csv`),
}));

vi.mock('@/utils/portfolioExport.utils', () => ({
	downloadCsv: downloadCsvMock,
	buildKeyAnalyticsExportFilename: buildKeyAnalyticsExportFilenameMock,
	generateTradeHistoryCsv: vi.fn(() => 'csv'),
	generateHoldingsSnapshotCsv: vi.fn(() => 'csv'),
	generateDistributionsCsv: vi.fn(() => 'csv'),
}));

import { KeyAnalyticsExportButton } from '@/components/common/KeyAnalyticsExportButton';

describe('KeyAnalyticsExportButton (#1256)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders with export label and download icon', () => {
		render(
			<KeyAnalyticsExportButton
				creatorId="creator1"
				walletAddress="wallet1"
				exportType="trade-history"
				dateRange={{ preset: '30d', from: Date.now(), to: Date.now() }}
				fetchData={vi.fn().mockResolvedValue([])}
				generateCsv={vi.fn().mockReturnValue('csv')}
				data-testid="test-export"
			/>
		);

		expect(screen.getByTestId('test-export')).toBeInTheDocument();
		expect(screen.getByText('Export Trade History')).toBeInTheDocument();
	});

	it('shows loading spinner during fetch', async () => {
		const fetchData = vi.fn().mockImplementation(() => new Promise(r => setTimeout(() => r([]), 100)));
		const generateCsv = vi.fn().mockReturnValue('csv');

		render(
			<KeyAnalyticsExportButton
				creatorId="creator1"
				walletAddress="wallet1"
				exportType="trade-history"
				dateRange={{ preset: '30d', from: Date.now(), to: Date.now() }}
				fetchData={fetchData}
				generateCsv={generateCsv}
				data-testid="test-export"
			/>
		);

		fireEvent.click(screen.getByTestId('test-export'));

		expect(screen.getByTestId('export-spinner')).toBeInTheDocument();
		expect(screen.getByTestId('test-export')).toBeDisabled();

		await waitFor(() => expect(screen.queryByTestId('export-spinner')).not.toBeInTheDocument());
	});

	it('shows success checkmark after successful export', async () => {
		const fetchData = vi.fn().mockResolvedValue([]);
		const generateCsv = vi.fn().mockReturnValue('csv');

		render(
			<KeyAnalyticsExportButton
				creatorId="creator1"
				walletAddress="wallet1"
				exportType="trade-history"
				dateRange={{ preset: '30d', from: Date.now(), to: Date.now() }}
				fetchData={fetchData}
				generateCsv={generateCsv}
				data-testid="test-export"
			/>
		);

		fireEvent.click(screen.getByTestId('test-export'));

		await waitFor(() => expect(screen.getByTestId('export-success')).toBeInTheDocument());
	});

	it('shows error icon on fetch failure', async () => {
		const fetchData = vi.fn().mockRejectedValue(new Error('Network error'));
		const generateCsv = vi.fn().mockReturnValue('csv');

		render(
			<KeyAnalyticsExportButton
				creatorId="creator1"
				walletAddress="wallet1"
				exportType="trade-history"
				dateRange={{ preset: '30d', from: Date.now(), to: Date.now() }}
				fetchData={fetchData}
				generateCsv={generateCsv}
				data-testid="test-export"
			/>
		);

		fireEvent.click(screen.getByTestId('test-export'));

		await waitFor(() => expect(screen.getByTestId('export-error')).toBeInTheDocument());
	});

	it('calls downloadCsv with correct filename and csv content', async () => {
		const fetchData = vi.fn().mockResolvedValue([{ test: 'data' }]);
		const generateCsv = vi.fn().mockReturnValue('header,data\r\nvalue1,value2');

		render(
			<KeyAnalyticsExportButton
				creatorId="creator1"
				walletAddress="wallet1"
				exportType="trade-history"
				dateRange={{ preset: '30d', from: Date.now(), to: Date.now() }}
				fetchData={fetchData}
				generateCsv={generateCsv}
				data-testid="test-export"
			/>
		);

		fireEvent.click(screen.getByTestId('test-export'));

		await waitFor(() => expect(downloadCsvMock).toHaveBeenCalledTimes(1));
		const [filename, csv] = downloadCsvMock.mock.calls[0];
		expect(filename).toBe('trade-history-creator1-wallet1-test.csv');
		expect(csv).toBe('header,data\r\nvalue1,value2');
	});

	it('does not trigger export when already loading', async () => {
		const fetchData = vi.fn().mockImplementation(() => new Promise(r => setTimeout(() => r([]), 100)));
		const generateCsv = vi.fn().mockReturnValue('csv');

		render(
			<KeyAnalyticsExportButton
				creatorId="creator1"
				walletAddress="wallet1"
				exportType="trade-history"
				dateRange={{ preset: '30d', from: Date.now(), to: Date.now() }}
				fetchData={fetchData}
				generateCsv={generateCsv}
				data-testid="test-export"
			/>
		);

		fireEvent.click(screen.getByTestId('test-export'));
		fireEvent.click(screen.getByTestId('test-export')); // Second click while loading

		await waitFor(() => expect(fetchData).toHaveBeenCalledTimes(1));
	});

	it('supports all export types', () => {
		const types = ['trade-history', 'distributions', 'analytics-summary'] as const;
		types.forEach(type => {
			render(
				<KeyAnalyticsExportButton
					creatorId="creator1"
					walletAddress="wallet1"
					exportType={type}
					dateRange={{ preset: '30d', from: Date.now(), to: Date.now() }}
					fetchData={vi.fn().mockResolvedValue([])}
					generateCsv={vi.fn().mockReturnValue('csv')}
					data-testid="test-export"
				/>
			);

			const label = type === 'trade-history' ? 'Trade History' : type === 'distributions' ? 'Distributions' : 'Analytics Summary';
			expect(screen.getByText(`Export ${label}`)).toBeInTheDocument();
		});
	});
});