import { render } from '@testing-library/react';
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

function createCreator(overrides: Partial<Course> = {}): Course {
	return {
		id: 'test-creator',
		title: 'Test Creator',
		description: 'A test creator.',
		price: 10,
		creatorShareSupply: 100,
		instructorId: 'test',
		category: 'Art',
		level: 'BEGINNER',
		...overrides,
	};
}

describe('CreatorCard sparkline', () => {
	it('does not render sparkline for zero price history points', () => {
		const { container } = render(
			<CreatorCard creator={createCreator({ priceHistory: [] })} />
		);

		expect(container.querySelector('polyline')).not.toBeInTheDocument();
	});

	it('does not render sparkline for one price history point', () => {
		const { container } = render(
			<CreatorCard creator={createCreator({ priceHistory: [100] })} />
		);

		expect(container.querySelector('polyline')).not.toBeInTheDocument();
	});

	it('renders sparkline for two price history points', () => {
		const { container } = render(
			<CreatorCard
				creator={createCreator({ priceHistory: [100, 200] })}
			/>
		);

		expect(container.querySelector('polyline')).toBeInTheDocument();
	});

	it('renders sparkline for seven price history points', () => {
		const { container } = render(
			<CreatorCard
				creator={createCreator({
					priceHistory: [100, 110, 120, 130, 140, 150, 160],
				})}
			/>
		);

		expect(container.querySelector('polyline')).toBeInTheDocument();
	});
});
