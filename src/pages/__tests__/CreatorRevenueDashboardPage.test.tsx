import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import React from 'react';
import CreatorRevenueDashboardPage from '../CreatorRevenueDashboardPage';

const mocks = vi.hoisted(() => ({
	useAccount: vi.fn(),
	useCreatorDetail: vi.fn(),
	useCreatorRevenueSummary: vi.fn(),
	useCreatorRevenueHistory: vi.fn(),
	useCreatorWithdrawalHistory: vi.fn(),
	useWithdrawCreatorRevenueMutation: vi.fn(),
}));

vi.mock('wagmi', () => ({
	useAccount: mocks.useAccount,
}));

vi.mock('@/components/common/ConnectWalletButton', () => ({
	default: () => (
		<button data-testid="connect-wallet-button">Connect Wallet</button>
	),
}));

vi.mock('@/hooks/useCreators', () => ({
	useCreatorDetail: mocks.useCreatorDetail,
}));

vi.mock('@/hooks/useCreatorRevenue', () => ({
	useCreatorRevenueSummary: mocks.useCreatorRevenueSummary,
	useCreatorRevenueHistory: mocks.useCreatorRevenueHistory,
	useCreatorWithdrawalHistory: mocks.useCreatorWithdrawalHistory,
	useWithdrawCreatorRevenueMutation: mocks.useWithdrawCreatorRevenueMutation,
	useRevenueTimeRange: () => ({ interval: '24h', selectInterval: vi.fn() }),
	REVENUE_REFETCH_INTERVAL_MS: 60_000,
}));

vi.mock('@/components/common/CreatorRevenuePanel', () => ({
	default: ({ creatorId }: { creatorId: string }) => (
		<div data-testid="mock-revenue-panel">Revenue Panel for {creatorId}</div>
	),
}));

describe('CreatorRevenueDashboardPage', () => {
	const CREATOR_ID = 'creator-123';
	const mockCreator = {
		id: CREATOR_ID,
		title: 'Alice in Wonderland',
		creatorShareSupply: 100,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mocks.useAccount.mockReturnValue({
			address: '0x1234',
			isConnected: true,
		});
		mocks.useCreatorDetail.mockReturnValue({
			data: mockCreator,
			isLoading: false,
			isError: false,
		});
	});

	it('renders creator revenue dashboard with title, breadcrumbs, and revenue panel', () => {
		render(
			<MemoryRouter initialEntries={[`/creator/${CREATOR_ID}/revenue`]}>
				<Routes>
					<Route
						path="/creator/:id/revenue"
						element={<CreatorRevenueDashboardPage />}
					/>
				</Routes>
			</MemoryRouter>
		);

		expect(screen.getByTestId('revenue-dashboard-title')).toHaveTextContent(
			'Alice in Wonderland · Revenue'
		);
		expect(screen.getByTestId('back-to-dashboard-link')).toBeInTheDocument();
		expect(screen.getByTestId('mock-revenue-panel')).toHaveTextContent(
			`Revenue Panel for ${CREATOR_ID}`
		);
	});

	it('renders wallet connection callout when wallet is not connected', () => {
		mocks.useAccount.mockReturnValue({
			address: undefined,
			isConnected: false,
		});

		render(
			<MemoryRouter initialEntries={[`/creator/${CREATOR_ID}/revenue`]}>
				<Routes>
					<Route
						path="/creator/:id/revenue"
						element={<CreatorRevenueDashboardPage />}
					/>
				</Routes>
			</MemoryRouter>
		);

		expect(screen.getByTestId('revenue-connect-prompt')).toBeInTheDocument();
	});

	it('renders error state when creator fails to load', () => {
		mocks.useCreatorDetail.mockReturnValue({
			data: null,
			isLoading: false,
			isError: true,
		});

		render(
			<MemoryRouter initialEntries={[`/creator/${CREATOR_ID}/revenue`]}>
				<Routes>
					<Route
						path="/creator/:id/revenue"
						element={<CreatorRevenueDashboardPage />}
					/>
				</Routes>
			</MemoryRouter>
		);

		expect(screen.getByTestId('creator-revenue-error')).toBeInTheDocument();
	});
});
