import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import KeyHolderLeaderboardPanel from '../KeyHolderLeaderboardPanel';
import { courseService } from '@/services/course.service';

const createTestQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

describe('KeyHolderLeaderboardPanel (#1203)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders default Volume metric tab and ranked list with scores (AC 1)', async () => {
		const queryClient = createTestQueryClient();
		render(
			<QueryClientProvider client={queryClient}>
				<KeyHolderLeaderboardPanel keyId="test-key" />
			</QueryClientProvider>
		);

		// Metric tabs exist
		expect(
			screen.getByTestId('leaderboard-metric-tab-volume')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('leaderboard-metric-tab-pnl')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('leaderboard-metric-tab-holding_days')
		).toBeInTheDocument();

		// Default Volume tab is active
		expect(
			screen.getByTestId('leaderboard-metric-tab-volume')
		).toHaveAttribute('aria-selected', 'true');

		// Rows render with volume scores
		await waitFor(() => {
			const rows = screen.getAllByTestId('leaderboard-row');
			expect(rows.length).toBeGreaterThanOrEqual(10);
		});

		// Check score unit is XLM
		const scoreElements = screen.getAllByTestId('holder-score');
		expect(scoreElements[0].textContent).toContain('XLM');
	});

	it('displays gold, silver, and bronze medal icons for the top 3 rows (AC 2)', async () => {
		const queryClient = createTestQueryClient();
		render(
			<QueryClientProvider client={queryClient}>
				<KeyHolderLeaderboardPanel keyId="test-key" />
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(screen.getByTestId('medal-icon-gold')).toBeInTheDocument();
		});

		expect(screen.getByTestId('medal-icon-silver')).toBeInTheDocument();
		expect(screen.getByTestId('medal-icon-bronze')).toBeInTheDocument();

		// Rank 4 does not have a medal icon
		expect(screen.queryByTestId('medal-icon-4')).toBeNull();
		expect(screen.getByTestId('rank-number-4')).toHaveTextContent('4');
	});

	it('highlights connected wallet row when inside top 10 (AC 3)', async () => {
		const queryClient = createTestQueryClient();
		const topHolderAddress =
			'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYSFIZGK63PZZVVJAB7';

		render(
			<QueryClientProvider client={queryClient}>
				<KeyHolderLeaderboardPanel
					keyId="test-key"
					connectedWalletAddress={topHolderAddress}
				/>
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(screen.getByTestId('connected-wallet-badge')).toBeInTheDocument();
		});

		expect(screen.getByTestId('connected-wallet-badge')).toHaveTextContent('You');
		// Pinned row should NOT be present when user is in top 10
		expect(screen.queryByTestId('pinned-user-row')).toBeNull();
	});

	it('pins connected wallet row at bottom when user rank is outside top 10 (AC 3)', async () => {
		const queryClient = createTestQueryClient();
		const outsideWalletAddress =
			'GUSER_OUTSIDE_TOP_10_TEST_WALLET_ADDRESS_XXXXXXXXXXXXXX';

		render(
			<QueryClientProvider client={queryClient}>
				<KeyHolderLeaderboardPanel
					keyId="test-key"
					connectedWalletAddress={outsideWalletAddress}
				/>
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(screen.getByTestId('pinned-user-row')).toBeInTheDocument();
		});

		const pinnedRow = screen.getByTestId('pinned-user-row');
		expect(pinnedRow).toHaveTextContent('You');
		expect(pinnedRow.getAttribute('data-rank')).toBe('24');
	});

	it('fetches additional entries when Load More button is clicked (AC 4)', async () => {
		const queryClient = createTestQueryClient();
		render(
			<QueryClientProvider client={queryClient}>
				<KeyHolderLeaderboardPanel keyId="test-key" />
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(screen.getByTestId('leaderboard-load-more')).toBeInTheDocument();
		});

		const initialRows = screen.getAllByTestId('leaderboard-row').length;
		expect(initialRows).toBe(10);

		// Click Load More
		fireEvent.click(screen.getByTestId('leaderboard-load-more'));

		await waitFor(() => {
			const updatedRows = screen.getAllByTestId('leaderboard-row').length;
			expect(updatedRows).toBeGreaterThan(initialRows);
		});
	});

	it('switches metric tabs, refetches and re-renders corresponding rankings and scores (AC 5)', async () => {
		const queryClient = createTestQueryClient();
		render(
			<QueryClientProvider client={queryClient}>
				<KeyHolderLeaderboardPanel keyId="test-key" />
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(screen.getAllByTestId('leaderboard-row').length).toBe(10);
		});

		// Switch to PnL tab
		const pnlTab = screen.getByTestId('leaderboard-metric-tab-pnl');
		fireEvent.click(pnlTab);
		expect(pnlTab).toHaveAttribute('aria-selected', 'true');

		await waitFor(() => {
			const scores = screen.getAllByTestId('holder-score');
			expect(scores[0].textContent).toContain('%');
		});

		// Switch to Holding Days tab
		const holdingDaysTab = screen.getByTestId(
			'leaderboard-metric-tab-holding_days'
		);
		fireEvent.click(holdingDaysTab);
		expect(holdingDaysTab).toHaveAttribute('aria-selected', 'true');

		await waitFor(() => {
			const scores = screen.getAllByTestId('holder-score');
			expect(scores[0].textContent).toContain('day');
		});
	});

	it('renders empty state when no entries are returned', async () => {
		const queryClient = createTestQueryClient();
		vi.spyOn(courseService, 'getKeyHolderLeaderboard').mockResolvedValueOnce({
			entries: [],
			total: 0,
			hasMore: false,
			nextCursor: null,
			userRank: null,
		});

		render(
			<QueryClientProvider client={queryClient}>
				<KeyHolderLeaderboardPanel keyId="empty-key" />
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(screen.getByTestId('leaderboard-empty')).toBeInTheDocument();
		});
		expect(screen.getByTestId('leaderboard-empty')).toHaveTextContent(
			'No key holders recorded yet.'
		);
	});

	it('renders error state on query failure', async () => {
		const queryClient = createTestQueryClient();
		vi.spyOn(courseService, 'getKeyHolderLeaderboard').mockRejectedValueOnce(
			new Error('Network error')
		);

		render(
			<QueryClientProvider client={queryClient}>
				<KeyHolderLeaderboardPanel keyId="error-key" />
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(screen.getByTestId('leaderboard-error')).toBeInTheDocument();
		});
		expect(screen.getByTestId('leaderboard-error')).toHaveTextContent(
			'Failed to load leaderboard data.'
		);
	});
});
