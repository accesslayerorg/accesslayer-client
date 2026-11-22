import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuctionPhaseSection from '../AuctionPhaseSection';
import { useAccount } from 'wagmi';

vi.mock('@/hooks/useCreatorContractActions', () => ({
	usePlaceAuctionBidMutation: vi.fn(() => ({
		mutate: vi.fn(),
		isPending: false,
	})),
}));

vi.mock('@/hooks/useAuctionBids', () => ({
	useAuctionBids: vi.fn((_id, fallback) => ({
		bids: fallback ?? [],
		isPolling: false,
	})),
}));

const mockUseAccount = vi.mocked(useAccount);

describe('AuctionPhaseSection (#924, #1164)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseAccount.mockReturnValue({
			address: '0x1234567890abcdef1234567890abcdef12345678',
			isConnected: true,
		} as ReturnType<typeof useAccount>);
	});

	it('renders nothing when phase is inactive', () => {
		const { container } = render(
			<AuctionPhaseSection
				creatorId="creator-1"
				auctionPrice={null}
				auctionSupply={null}
				auctionEndsAt={null}
			/>
		);
		expect(container.firstChild).toBeNull();
	});

	it('renders auction panel correctly during active auction period (#1164)', () => {
		const future = new Date(Date.now() + 3600 * 1000).toISOString();
		render(
			<AuctionPhaseSection
				creatorId="creator-1"
				auctionPrice={5}
				auctionSupply={100}
				auctionSold={20}
				auctionEndsAt={future}
				auctionMinIncrement={0.5}
				auctionHighestBid={15}
			/>
		);

		// Verified auction panel presence
		expect(screen.getByTestId('auction-panel')).toBeInTheDocument();
		expect(screen.getByTestId('auction-phase-section')).toBeInTheDocument();
		expect(screen.getByText('Pre-Launch Auction')).toBeInTheDocument();

		// Real-time countdown timer
		expect(screen.getByTestId('auction-countdown')).toBeInTheDocument();

		// Progress bar
		const progressEl = screen.getByTestId('auction-supply-progress');
		expect(progressEl).toBeInTheDocument();
		expect(progressEl).toHaveTextContent(/80 of 100 keys left/i);

		// Bid panel and bid history
		expect(
			screen.getByTestId('auction-bid-panel-container')
		).toBeInTheDocument();
		expect(screen.getByTestId('auction-highest-bid')).toHaveTextContent(
			'15 XLM'
		);
		expect(screen.getByTestId('auction-escrow-notice')).toBeInTheDocument();
	});

	it('shows outbid warning when connected wallet has a bid that is not the highest', () => {
		const future = new Date(Date.now() + 3600 * 1000).toISOString();
		const myAddress = '0x1234567890abcdef1234567890abcdef12345678';
		const higherAddress = '0x9999999999999999999999999999999999999999';

		render(
			<AuctionPhaseSection
				creatorId="creator-1"
				auctionPrice={5}
				auctionSupply={100}
				auctionEndsAt={future}
				userAddress={myAddress}
				auctionBids={[
					{
						id: 'b1',
						bidderAddress: myAddress,
						amount: 10,
						placedAt: new Date(Date.now() - 5000).toISOString(),
					},
					{
						id: 'b2',
						bidderAddress: higherAddress,
						amount: 20,
						placedAt: new Date(Date.now() - 1000).toISOString(),
					},
				]}
			/>
		);

		const outbidNotice = screen.getByTestId('auction-outbid-notice');
		expect(outbidNotice).toBeInTheDocument();
		expect(outbidNotice).toHaveTextContent(/You've been outbid/i);
		expect(outbidNotice).toHaveTextContent('20 XLM');
	});

	it('post-auction panel shows correct clearing price and allocation once settled (#1164)', () => {
		const past = new Date(Date.now() - 1000).toISOString();
		render(
			<AuctionPhaseSection
				creatorId="creator-1"
				auctionPrice={5}
				auctionSupply={100}
				auctionSold={100}
				auctionEndsAt={past}
				auctionClearingPrice={42.5}
				auctionAllocation={100}
				auctionBids={[
					{
						id: 'winning-bid',
						bidderAddress:
							'GBWINNER1111111111111111111111111111111111111111111111111',
						amount: 42.5,
						placedAt: new Date(Date.now() - 5000).toISOString(),
					},
				]}
			/>
		);

		expect(screen.getByTestId('auction-panel')).toBeInTheDocument();
		const transition = screen.getByTestId('auction-ended-transition');
		expect(transition).toBeInTheDocument();
		expect(transition).toHaveTextContent(/Auction Settled/i);

		// Clearing price
		const clearingPriceEl = screen.getByTestId('auction-clearing-price');
		expect(clearingPriceEl).toHaveTextContent('42.5 XLM');

		// Allocation
		const allocationEl = screen.getByTestId('auction-allocation');
		expect(allocationEl).toHaveTextContent('100 keys');

		// Winning bidder
		const winningBidderEl = screen.getByTestId('auction-winning-bidder');
		expect(winningBidderEl).toHaveTextContent('GBWINN…1111');
	});
});
