import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DistributionsPage from '../DistributionsPage';
import type {
	DistributionHistoryPage,
	DistributionRecord,
} from '@/services/distributionHistory.service';

const mocks = vi.hoisted(() => ({
	useAccount: vi.fn(),
	fetchDistributionHistory: vi.fn(),
	fetchDistributionOverview: vi.fn(),
}));

vi.mock('wagmi', () => ({
	useAccount: mocks.useAccount,
}));

vi.mock('@/components/common/ConnectWalletButton', () => ({
	default: () => (
		<button data-testid="connect-wallet-button">Connect Wallet</button>
	),
}));

vi.mock('@/services/distributionHistory.service', async importOriginal => {
	const actual =
		await importOriginal<
			typeof import('@/services/distributionHistory.service')
		>();
	return {
		...actual,
		fetchDistributionHistory: mocks.fetchDistributionHistory,
		fetchDistributionOverview: mocks.fetchDistributionOverview,
	};
});

vi.mock('recharts', async importOriginal => {
	const original = await importOriginal<typeof import('recharts')>();
	return {
		...original,
		ResponsiveContainer: ({ children }: { children?: ReactNode }) => (
			<div data-testid="distribution-chart-canvas">{children}</div>
		),
		BarChart: ({
			children,
			data,
		}: {
			children?: ReactNode;
			data?: unknown;
		}) => (
			<svg
				data-testid="distribution-bar-chart"
				data-chart-data={JSON.stringify(data)}
			>
				{children}
			</svg>
		),
		Bar: () => null,
		CartesianGrid: () => null,
		XAxis: () => null,
		YAxis: () => null,
		Tooltip: () => null,
	};
});

const WALLET = 'GTESTWALLET';

function makeRecord(
	id: string,
	keyName: string,
	amount: number,
	date = '2026-11-10T00:00:00.000Z'
): DistributionRecord {
	return { id, keyId: `key-${id}`, keyName, date, amount };
}

function makePage(
	items: DistributionRecord[],
	{ page = 1, totalPages = 1 }: { page?: number; totalPages?: number } = {}
): DistributionHistoryPage {
	return {
		items,
		page,
		pageSize: 10,
		total: items.length,
		totalPages,
	};
}

function renderPage() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<DistributionsPage />
		</QueryClientProvider>
	);
}

function currentMonthKey(): string {
	const now = new Date();
	return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

describe('DistributionsPage (#1259)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.useAccount.mockReturnValue({ address: WALLET, isConnected: true });
		mocks.fetchDistributionOverview.mockResolvedValue({
			totalReceived: 450,
			byType: { 'revenue-share': 250, dividend: 100, airdrop: 100 },
			monthly: [{ month: currentMonthKey(), amount: 120 }],
		});
		mocks.fetchDistributionHistory.mockResolvedValue(makePage([]));
	});

	it('prompts to connect a wallet when disconnected', () => {
		mocks.useAccount.mockReturnValue({
			address: undefined,
			isConnected: false,
		});

		renderPage();

		expect(
			screen.getByText('Connect your wallet to view your distributions.')
		).toBeInTheDocument();
		expect(mocks.fetchDistributionOverview).not.toHaveBeenCalled();
		expect(mocks.fetchDistributionHistory).not.toHaveBeenCalled();
	});

	it('renders the running total across all distribution types', async () => {
		renderPage();

		const total = await screen.findByTestId('distribution-running-total');
		expect(total).toHaveTextContent('450.00 XLM');
		expect(
			screen.getByTestId('distribution-total-revenue-share')
		).toHaveTextContent('250.00 XLM');
		expect(
			screen.getByTestId('distribution-total-dividend')
		).toHaveTextContent('100.00 XLM');
		expect(
			screen.getByTestId('distribution-total-airdrop')
		).toHaveTextContent('100.00 XLM');
	});

	it('renders a 12-month bar chart from the aggregated monthly data', async () => {
		renderPage();

		const chart = await screen.findByTestId('distribution-bar-chart');
		const chartData = JSON.parse(
			chart.getAttribute('data-chart-data') ?? '[]'
		) as Array<{ month: string; amount: number }>;

		expect(chartData).toHaveLength(12);
		expect(chartData[chartData.length - 1]).toMatchObject({
			month: currentMonthKey(),
			amount: 120,
		});
	});

	it('shows each tab’s history with key, date and amount', async () => {
		mocks.fetchDistributionHistory.mockImplementation(
			(_wallet: string, type: string) => {
				if (type === 'revenue-share') {
					return Promise.resolve(
						makePage([makeRecord('r1', 'Alpha Key', 25)])
					);
				}
				if (type === 'dividend') {
					return Promise.resolve(
						makePage([makeRecord('d1', 'Beta Key', 75)])
					);
				}
				return Promise.resolve(
					makePage([makeRecord('a1', 'Gamma Key', 110)])
				);
			}
		);

		renderPage();

		expect(await screen.findByText('Alpha Key')).toBeInTheDocument();
		expect(screen.getByText('Nov 10, 2026')).toBeInTheDocument();
		expect(screen.getAllByTestId('distribution-amount')[0]).toHaveTextContent(
			'+25.00 XLM'
		);

		fireEvent.mouseDown(screen.getByRole('tab', { name: 'Dividends' }));
		expect(await screen.findByText('Beta Key')).toBeInTheDocument();
		expect(screen.getAllByTestId('distribution-amount')[0]).toHaveTextContent(
			'+75.00 XLM'
		);

		fireEvent.mouseDown(screen.getByRole('tab', { name: 'Airdrops' }));
		expect(await screen.findByText('Gamma Key')).toBeInTheDocument();
		expect(screen.getAllByTestId('distribution-amount')[0]).toHaveTextContent(
			'+110.00 XLM'
		);
	});

	it('shows an individual empty state on each tab', async () => {
		renderPage();

		expect(
			await screen.findByTestId('distributions-revenue-share-empty')
		).toHaveTextContent('No revenue share distributions yet');

		fireEvent.mouseDown(screen.getByRole('tab', { name: 'Dividends' }));
		expect(
			await screen.findByTestId('distributions-dividend-empty')
		).toHaveTextContent('No dividend distributions yet');

		fireEvent.mouseDown(screen.getByRole('tab', { name: 'Airdrops' }));
		expect(
			await screen.findByTestId('distributions-airdrop-empty')
		).toHaveTextContent('No airdrop distributions yet');
	});

	it('paginates each tab independently', async () => {
		mocks.fetchDistributionHistory.mockImplementation(
			(_wallet: string, _type: string, page: number) =>
				Promise.resolve(
					makePage(
						page === 1
							? [makeRecord('r1', 'Alpha Key', 25)]
							: [makeRecord('r2', 'Delta Key', 50)],
						{ page, totalPages: 2 }
					)
				)
		);

		renderPage();

		expect(await screen.findByText('Alpha Key')).toBeInTheDocument();
		expect(
			screen.getByTestId('distributions-revenue-share-page')
		).toHaveTextContent('Page 1 of 2');

		fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

		expect(await screen.findByText('Delta Key')).toBeInTheDocument();
		expect(
			screen.getByTestId('distributions-revenue-share-page')
		).toHaveTextContent('Page 2 of 2');
		expect(mocks.fetchDistributionHistory).toHaveBeenCalledWith(
			WALLET,
			'revenue-share',
			2
		);

		fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));

		expect(await screen.findByText('Alpha Key')).toBeInTheDocument();
		expect(mocks.fetchDistributionHistory).toHaveBeenCalledWith(
			WALLET,
			'revenue-share',
			1
		);
	});
});
