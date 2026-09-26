import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MarketOverview from '@/components/home/MarketOverview';
import { useProtocolStats } from '@/hooks/useProtocolStats';
import type { ProtocolStats } from '@/services/protocol.service';
import type { UseQueryResult } from '@tanstack/react-query';

vi.mock('@/hooks/useProtocolStats', () => ({
	useProtocolStats: vi.fn(),
}));

const mockUseProtocolStats = vi.mocked(useProtocolStats);

function mockQueryResult(
	overrides: Partial<UseQueryResult<ProtocolStats, Error>> = {}
): UseQueryResult<ProtocolStats, Error> {
	return {
		data: undefined,
		isLoading: false,
		isError: false,
		error: null,
		isSuccess: true,
		status: 'success',
		refetch: vi.fn(),
		...overrides,
	} as unknown as UseQueryResult<ProtocolStats, Error>;
}

describe('MarketOverview Component', () => {
	beforeEach(() => {
		mockUseProtocolStats.mockReset();
	});

	it('renders loading skeletons while fetching data', () => {
		mockUseProtocolStats.mockReturnValue(
			mockQueryResult({
				isLoading: true,
				isSuccess: false,
				status: 'pending',
			})
		);

		render(<MarketOverview />);

		expect(
			screen.getByTestId('market-overview-skeletons')
		).toBeInTheDocument();
		expect(
			screen.queryByTestId('market-overview-grid')
		).not.toBeInTheDocument();
	});

	it('renders all four stat cards with correctly formatted values from API response', () => {
		const mockData: ProtocolStats = {
			totalVolume: 1250000,
			activeKeys: 450,
			totalHolders: 12400,
			trades24h: 3890,
			volumeChange24h: 12.5,
			tradesChange24h: -3.2,
		};

		mockUseProtocolStats.mockReturnValue(
			mockQueryResult({
				data: mockData,
			})
		);

		render(<MarketOverview />);

		expect(screen.getByTestId('market-overview-grid')).toBeInTheDocument();

		// Stat card 1: Total Volume
		const volumeCard = screen.getByTestId('stat-card-total-volume');
		expect(volumeCard).toHaveTextContent('Total Volume');
		expect(volumeCard).toHaveTextContent('1.3M XLM');
		expect(volumeCard).toHaveTextContent('+12.5%');

		// Stat card 2: Active Keys
		const keysCard = screen.getByTestId('stat-card-active-keys');
		expect(keysCard).toHaveTextContent('Active Keys');
		expect(keysCard).toHaveTextContent('450');

		// Stat card 3: Total Holders
		const holdersCard = screen.getByTestId('stat-card-total-holders');
		expect(holdersCard).toHaveTextContent('Total Holders');
		expect(holdersCard).toHaveTextContent('12,400');

		// Stat card 4: 24h Trades
		const tradesCard = screen.getByTestId('stat-card-24h-trades');
		expect(tradesCard).toHaveTextContent('24h Trades');
		expect(tradesCard).toHaveTextContent('3,890');
		expect(tradesCard).toHaveTextContent('-3.2%');
	});

	it('handles 24h change indicators: positive, negative, and zero (neutral 0%) cases', () => {
		const mockData: ProtocolStats = {
			totalVolume: 500000,
			activeKeys: 100,
			totalHolders: 200,
			trades24h: 50,
			volumeChange24h: 0,
			tradesChange24h: -5.0,
		};

		mockUseProtocolStats.mockReturnValue(
			mockQueryResult({
				data: mockData,
			})
		);

		render(<MarketOverview />);

		const volumeCard = screen.getByTestId('stat-card-total-volume');
		// 0% change must be rendered cleanly as 0% neutral
		expect(volumeCard).toHaveTextContent('0%');

		const tradesCard = screen.getByTestId('stat-card-24h-trades');
		expect(tradesCard).toHaveTextContent('-5%');
	});

	it('renders visible fallback error UI and allows retry when query fails', () => {
		const mockRefetch = vi.fn();
		mockUseProtocolStats.mockReturnValue(
			mockQueryResult({
				isError: true,
				error: new Error('Failed to fetch protocol statistics'),
				isSuccess: false,
				status: 'error',
				refetch: mockRefetch,
			})
		);

		render(<MarketOverview />);

		expect(screen.getByTestId('market-overview-error')).toBeInTheDocument();
		expect(
			screen.getByText('Unable to load market overview')
		).toBeInTheDocument();
		expect(
			screen.getByText('Failed to fetch protocol statistics')
		).toBeInTheDocument();

		const retryBtn = screen.getByRole('button', { name: /try again/i });
		fireEvent.click(retryBtn);

		expect(mockRefetch).toHaveBeenCalledTimes(1);
	});

	it('renders without requiring authentication', () => {
		mockUseProtocolStats.mockReturnValue(
			mockQueryResult({
				data: {
					totalVolume: 1000,
					activeKeys: 10,
					totalHolders: 20,
					trades24h: 5,
				},
			})
		);

		const { container } = render(<MarketOverview />);
		expect(container).toBeInTheDocument();
		expect(screen.getByText('Market Overview')).toBeInTheDocument();
	});
});
