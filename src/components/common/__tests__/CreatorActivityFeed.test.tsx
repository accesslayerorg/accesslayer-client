import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CreatorActivityFeed from '@/components/common/CreatorActivityFeed';
import { useCreatorActivityFeed } from '@/hooks/useCreatorActivityFeed';
import type { CreatorActivityTrade } from '@/services/creatorActivity.service';

vi.mock('@/hooks/useCreatorActivityFeed');
vi.mock('@/services/creatorActivity.service', () => ({
	creatorActivityService: { getCreatorActivity: vi.fn() },
}));

const mockUseCreatorActivityFeed = vi.mocked(useCreatorActivityFeed);

function makeTrade(id: string, overrides: Partial<CreatorActivityTrade> = {}): CreatorActivityTrade {
	return {
		id,
		type: 'buy',
		traderHandle: `trader-${id}`,
		amount: 2,
		price: 0.05,
		timestamp: Date.now(),
		txHash: `0x${id}`,
		status: 'completed',
		...overrides,
	};
}

describe('CreatorActivityFeed', () => {
	it('shows skeleton rows while the query is loading', () => {
		mockUseCreatorActivityFeed.mockReturnValue({
			trades: [],
			isLoading: true,
			isError: false,
		});

		render(<CreatorActivityFeed creatorId="creator-1" />);

		expect(screen.getByTestId('creator-activity-feed-skeleton')).toBeInTheDocument();
		expect(screen.queryByTestId('creator-activity-feed-empty-state')).not.toBeInTheDocument();
	});

	it('does not show the empty state while loading, even though trades is an empty array', () => {
		mockUseCreatorActivityFeed.mockReturnValue({
			trades: [],
			isLoading: true,
			isError: false,
		});

		render(<CreatorActivityFeed creatorId="creator-1" />);

		expect(screen.queryByText('No activity yet — buy or sell keys to get started')).not.toBeInTheDocument();
	});

	it('shows the empty state once the query has settled with no transactions', () => {
		mockUseCreatorActivityFeed.mockReturnValue({
			trades: [],
			isLoading: false,
			isError: false,
		});

		render(<CreatorActivityFeed creatorId="creator-1" />);

		expect(screen.getByTestId('creator-activity-feed-empty-state')).toBeInTheDocument();
		expect(
			screen.getByText('No activity yet — buy or sell keys to get started')
		).toBeInTheDocument();
		expect(screen.queryByTestId('creator-activity-feed-skeleton')).not.toBeInTheDocument();
	});

	it('renders real activity rows in place of the empty state as soon as data arrives', () => {
		mockUseCreatorActivityFeed.mockReturnValue({
			trades: [makeTrade('a'), makeTrade('b', { type: 'sell' })],
			isLoading: false,
			isError: false,
		});

		render(<CreatorActivityFeed creatorId="creator-1" />);

		expect(screen.queryByTestId('creator-activity-feed-empty-state')).not.toBeInTheDocument();
		expect(screen.getByTestId('creator-activity-item-a')).toBeInTheDocument();
		expect(screen.getByTestId('creator-activity-item-b')).toBeInTheDocument();
	});

	it('renders the exact empty-state message copy from the design spec', () => {
		mockUseCreatorActivityFeed.mockReturnValue({
			trades: [],
			isLoading: false,
			isError: false,
		});

		render(<CreatorActivityFeed creatorId="creator-1" />);

		expect(
			screen.getByText('No activity yet — buy or sell keys to get started')
		).toBeInTheDocument();
	});

	it('distinguishes buy and sell trade types in the rendered rows', () => {
		mockUseCreatorActivityFeed.mockReturnValue({
			trades: [makeTrade('a', { type: 'buy' }), makeTrade('b', { type: 'sell' })],
			isLoading: false,
			isError: false,
		});

		render(<CreatorActivityFeed creatorId="creator-1" />);

		expect(screen.getByTestId('creator-activity-item-a')).toHaveTextContent('Buy');
		expect(screen.getByTestId('creator-activity-item-b')).toHaveTextContent('Sell');
	});

	it('attributes royalty claims and revenue distributions to the acting co-creator (#1224)', () => {
		mockUseCreatorActivityFeed.mockReturnValue({
			trades: [
				makeTrade('r', {
					type: 'royalty_claim',
					amount: 42,
					actor: { wallet: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI', role: 'Revenue' },
				}),
				makeTrade('d', {
					type: 'revenue_distribution',
					amount: 100,
					actor: { wallet: 'GCREATORWALLET0000000000000000000000000000000000000ABCD', role: 'creator' },
				}),
			],
			isLoading: false,
			isError: false,
		});

		render(<CreatorActivityFeed creatorId="creator-1" />);

		const claim = screen.getByTestId('creator-activity-item-r');
		expect(claim).toHaveTextContent('Royalty claim');
		expect(claim).toHaveTextContent('42 XLM');
		expect(claim).toHaveTextContent('GBZX…MADI');
		expect(claim.querySelector('[data-testid="action-attribution-role"]')).toHaveTextContent(
			'Revenue'
		);

		const distribution = screen.getByTestId('creator-activity-item-d');
		expect(distribution).toHaveTextContent('Revenue distribution');
		expect(
			distribution.querySelector('[data-testid="action-attribution-role"]')
		).toHaveTextContent('Creator');
	});

	it('omits attribution for entries without an acting wallet', () => {
		mockUseCreatorActivityFeed.mockReturnValue({
			trades: [makeTrade('a')],
			isLoading: false,
			isError: false,
		});

		render(<CreatorActivityFeed creatorId="creator-1" />);

		expect(screen.queryByTestId('action-attribution')).not.toBeInTheDocument();
	});
});
