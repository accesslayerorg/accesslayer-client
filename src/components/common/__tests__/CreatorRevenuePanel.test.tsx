import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import CreatorRevenuePanel from '../CreatorRevenuePanel';
import type {
	CreatorRevenueSummary,
	CreatorWithdrawalRecord,
} from '@/types/creatorRevenue';

const mocks = vi.hoisted(() => ({
	useCreatorRevenueSummary: vi.fn(),
	useCreatorRevenueHistory: vi.fn(),
	useCreatorWithdrawalHistory: vi.fn(),
	useWithdrawCreatorRevenueMutation: vi.fn(),
	useRevenueTimeRange: vi.fn(),
}));

vi.mock('@/hooks/useCreatorRevenue', () => ({
	useCreatorRevenueSummary: mocks.useCreatorRevenueSummary,
	useCreatorRevenueHistory: mocks.useCreatorRevenueHistory,
	useCreatorWithdrawalHistory: mocks.useCreatorWithdrawalHistory,
	useWithdrawCreatorRevenueMutation: mocks.useWithdrawCreatorRevenueMutation,
	useRevenueTimeRange: mocks.useRevenueTimeRange,
	REVENUE_REFETCH_INTERVAL_MS: 60_000,
}));

vi.mock('recharts', async importOriginal => {
	const original = await importOriginal<typeof import('recharts')>();
	return {
		...original,
		ResponsiveContainer: vi.fn(({ children }: { children?: ReactNode }) => (
			<div>{children}</div>
		)),
		AreaChart: vi.fn(({ children }: { children?: ReactNode }) => (
			<div>{children}</div>
		)),
		Area: vi.fn(() => null),
		CartesianGrid: vi.fn(() => null),
		XAxis: vi.fn(() => null),
		YAxis: vi.fn(() => null),
		Tooltip: vi.fn(() => null),
	};
});

describe('CreatorRevenuePanel', () => {
	const CREATOR_ID = 'creator-test';
	const mutateMock = vi.fn();

	const defaultSummary: CreatorRevenueSummary = {
		creatorId: CREATOR_ID,
		royaltiesEarned: 350.0,
		subscriptionFees: 150.0,
		dividendDeposits: 50.0,
		totalEarnings: 550.0,
		claimableProceeds: 200.0,
		totalWithdrawn: 350.0,
		lastUpdated: Date.now(),
	};

	const defaultWithdrawals: CreatorWithdrawalRecord[] = [
		{
			id: 'wd-1',
			creatorId: CREATOR_ID,
			amount: 100,
			timestamp: 1700000000000,
			transactionHash: 'hash123',
			status: 'confirmed',
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();

		mocks.useCreatorRevenueSummary.mockReturnValue({
			data: defaultSummary,
			isLoading: false,
			isRefetching: false,
			refetch: vi.fn(),
		});

		mocks.useCreatorRevenueHistory.mockReturnValue({
			data: [],
			isLoading: false,
			isRefetching: false,
			refetch: vi.fn(),
		});

		mocks.useCreatorWithdrawalHistory.mockReturnValue({
			data: defaultWithdrawals,
			isLoading: false,
			refetch: vi.fn(),
		});

		mocks.useWithdrawCreatorRevenueMutation.mockReturnValue({
			mutate: mutateMock,
			isPending: false,
		});

		mocks.useRevenueTimeRange.mockReturnValue({
			interval: '24h',
			selectInterval: vi.fn(),
		});
	});

	it('renders claimable proceeds, auto-refresh indicator, and withdrawal action', () => {
		render(<CreatorRevenuePanel creatorId={CREATOR_ID} wallet="GWALLET" />);

		expect(screen.getByTestId('claimable-proceeds-amount')).toHaveTextContent(
			'200.00 XLM'
		);
		expect(screen.getByTestId('auto-refresh-indicator')).toHaveTextContent(
			'Refreshed every 60s'
		);
		expect(
			screen.getByTestId('withdraw-earnings-button')
		).toBeInTheDocument();
		expect(screen.getByTestId('withdraw-earnings-button')).not.toBeDisabled();
	});

	it('submits claim transaction when withdraw button is clicked', () => {
		render(<CreatorRevenuePanel creatorId={CREATOR_ID} wallet="GWALLET" />);

		const withdrawButton = screen.getByTestId('withdraw-earnings-button');
		fireEvent.click(withdrawButton);

		expect(mutateMock).toHaveBeenCalledWith(200.0);
	});

	it('disables withdraw button when claimable proceeds are zero', () => {
		mocks.useCreatorRevenueSummary.mockReturnValue({
			data: { ...defaultSummary, claimableProceeds: 0 },
			isLoading: false,
			isRefetching: false,
			refetch: vi.fn(),
		});

		render(<CreatorRevenuePanel creatorId={CREATOR_ID} wallet="GWALLET" />);

		const withdrawButton = screen.getByTestId('withdraw-earnings-button');
		expect(withdrawButton).toBeDisabled();
	});

	it('triggers manual refresh when refresh button is clicked', () => {
		const refetchSummary = vi.fn();
		const refetchHistory = vi.fn();
		const refetchWithdrawals = vi.fn();

		mocks.useCreatorRevenueSummary.mockReturnValue({
			data: defaultSummary,
			isLoading: false,
			isRefetching: false,
			refetch: refetchSummary,
		});

		mocks.useCreatorRevenueHistory.mockReturnValue({
			data: [],
			isLoading: false,
			isRefetching: false,
			refetch: refetchHistory,
		});

		mocks.useCreatorWithdrawalHistory.mockReturnValue({
			data: defaultWithdrawals,
			isLoading: false,
			refetch: refetchWithdrawals,
		});

		render(<CreatorRevenuePanel creatorId={CREATOR_ID} />);

		const refreshButton = screen.getByTestId('manual-refresh-button');
		fireEvent.click(refreshButton);

		expect(refetchSummary).toHaveBeenCalled();
		expect(refetchHistory).toHaveBeenCalled();
		expect(refetchWithdrawals).toHaveBeenCalled();
	});
});
