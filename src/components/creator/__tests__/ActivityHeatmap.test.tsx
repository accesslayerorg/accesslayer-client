import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityHeatmap } from '../ActivityHeatmap';
import { keyTradeService, type KeyTrade } from '@/services/keyTrades.service';
import { aggregateHeatmap, getLocalDayAndHour } from '@/hooks/useActivityHeatmap';

const mockTrades: KeyTrade[] = [
	{
		id: 't-1',
		keyId: 'creator-test',
		walletAddress: '0x123',
		type: 'buy',
		quantity: 10,
		price: 5, // Volume: 50
		timestamp: new Date('2026-06-15T14:30:00.000Z').getTime(), // Mon 14:30 UTC
	},
	{
		id: 't-2',
		keyId: 'creator-test',
		walletAddress: '0x456',
		type: 'sell',
		quantity: 20,
		price: 5, // Volume: 100
		timestamp: new Date('2026-06-15T14:45:00.000Z').getTime(), // Mon 14:45 UTC
	},
	{
		id: 't-3',
		keyId: 'creator-test',
		walletAddress: '0x789',
		type: 'buy',
		quantity: 5,
		price: 10, // Volume: 50
		timestamp: new Date('2026-06-17T09:00:00.000Z').getTime(), // Wed 09:00 UTC
	},
];

describe('ActivityHeatmap (#1486)', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		vi.clearAllMocks();
	});

	it('aggregates trade counts and volume correctly into grid cells', () => {
		const { grid, busiestTrades, totalTrades, totalVolume } = aggregateHeatmap(
			mockTrades,
			'UTC',
			30
		);

		expect(totalTrades).toBe(3);
		expect(totalVolume).toBe(200);

		// Monday is day 1, hour 14
		expect(grid[1]?.[14]?.tradeCount).toBe(2);
		expect(grid[1]?.[14]?.volume).toBe(150);

		// Wednesday is day 3, hour 9
		expect(grid[3]?.[9]?.tradeCount).toBe(1);
		expect(grid[3]?.[9]?.volume).toBe(50);

		expect(busiestTrades?.day).toBe(1);
		expect(busiestTrades?.hour).toBe(14);
		expect(busiestTrades?.tradeCount).toBe(2);
	});

	it('shifts cells across timezones accurately', () => {
		// Mon 14:30 UTC is Mon 10:30 EDT in America/New_York (UTC-4 in June)
		const utcSlot = getLocalDayAndHour(
			new Date('2026-06-15T14:30:00.000Z').getTime(),
			'UTC'
		);
		expect(utcSlot.day).toBe(1); // Monday
		expect(utcSlot.hour).toBe(14);

		const nySlot = getLocalDayAndHour(
			new Date('2026-06-15T14:30:00.000Z').getTime(),
			'America/New_York'
		);
		expect(nySlot.day).toBe(1); // Monday
		expect(nySlot.hour).toBe(10);

		const { grid: nyGrid } = aggregateHeatmap(
			mockTrades,
			'America/New_York',
			30
		);
		expect(nyGrid[1]?.[10]?.tradeCount).toBe(2);
		expect(nyGrid[1]?.[14]?.tradeCount).toBe(0);
	});

	it('renders heatmap, highlights busiest slot and toggles table view', async () => {
		vi.spyOn(keyTradeService, 'getKeyTrades').mockResolvedValue(mockTrades);

		render(
			<QueryClientProvider client={queryClient}>
				<ActivityHeatmap keyId="creator-test" />
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(screen.getByTestId('activity-heatmap')).toBeInTheDocument();
		});

		expect(screen.getByTestId('heatmap-summary-sentence')).toBeInTheDocument();

		// Toggle to Table view
		const tableToggle = screen.getByTestId('heatmap-toggle-table');
		fireEvent.click(tableToggle);

		expect(screen.getByTestId('heatmap-table-alternative')).toBeInTheDocument();

		// Toggle back to Grid view
		fireEvent.click(tableToggle);
		expect(screen.getByTestId('heatmap-grid-container')).toBeInTheDocument();
	});

	it('shows minimum data notice when trade count is below threshold', async () => {
		vi.spyOn(keyTradeService, 'getKeyTrades').mockResolvedValue([mockTrades[0]!]);

		render(
			<QueryClientProvider client={queryClient}>
				<ActivityHeatmap keyId="low-activity-key" />
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(screen.getByTestId('heatmap-minimum-data-notice')).toBeInTheDocument();
		});
	});
});
