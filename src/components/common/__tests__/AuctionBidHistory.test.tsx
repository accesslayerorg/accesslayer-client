import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuctionBidHistory from '../AuctionBidHistory';
import type { AuctionBidEntry } from '@/services/course.service';

describe('AuctionBidHistory (#924, #1164)', () => {
	it('renders empty state when bids list is empty', () => {
		render(<AuctionBidHistory bids={[]} />);
		expect(
			screen.getByTestId('auction-bid-history-empty')
		).toBeInTheDocument();
		expect(screen.getByText('No bids yet')).toBeInTheDocument();
	});

	it('renders live bid list showing top bids with amounts and truncated wallet addresses (#1164)', () => {
		const sampleBids: AuctionBidEntry[] = [
			{
				id: 'bid-1',
				bidderAddress:
					'GB2222222222222222222222222222222222222222222222222222222222',
				amount: 50,
				placedAt: new Date(Date.now() - 60_000).toISOString(),
			},
			{
				id: 'bid-2',
				bidderAddress:
					'GA1111111111111111111111111111111111111111111111111111111111',
				bidderName: 'Alice',
				amount: 75,
				placedAt: new Date(Date.now() - 30_000).toISOString(),
			},
		];

		render(
			<AuctionBidHistory
				bids={sampleBids}
				walletAddress="GB2222222222222222222222222222222222222222222222222222222222"
			/>
		);

		const rows = screen.getAllByTestId('auction-bid-row');
		expect(rows).toHaveLength(2);

		// First row is the highest bid (75 XLM by Alice)
		expect(rows[0]).toHaveTextContent('Alice (GA1111…1111)');
		expect(rows[0]).toHaveTextContent('75 XLM');

		// Second row is 50 XLM and belongs to connected wallet -> shows "You"
		expect(rows[1]).toHaveTextContent('GB2222…2222');
		expect(rows[1]).toHaveTextContent('You');
		expect(rows[1]).toHaveTextContent('50 XLM');
	});
});
