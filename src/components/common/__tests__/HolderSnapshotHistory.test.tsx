import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HolderSnapshotHistory from '@/components/common/HolderSnapshotHistory';
import { HOLDER_SNAPSHOTS_STALE_TIME_MS } from '@/hooks/useHolderSnapshots';
import type { HolderSnapshot } from '@/services/holderSnapshots.service';

// recharts needs real layout sizes; render the data it receives instead.
vi.mock('recharts', () => {
	const Passthrough = ({ children }: { children?: React.ReactNode }) => (
		<div>{children}</div>
	);
	return {
		ResponsiveContainer: Passthrough,
		LineChart: ({
			data,
			children,
		}: {
			data: unknown[];
			children?: React.ReactNode;
		}) => (
			<div data-testid="mock-line-chart" data-points={JSON.stringify(data)}>
				{children}
			</div>
		),
		Line: ({ dataKey }: { dataKey: string }) => (
			<div data-testid="mock-line" data-key={dataKey} />
		),
		XAxis: ({ ticks }: { ticks?: number[] }) => (
			<div
				data-testid="mock-xaxis"
				data-ticks={JSON.stringify(ticks ?? null)}
			/>
		),
		YAxis: () => null,
		CartesianGrid: () => null,
		Tooltip: () => null,
	};
});

const getHolderSnapshots = vi.fn();
vi.mock('@/services/holderSnapshots.service', () => ({
	holderSnapshotsService: {
		getHolderSnapshots: (...args: unknown[]) => getHolderSnapshots(...args),
	},
}));

const NOW = Date.UTC(2026, 9, 17, 12, 0, 0);
const day = (n: number) =>
	new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();

function snap(
	daysAgo: number,
	over: Partial<HolderSnapshot> = {}
): HolderSnapshot {
	return {
		snapshotAt: day(daysAgo),
		holderCount: 100,
		topHolderPercent: 10,
		top10SharePercent: 40,
		giniCoefficient: 0.5,
		...over,
	};
}

function renderViewer() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<QueryClientProvider client={client}>
			<HolderSnapshotHistory keyId="key-1" />
		</QueryClientProvider>
	);
	return client;
}

function chartPoints(testId: string): Array<Record<string, number>> {
	const chart = screen.getByTestId(testId);
	return JSON.parse(
		chart
			.querySelector('[data-testid="mock-line-chart"]')!
			.getAttribute('data-points')!
	);
}

describe('HolderSnapshotHistory (#1107)', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(NOW);
		getHolderSnapshots.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('plots holder count and top-10 share, oldest to newest', async () => {
		getHolderSnapshots.mockResolvedValue([
			snap(1, { holderCount: 130, top10SharePercent: 35 }),
			snap(5, { holderCount: 100, top10SharePercent: 45 }),
			snap(3, { holderCount: 115, top10SharePercent: 40 }),
		]);
		renderViewer();

		await screen.findByTestId('holder-count-chart');
		const holders = chartPoints('holder-count-chart');
		expect(holders.map(p => p.holderCount)).toEqual([100, 115, 130]);
		const shares = chartPoints('top10-concentration-chart');
		expect(shares.map(p => p.top10SharePercent)).toEqual([45, 40, 35]);
		expect(
			screen
				.getByTestId('holder-count-chart')
				.querySelector('[data-testid="mock-line"]')
		).toHaveAttribute('data-key', 'holderCount');
	});

	it('requests the selected range and refetches when it changes', async () => {
		getHolderSnapshots.mockResolvedValue([snap(2), snap(4), snap(6)]);
		renderViewer();
		await screen.findByTestId('holder-count-chart');
		expect(getHolderSnapshots).toHaveBeenLastCalledWith('key-1', '30d');

		fireEvent.click(screen.getByTestId('snapshot-range-7d'));
		await waitFor(() =>
			expect(getHolderSnapshots).toHaveBeenLastCalledWith('key-1', '7d')
		);
		expect(screen.getByTestId('snapshot-range-7d')).toHaveAttribute(
			'aria-pressed',
			'true'
		);

		fireEvent.click(screen.getByTestId('snapshot-range-all'));
		await waitFor(() =>
			expect(getHolderSnapshots).toHaveBeenLastCalledWith('key-1', 'all')
		);
	});

	it('limits the points to the selected window', async () => {
		getHolderSnapshots.mockResolvedValue([
			snap(2, { holderCount: 1 }),
			snap(20, { holderCount: 2 }),
			snap(200, { holderCount: 3 }),
		]);
		renderViewer();
		await screen.findByTestId('holder-count-chart');
		// 30d default: the 200-day-old snapshot is outside the window.
		expect(chartPoints('holder-count-chart').map(p => p.holderCount)).toEqual(
			[2, 1]
		);

		fireEvent.click(screen.getByTestId('snapshot-range-all'));
		await waitFor(() =>
			expect(chartPoints('holder-count-chart')).toHaveLength(3)
		);
	});

	it('marks every snapshot date on the x-axis', async () => {
		getHolderSnapshots.mockResolvedValue([
			snap(1),
			snap(2),
			snap(3),
			snap(4),
		]);
		renderViewer();
		await screen.findByTestId('holder-count-chart');
		const ticks = JSON.parse(
			screen
				.getByTestId('holder-count-chart')
				.querySelector('[data-testid="mock-xaxis"]')!
				.getAttribute('data-ticks')!
		) as number[];
		const points = chartPoints('holder-count-chart').map(p => p.ts);
		expect(ticks).toEqual(points);
		expect(points[0]).toBe(NOW - 4 * 24 * 60 * 60 * 1000);
	});

	it('shows the latest snapshot in the stats card', async () => {
		getHolderSnapshots.mockResolvedValue([
			snap(10, {
				holderCount: 90,
				topHolderPercent: 20,
				giniCoefficient: 0.8,
			}),
			snap(1, {
				holderCount: 1250,
				topHolderPercent: 7.5,
				giniCoefficient: 0.42,
			}),
		]);
		renderViewer();
		await screen.findByTestId('holder-snapshot-stats');
		expect(screen.getByTestId('stat-total-holders')).toHaveTextContent(
			'1,250'
		);
		expect(screen.getByTestId('stat-top-holder')).toHaveTextContent('7.5%');
		expect(screen.getByTestId('stat-gini')).toHaveTextContent('0.42');
	});

	it('renders for keys with fewer than 3 snapshots', async () => {
		getHolderSnapshots.mockResolvedValue([snap(3), snap(1)]);
		renderViewer();
		await screen.findByTestId('holder-count-chart');
		expect(screen.getByTestId('holder-snapshot-sparse')).toHaveTextContent(
			/Only 2 snapshots/
		);
		expect(chartPoints('holder-count-chart')).toHaveLength(2);
		expect(chartPoints('top10-concentration-chart')).toHaveLength(2);
	});

	it('renders a single snapshot', async () => {
		getHolderSnapshots.mockResolvedValue([snap(1)]);
		renderViewer();
		await screen.findByTestId('holder-count-chart');
		expect(screen.getByTestId('holder-snapshot-sparse')).toHaveTextContent(
			/Only 1 snapshot so far/
		);
		expect(screen.getByTestId('stat-total-holders')).toHaveTextContent('100');
	});

	it('shows an empty message when there are no snapshots', async () => {
		getHolderSnapshots.mockResolvedValue([]);
		renderViewer();
		expect(
			await screen.findByTestId('holder-snapshot-empty')
		).toBeInTheDocument();
		expect(screen.queryByTestId('holder-count-chart')).toBeNull();
	});

	it('shows an error message when loading fails', async () => {
		getHolderSnapshots.mockRejectedValue(new Error('boom'));
		renderViewer();
		expect(
			await screen.findByTestId('holder-snapshot-error')
		).toBeInTheDocument();
	});

	it('caches results for 5 minutes', () => {
		expect(HOLDER_SNAPSHOTS_STALE_TIME_MS).toBe(5 * 60 * 1000);
	});
});
