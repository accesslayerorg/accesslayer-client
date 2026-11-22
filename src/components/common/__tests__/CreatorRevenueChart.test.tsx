import React, { type ReactNode } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CreatorRevenueChart from '../CreatorRevenueChart';
import type { RevenueHistoryPoint } from '@/types/creatorRevenue';

vi.mock('recharts', async importOriginal => {
	const original = await importOriginal<typeof import('recharts')>();
	return {
		...original,
		ResponsiveContainer: vi.fn(({ children }: { children?: ReactNode }) => (
			<div data-testid="responsive-container">{children}</div>
		)),
		AreaChart: vi.fn(
			({ children, data }: { children?: ReactNode; data?: unknown }) => (
				<svg
					data-testid="area-chart"
					data-chart-data={JSON.stringify(data)}
				>
					{children}
				</svg>
			)
		),
		Area: vi.fn(() => <div data-testid="chart-area" />),
		CartesianGrid: vi.fn(() => null),
		XAxis: vi.fn(() => null),
		YAxis: vi.fn(() => null),
		Tooltip: vi.fn(() => null),
	};
});

describe('CreatorRevenueChart', () => {
	const mockData: RevenueHistoryPoint[] = [
		{
			timestamp: '2026-09-28T00:00:00Z',
			royalties: 120,
			subscriptionFees: 50,
			dividendDeposits: 30,
			total: 200,
		},
		{
			timestamp: '2026-09-28T06:00:00Z',
			royalties: 140,
			subscriptionFees: 60,
			dividendDeposits: 35,
			total: 235,
		},
	];

	it('renders interval options and switches time range on click', () => {
		const onIntervalChangeMock = vi.fn();
		render(
			<CreatorRevenueChart
				data={mockData}
				interval="24h"
				onIntervalChange={onIntervalChangeMock}
			/>
		);

		expect(
			screen.getByTestId('revenue-chart-interval-24h')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('revenue-chart-interval-7d')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('revenue-chart-interval-30d')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('revenue-chart-interval-all')
		).toBeInTheDocument();

		// Switch to 7D
		fireEvent.click(screen.getByTestId('revenue-chart-interval-7d'));
		expect(onIntervalChangeMock).toHaveBeenCalledWith('7d');

		// Switch to 30D
		fireEvent.click(screen.getByTestId('revenue-chart-interval-30d'));
		expect(onIntervalChangeMock).toHaveBeenCalledWith('30d');

		// Switch to ALL
		fireEvent.click(screen.getByTestId('revenue-chart-interval-all'));
		expect(onIntervalChangeMock).toHaveBeenCalledWith('all');
	});

	it('renders source legend indicators for Royalties, Subscriptions, Dividends, and Total', () => {
		render(
			<CreatorRevenueChart
				data={mockData}
				interval="24h"
				onIntervalChange={vi.fn()}
			/>
		);

		expect(screen.getByTestId('legend-royalties')).toHaveTextContent(
			'Royalties'
		);
		expect(screen.getByTestId('legend-subscriptions')).toHaveTextContent(
			'Subscription Fees'
		);
		expect(screen.getByTestId('legend-dividends')).toHaveTextContent(
			'Dividend Deposits'
		);
		expect(screen.getByTestId('legend-total')).toHaveTextContent('Total');
	});

	it('renders chart data points correctly', () => {
		render(
			<CreatorRevenueChart
				data={mockData}
				interval="24h"
				onIntervalChange={vi.fn()}
			/>
		);

		const chart = screen.getByTestId('area-chart');
		expect(chart).toHaveAttribute(
			'data-chart-data',
			JSON.stringify(mockData)
		);
	});

	it('renders skeleton loading state', () => {
		render(
			<CreatorRevenueChart
				isLoading={true}
				interval="24h"
				onIntervalChange={vi.fn()}
			/>
		);

		expect(screen.getByTestId('revenue-chart-skeleton')).toBeInTheDocument();
	});

	it('renders empty message when data is empty', () => {
		render(
			<CreatorRevenueChart
				data={[]}
				interval="24h"
				onIntervalChange={vi.fn()}
			/>
		);

		expect(screen.getByTestId('revenue-chart-empty')).toHaveTextContent(
			'No revenue data recorded for this time range yet'
		);
	});
});
