import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
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

const baseCreator: Course = {
	id: 'alex-rivers',
	title: 'Alex Rivers',
	description: 'Creates tech tutorials.',
	price: 5.5,
	holderCount: 120,
	instructorId: 'ARivers',
	category: 'Tech',
	level: 'BEGINNER',
};

describe('CreatorCard props rendering', () => {
	it('renders price 5.5 XLM and 120 holders correctly from props', () => {
		render(
			<MemoryRouter>
				<CreatorCard creator={baseCreator} />
			</MemoryRouter>
		);

		const priceBadge = screen.getByTestId('creator-card-price-badge');
		expect(priceBadge).toHaveTextContent('5.50 XLM');

		const holdersSpan = screen.getByTestId('creator-card-holders');
		expect(holdersSpan).toHaveTextContent('120 holders');
	}, 15000);

	it('renders price 0 as "0.00 XLM" without crashing', () => {
		const creator: Course = {
			...baseCreator,
			price: 0,
			priceStroops: 0,
		};

		expect(() => {
			render(
				<MemoryRouter>
					<CreatorCard creator={creator} />
				</MemoryRouter>
			);
		}).not.toThrow();

		const priceBadge = screen.getByTestId('creator-card-price-badge');
		expect(priceBadge).toHaveTextContent('0.00 XLM');
	}, 15000);

	it('renders 0 holders as "0 holders" without crashing', () => {
		const creator: Course = {
			...baseCreator,
			holderCount: 0,
		};

		expect(() => {
			render(
				<MemoryRouter>
					<CreatorCard creator={creator} />
				</MemoryRouter>
			);
		}).not.toThrow();

		const holdersSpan = screen.getByTestId('creator-card-holders');
		expect(holdersSpan).toHaveTextContent('0 holders');
	}, 15000);

	it('asserts the card links to the correct creator profile route', () => {
		render(
			<MemoryRouter>
				<CreatorCard creator={baseCreator} />
			</MemoryRouter>
		);

		const link = screen.getByTestId('creator-profile-link');
		expect(link).toHaveAttribute('href', '/creator/alex-rivers');
	}, 15000);

	it('renders a dash placeholder for a null price', () => {
		const creator: Course = {
			...baseCreator,
			price: null as unknown as number,
			priceStroops: undefined,
		};

		render(
			<MemoryRouter>
				<CreatorCard creator={creator} />
			</MemoryRouter>
		);

		const priceBadge = screen.getByTestId('creator-card-price-badge');
		expect(priceBadge).toHaveTextContent('—');
	}, 15000);
});
