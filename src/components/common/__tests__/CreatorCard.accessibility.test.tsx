import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CreatorCard from '@/components/common/CreatorCard';
import type { Course } from '@/services/course.service';

vi.mock('wagmi', () => ({
	useAccount: () => ({ isConnected: false }),
	useConnect: () => ({ connectAsync: vi.fn(), connectors: [] }),
	useReconnect: () => ({ reconnectAsync: vi.fn(), connectors: [] }),
}));

vi.mock('@/hooks/useNetworkMismatch', () => ({
	useNetworkMismatch: () => ({
		isMismatch: false,
		expectedChainName: 'Stellar Testnet',
	}),
}));

vi.mock('@/hooks/useTransactionTelemetry', () => ({
	useTransactionTelemetry: () => vi.fn(),
}));

vi.mock('@/utils/useSystemTheme', () => ({
	useSystemTheme: () => ({ isDarkMode: true }),
}));

const creator: Course = {
	id: 'alex-rivers',
	title: '  Alex   Rivers  ',
	description: 'Creates cinematic tutorials.',
	price: 12,
	creatorShareSupply: 120,
	instructorId: 'ARivers',
	category: 'Design',
	level: 'BEGINNER',
	change24h: 50,
};

describe('CreatorCard accessibility', () => {
	it('renders normalized creator names and accessible price chart data', () => {
		render(<CreatorCard creator={creator} />);

		expect(
			screen.getByRole('heading', { name: 'Alex Rivers' })
		).toBeInTheDocument();
		expect(screen.queryByText('  Alex   Rivers  ')).not.toBeInTheDocument();

		const priceChart = screen.getByRole('img', {
			name: /current key price is 12 XLM, up 50%/i,
		});
		expect(priceChart).toBeInTheDocument();

		const priceTable = screen.getByRole('table', {
			name: /price chart for alex rivers/i,
		});
		expect(
			within(priceTable).getByRole('row', {
				name: /previous 24-hour key price 8 XLM/i,
			})
		).toBeInTheDocument();
		expect(
			within(priceTable).getByRole('row', {
				name: /current key price 12 XLM/i,
			})
		).toBeInTheDocument();
	});

	it('updates displayed price when price snapshot data changes', () => {
		const { rerender } = render(<CreatorCard creator={creator} />);

		// Initial price should be 12 XLM
		const initialPriceBadge = screen.getByTestId('creator-card-price-badge');
		expect(initialPriceBadge).toHaveTextContent(/12/i);

		// Update creator with new price
		const updatedCreator: Course = {
			...creator,
			price: 25,
		};

		rerender(<CreatorCard creator={updatedCreator} />);

		// New price should be 25 XLM
		const updatedPriceBadge = screen.getByTestId('creator-card-price-badge');
		expect(updatedPriceBadge).toHaveTextContent(/25/i);

		// Old price (12) should no longer be visible
		expect(updatedPriceBadge).not.toHaveTextContent(/12/i);
	});
});
