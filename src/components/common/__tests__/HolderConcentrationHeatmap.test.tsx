import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HolderConcentrationHeatmap from '@/components/common/HolderConcentrationHeatmap';
import type { HolderConcentration } from '@/services/holderConcentration.service';

// recharts needs real layout sizes; render the data it receives instead.
vi.mock('recharts', () => {
	const Passthrough = ({ children }: { children?: React.ReactNode }) => (
		<div>{children}</div>
	);
	return {
		ResponsiveContainer: Passthrough,
		PieChart: ({ children }: { children?: React.ReactNode }) => (
			<div data-testid="mock-pie-chart">{children}</div>
		),
		Pie: ({ children }: { children?: React.ReactNode }) => (
			<div data-testid="mock-pie">{children}</div>
		),
		Cell: ({ 'data-testid': testId }: { 'data-testid'?: string }) => (
			<div data-testid={testId} />
		),
		Tooltip: () => null,
	};
});

const getHolderConcentration = vi.fn();
vi.mock('@/services/holderConcentration.service', () => ({
	holderConcentrationService: {
		getHolderConcentration: (...args: unknown[]) =>
			getHolderConcentration(...args),
	},
}));

function concentration(
	over: Partial<HolderConcentration> = {}
): HolderConcentration {
	return {
		uniqueHolderCount: 42,
		tiers: [
			{ tier: 'whale', sharePercent: 60, walletCount: 2 },
			{ tier: 'midTier', sharePercent: 25, walletCount: 10 },
			{ tier: 'retail', sharePercent: 15, walletCount: 30 },
		],
		topHolders: [
			{
				id: 'h1',
				walletAddress: 'GABCDE1234567890ABCDE1234567890ABCDE1234567890ABCDEF',
				keyCount: 50,
				sharePercent: 40,
			},
			{
				id: 'h2',
				walletAddress: 'GBBBBB1234567890ABCDE1234567890ABCDE1234567890ABCDEF',
				keyCount: 25,
				sharePercent: 20,
			},
		],
		...over,
	};
}

function renderHeatmap(keyId = 'key-1') {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<QueryClientProvider client={client}>
			<HolderConcentrationHeatmap keyId={keyId} />
		</QueryClientProvider>
	);
	return client;
}

describe('HolderConcentrationHeatmap', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders the unique holder count, tier segments, and top holders table', async () => {
		getHolderConcentration.mockResolvedValue(concentration());
		renderHeatmap();

		await waitFor(() =>
			expect(
				screen.getByTestId('holder-concentration-unique-count')
			).toHaveTextContent('42')
		);

		expect(
			screen.getByTestId('holder-concentration-segment-whale')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('holder-concentration-segment-midTier')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('holder-concentration-segment-retail')
		).toBeInTheDocument();

		expect(
			screen.getByTestId('holder-concentration-legend-whale')
		).toHaveTextContent('60%');
		expect(
			screen.getByTestId('holder-concentration-legend-midTier')
		).toHaveTextContent('25%');
		expect(
			screen.getByTestId('holder-concentration-legend-retail')
		).toHaveTextContent('15%');

		const rows = screen.getAllByTestId('holder-concentration-top-holder-row');
		expect(rows).toHaveLength(2);
		expect(rows[0]).toHaveTextContent('GABCDE…ABCDEF');
		expect(rows[0]).toHaveTextContent('40%');
	});

	it('caps the top holders table at 5 rows even if more are returned', async () => {
		const topHolders = Array.from({ length: 8 }, (_, i) => ({
			id: `h${i}`,
			walletAddress: `G${String(i).padEnd(55, 'A')}`,
			keyCount: 10 - i,
			sharePercent: 10 - i,
		}));
		getHolderConcentration.mockResolvedValue(
			concentration({ topHolders })
		);
		renderHeatmap();

		await waitFor(() =>
			expect(
				screen.getAllByTestId('holder-concentration-top-holder-row')
			).toHaveLength(5)
		);
	});

	it('shows an empty state when a tier is missing from the response instead of crashing', async () => {
		getHolderConcentration.mockResolvedValue(
			concentration({
				tiers: [{ tier: 'whale', sharePercent: 100, walletCount: 1 }],
			})
		);
		renderHeatmap();

		await waitFor(() =>
			expect(
				screen.getByTestId('holder-concentration-legend-midTier')
			).toHaveTextContent('0%')
		);
		expect(
			screen.getByTestId('holder-concentration-legend-retail')
		).toHaveTextContent('0%');
	});

	it('shows an empty state when there is no holder data at all', async () => {
		getHolderConcentration.mockResolvedValue(
			concentration({
				tiers: [
					{ tier: 'whale', sharePercent: 0, walletCount: 0 },
					{ tier: 'midTier', sharePercent: 0, walletCount: 0 },
					{ tier: 'retail', sharePercent: 0, walletCount: 0 },
				],
				topHolders: [],
			})
		);
		renderHeatmap();

		await waitFor(() =>
			expect(
				screen.getByTestId('holder-concentration-heatmap-no-data')
			).toBeInTheDocument()
		);
		expect(screen.getByText('No holders yet.')).toBeInTheDocument();
	});

	it('shows an empty state when the request fails', async () => {
		getHolderConcentration.mockRejectedValue(new Error('network error'));
		renderHeatmap();

		await waitFor(() =>
			expect(
				screen.getByTestId('holder-concentration-heatmap-empty')
			).toBeInTheDocument()
		);
	});

	it('shows a loading skeleton before data resolves', () => {
		getHolderConcentration.mockReturnValue(new Promise(() => {}));
		renderHeatmap();

		expect(
			screen.getByTestId('holder-concentration-heatmap-loading')
		).toBeInTheDocument();
	});
});
