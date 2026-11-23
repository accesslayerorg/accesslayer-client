import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import React, { type ReactNode } from 'react';
import CreatorEarningsPage from '../CreatorEarningsPage';
import { aggregateEarningsSummary } from '@/utils/creatorEarnings.utils';
import type { CreatorEarningsRecord } from '@/types/creatorEarnings';

const mocks = vi.hoisted(() => ({
	useAccount: vi.fn(),
	useCreatorEarnings: vi.fn(),
	claimMutation: {
		mutate: vi.fn(),
		isPending: false,
		variables: undefined as { stream: string } | undefined,
	},
}));

vi.mock('wagmi', () => ({
	useAccount: mocks.useAccount,
}));

vi.mock('@/hooks/useCreatorEarnings', () => ({
	useCreatorEarnings: mocks.useCreatorEarnings,
	useClaimEarningsStreamMutation: () => mocks.claimMutation,
}));

vi.mock('@/components/common/ConnectWalletButton', () => ({
	default: () => <button data-testid="connect-wallet-button">Connect</button>,
}));

vi.mock('recharts', async importOriginal => {
	const original = await importOriginal<typeof import('recharts')>();
	return {
		...original,
		ResponsiveContainer: vi.fn(({ children }: { children?: ReactNode }) => (
			<div>{children}</div>
		)),
		LineChart: vi.fn(({ children }: { children?: ReactNode }) => (
			<div>{children}</div>
		)),
		Line: vi.fn(() => null),
		CartesianGrid: vi.fn(() => null),
		XAxis: vi.fn(() => null),
		YAxis: vi.fn(() => null),
		Tooltip: vi.fn(() => null),
	};
});

const CREATOR_ID = 'creator-123';

const records: CreatorEarningsRecord[] = [
	{
		id: 'r1',
		creatorId: CREATOR_ID,
		stream: 'royalties',
		earnedAt: '2026-11-22T00:00:00.000Z',
		amountXlm: 12.5,
		status: 'unclaimed',
	},
	{
		id: 'r2',
		creatorId: CREATOR_ID,
		stream: 'tips',
		earnedAt: '2026-11-21T00:00:00.000Z',
		amountXlm: 18,
		status: 'unclaimed',
	},
	{
		id: 'r3',
		creatorId: CREATOR_ID,
		stream: 'subscriptions',
		earnedAt: '2026-11-20T00:00:00.000Z',
		amountXlm: 65,
		status: 'unclaimed',
	},
	{
		id: 'r4',
		creatorId: CREATOR_ID,
		stream: 'spotlight',
		earnedAt: '2026-11-19T00:00:00.000Z',
		amountXlm: 90,
		status: 'unclaimed',
	},
];

function renderPage() {
	return render(
		<MemoryRouter initialEntries={[`/creator/${CREATOR_ID}/earnings`]}>
			<Routes>
				<Route
					path="/creator/:id/earnings"
					element={<CreatorEarningsPage />}
				/>
			</Routes>
		</MemoryRouter>
	);
}

describe('CreatorEarningsPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.useAccount.mockReturnValue({
			address: 'GWALLET',
			isConnected: true,
		});
		mocks.useCreatorEarnings.mockReturnValue({
			data: aggregateEarningsSummary(CREATOR_ID, records),
			isLoading: false,
		});
		mocks.claimMutation.mutate.mockReset();
		mocks.claimMutation.isPending = false;
		mocks.claimMutation.variables = undefined;
	});

	it('renders all four stream balances and the combined total unclaimed', () => {
		renderPage();

		expect(screen.getByTestId('total-unclaimed-value')).toHaveTextContent(
			'185.50 XLM'
		);
		expect(
			screen.getByTestId('earnings-royalties-unclaimed')
		).toHaveTextContent('12.50 XLM');
		expect(screen.getByTestId('earnings-tips-unclaimed')).toHaveTextContent(
			'18.00 XLM'
		);
		expect(
			screen.getByTestId('earnings-subscriptions-unclaimed')
		).toHaveTextContent('65.00 XLM');
		expect(
			screen.getByTestId('earnings-spotlight-unclaimed')
		).toHaveTextContent('90.00 XLM');
	});

	it('renders the combined chart and per-stream breakdown table', () => {
		renderPage();

		expect(screen.getByTestId('earnings-chart')).toBeInTheDocument();
		expect(screen.getByTestId('earnings-table')).toBeInTheDocument();
		expect(screen.getByTestId('earnings-record-r1')).toHaveTextContent(
			'Royalties'
		);
		expect(screen.getByTestId('earnings-record-r4')).toHaveTextContent(
			'Spotlight'
		);
	});

	it('submits the matching per-stream claim when each Claim button is used', () => {
		renderPage();

		fireEvent.click(screen.getByTestId('claim-earnings-tips'));
		expect(mocks.claimMutation.mutate).toHaveBeenCalledWith({
			stream: 'tips',
			amountXlm: 18,
		});

		fireEvent.click(screen.getByTestId('claim-earnings-spotlight'));
		expect(mocks.claimMutation.mutate).toHaveBeenCalledWith({
			stream: 'spotlight',
			amountXlm: 90,
		});
	});

	it('disables claim buttons when no wallet is connected', () => {
		mocks.useAccount.mockReturnValue({
			address: undefined,
			isConnected: false,
		});

		renderPage();

		expect(screen.getByTestId('claim-earnings-royalties')).toBeDisabled();
		expect(screen.getByTestId('earnings-connect-prompt')).toBeInTheDocument();
	});
});
