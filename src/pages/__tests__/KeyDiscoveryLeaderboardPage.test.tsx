import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import KeyDiscoveryLeaderboardPage from '../KeyDiscoveryLeaderboardPage';
import { analyticsService } from '@/services/analytics.service';
import type { KeyLeaderboardEntry } from '@/services/analytics.service';

const mockUseAccount = vi.fn();
vi.mock('wagmi', () => ({
	useAccount: () => mockUseAccount(),
}));

vi.mock('@/services/analytics.service', async importOriginal => {
	const actual = await importOriginal<typeof import('@/services/analytics.service')>();
	return {
		...actual,
		analyticsService: {
			...actual.analyticsService,
			getKeyDiscoveryLeaderboard: vi.fn(),
		},
	};
});

const MOCK_VOLUME_KEYS: KeyLeaderboardEntry[] = [
	{
		rank: 1,
		id: 'key-1',
		name: 'Apex Trader',
		symbol: 'APEX',
		creator: { address: '0xMYWALLET123', name: 'My Creator' },
		metricValue: 125000,
		change24h: 14.5,
		price: 45.0,
	},
	{
		rank: 2,
		id: 'key-2',
		name: 'Stellar Nexus',
		symbol: 'NEXUS',
		creator: { address: 'GBPL7QW411912C', name: 'Nexus Studio' },
		metricValue: 88000,
		change24h: -3.2,
		price: 28.5,
	},
	{
		rank: 3,
		id: 'key-3',
		name: 'CyberPulse',
		symbol: 'CPULSE',
		creator: { address: 'GCKV8994MM332X', name: 'Cyber Labs' },
		metricValue: 54000,
		change24h: 0.0,
		price: 12.0,
	},
];

const MOCK_HOLDERS_KEYS: KeyLeaderboardEntry[] = [
	{
		rank: 1,
		id: 'key-2',
		name: 'Stellar Nexus',
		symbol: 'NEXUS',
		creator: { address: 'GBPL7QW411912C', name: 'Nexus Studio' },
		metricValue: 5200,
		change24h: 4.8,
		price: 28.5,
	},
	{
		rank: 2,
		id: 'key-1',
		name: 'Apex Trader',
		symbol: 'APEX',
		creator: { address: '0xMYWALLET123', name: 'My Creator' },
		metricValue: 3100,
		change24h: -1.2,
		price: 45.0,
	},
];

const MOCK_REPUTATION_KEYS: KeyLeaderboardEntry[] = [
	{
		rank: 1,
		id: 'key-3',
		name: 'CyberPulse',
		symbol: 'CPULSE',
		creator: { address: 'GCKV8994MM332X', name: 'Cyber Labs' },
		metricValue: 98.6,
		change24h: 6.2,
		price: 12.0,
	},
	{
		rank: 2,
		id: 'key-1',
		name: 'Apex Trader',
		symbol: 'APEX',
		creator: { address: '0xMYWALLET123', name: 'My Creator' },
		metricValue: 92.4,
		change24h: 0.0,
		price: 45.0,
	},
];

function renderPage(initialPath = '/discovery/leaderboard') {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<MemoryRouter initialEntries={[initialPath]}>
			<QueryClientProvider client={queryClient}>
				<KeyDiscoveryLeaderboardPage />
			</QueryClientProvider>
		</MemoryRouter>
	);
}

describe('KeyDiscoveryLeaderboardPage (#1206)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseAccount.mockReturnValue({
			address: undefined,
			isConnected: false,
		});
		vi.mocked(analyticsService.getKeyDiscoveryLeaderboard).mockImplementation(
			async (metric = 'volume') => {
				if (metric === 'holders') return MOCK_HOLDERS_KEYS;
				if (metric === 'reputation') return MOCK_REPUTATION_KEYS;
				return MOCK_VOLUME_KEYS;
			}
		);
	});

	it('renders correct ranked list for volume metric by default', async () => {
		renderPage();

		expect(
			screen.getByRole('heading', { name: /Top Performing Creator Keys/i })
		).toBeInTheDocument();

		await waitFor(() => {
			expect(screen.getByText('Apex Trader')).toBeInTheDocument();
			expect(screen.getByText('Stellar Nexus')).toBeInTheDocument();
			expect(screen.getByText('CyberPulse')).toBeInTheDocument();
		});

		// Check metric formatted value for volume
		expect(screen.getByTestId('metric-value-1')).toHaveTextContent(/125000\.00 XLM/i);
		expect(screen.getByTestId('metric-value-2')).toHaveTextContent(/88000\.00 XLM/i);
	});

	it('displays 24h change with correct positive, negative, and neutral formatting', async () => {
		renderPage();

		await waitFor(() => {
			expect(screen.getByText('Apex Trader')).toBeInTheDocument();
		});

		// Positive change has + sign
		expect(screen.getByText('+14.5%')).toBeInTheDocument();
		// Negative change has - sign
		expect(screen.getByText('-3.2%')).toBeInTheDocument();
		// Neutral change is 0.0% / 0%
		expect(screen.getByText(/0(\.0)?%/)).toBeInTheDocument();
	});

	it('highlights connected wallet creator own keys correctly', async () => {
		mockUseAccount.mockReturnValue({
			address: '0xMYWALLET123',
			isConnected: true,
		});

		renderPage();

		await waitFor(() => {
			expect(screen.getByText('Apex Trader')).toBeInTheDocument();
		});

		const ownKeyBadge = screen.getByTestId('own-key-badge');
		expect(ownKeyBadge).toBeInTheDocument();
		expect(ownKeyBadge).toHaveTextContent(/Your Key/i);
	});

	it('search correctly filters visible results by key name and creator', async () => {
		const user = userEvent.setup();
		renderPage();

		await waitFor(() => {
			expect(screen.getByText('Apex Trader')).toBeInTheDocument();
			expect(screen.getByText('Stellar Nexus')).toBeInTheDocument();
		});

		const searchInput = screen.getByTestId('leaderboard-search-input');
		await user.type(searchInput, 'Stellar');

		expect(screen.getByText('Stellar Nexus')).toBeInTheDocument();
		expect(screen.queryByText('Apex Trader')).not.toBeInTheDocument();
		expect(screen.queryByText('CyberPulse')).not.toBeInTheDocument();

		// Displays empty state when search finds no matches
		await user.clear(searchInput);
		await user.type(searchInput, 'NonExistentKeyxyz');

		expect(screen.getByTestId('leaderboard-empty-search')).toBeInTheDocument();
		expect(screen.getByText(/No creator keys found/i)).toBeInTheDocument();

		// Clicking clear search resets the search
		const clearButton = screen.getByTestId('clear-search-button');
		await user.click(clearButton);

		expect(screen.getByText('Apex Trader')).toBeInTheDocument();
	});

	it('metric tab switch correctly refetches and re-renders for all three metrics', async () => {
		const user = userEvent.setup();
		renderPage();

		await waitFor(() => {
			expect(screen.getByText('Apex Trader')).toBeInTheDocument();
		});
		expect(analyticsService.getKeyDiscoveryLeaderboard).toHaveBeenCalledWith('volume');

		// Switch to Holders tab
		const holdersTab = screen.getByTestId('tab-holders');
		await user.click(holdersTab);

		await waitFor(() => {
			expect(analyticsService.getKeyDiscoveryLeaderboard).toHaveBeenCalledWith('holders');
			expect(screen.getByText(/5\.2K holders|5,200 holders/i)).toBeInTheDocument();
		});

		// Switch to Reputation Score tab
		const reputationTab = screen.getByTestId('tab-reputation');
		await user.click(reputationTab);

		await waitFor(() => {
			expect(analyticsService.getKeyDiscoveryLeaderboard).toHaveBeenCalledWith('reputation');
			expect(screen.getByText(/98\.6 \/ 100/i)).toBeInTheDocument();
		});
	});
});
