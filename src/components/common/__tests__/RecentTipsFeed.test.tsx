import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import RecentTipsFeed from '../RecentTipsFeed';
import * as useTipsHook from '@/hooks/useTips';
import type { Tip } from '@/types/tip.types';

vi.mock('@/hooks/useTips', () => ({
	useRecentTips: vi.fn(),
}));

function renderWithClient(ui: React.ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
		},
	});
	return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function makeTip(index: number, overrides: Partial<Tip> = {}): Tip {
	const amount = 10 * (index + 1);
	const fee = amount * 0.02;
	return {
		id: `tip-${index}`,
		creatorId: 'creator-1',
		tipper: `GBZXN7PIRZGNMHGA728R3AAX7A8K9R0P1Q2S3T4U5V6W7X8Y9Z0A1B2${index}`,
		amount,
		fee,
		netAmount: amount - fee,
		message: index % 2 === 0 ? `Message number ${index}` : undefined,
		timestamp: Date.now() - index * 60_000,
		...overrides,
	};
}

describe('RecentTipsFeed', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders loading skeleton while loading', () => {
		vi.mocked(useTipsHook.useRecentTips).mockReturnValue({
			data: undefined,
			isLoading: true,
		} as unknown as ReturnType<typeof useTipsHook.useRecentTips>);

		renderWithClient(<RecentTipsFeed creatorId="creator-1" />);

		expect(screen.getByTestId('recent-tips-loading')).toBeInTheDocument();
	});

	it('renders empty state when no tips exist', () => {
		vi.mocked(useTipsHook.useRecentTips).mockReturnValue({
			data: [],
			isLoading: false,
		} as unknown as ReturnType<typeof useTipsHook.useRecentTips>);

		renderWithClient(<RecentTipsFeed creatorId="creator-1" />);

		expect(screen.getByTestId('recent-tips-empty')).toBeInTheDocument();
		expect(screen.getByText('No tips yet')).toBeInTheDocument();
	});

	it('renders accurate last 10 tips with tipper and amount', () => {
		// Provide 15 tips to test capping at 10
		const mockTips = Array.from({ length: 15 }, (_, i) => makeTip(i));

		vi.mocked(useTipsHook.useRecentTips).mockReturnValue({
			data: mockTips,
			isLoading: false,
		} as unknown as ReturnType<typeof useTipsHook.useRecentTips>);

		renderWithClient(<RecentTipsFeed creatorId="creator-1" />);

		expect(screen.getByTestId('recent-tips-feed')).toBeInTheDocument();

		const items = screen.getAllByTestId('recent-tip-item');
		expect(items).toHaveLength(10);
		expect(screen.getByTestId('recent-tips-count')).toHaveTextContent('10');

		// Check first item displays correct amount and truncated tipper
		expect(items[0]).toHaveTextContent('+10.00 XLM');
		expect(items[0]).toHaveTextContent('GBZXN7…0A1B20');

		// Check second item
		expect(items[1]).toHaveTextContent('+20.00 XLM');

		// Check optional messages render for items that have them
		const messageBubbles = screen.getAllByTestId('tip-message-content');
		expect(messageBubbles.length).toBe(5); // indices 0, 2, 4, 6, 8
		expect(messageBubbles[0]).toHaveTextContent('Message number 0');
	});
});
