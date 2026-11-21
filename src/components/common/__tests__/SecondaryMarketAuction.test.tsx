/**
 * Secondary market auction creation UI tests (#1174).
 *
 * Acceptance criteria:
 *  - Auction tab renders alongside Fixed Price tab
 *  - Duration selector maps correctly to seconds in the contract call
 *  - Auction summary preview shows accurate reserve and end time
 *  - create_auction contract call submitted with correct params
 *  - Active auction card shows correct highest bid for seller
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SecondaryMarketSellPanel from '@/components/common/SecondaryMarketSellPanel';
import ActiveAuctionCard from '@/components/common/ActiveAuctionCard';
import {
	AUCTION_DURATIONS,
	buildAuctionSummary,
	durationLabelToSeconds,
	isAuctionSeller,
} from '@/utils/auction.utils';

describe('auction duration mapping (#1174)', () => {
	it.each([
		['1h', 3_600],
		['6h', 21_600],
		['24h', 86_400],
	] as const)('maps %s to %i seconds', (label, seconds) => {
		expect(durationLabelToSeconds(label)).toBe(seconds);
	});

	it('exposes the three durations on the selector', () => {
		expect(AUCTION_DURATIONS.map(d => d.label)).toEqual(['1h', '6h', '24h']);
	});

	it('rejects unknown duration labels', () => {
		expect(() =>
			durationLabelToSeconds('2h' as never)
		).toThrow();
	});
});

describe('buildAuctionSummary (#1174)', () => {
	it('computes an accurate end time from now + duration', () => {
		const now = new Date('2026-03-01T12:00:00Z');
		const summary = buildAuctionSummary(
			{ fractionAmount: 5, reservePriceStroops: 2_500_000, durationSeconds: 3_600 },
			now
		);
		expect(summary.endTime).toEqual(new Date('2026-03-01T13:00:00Z'));
		expect(summary.reservePriceStroops).toBe(2_500_000);
		expect(summary.fractionAmount).toBe(5);
	});

	it('rejects invalid amounts and unsupported durations', () => {
		expect(() =>
			buildAuctionSummary({ fractionAmount: 0, reservePriceStroops: 1, durationSeconds: 3_600 })
		).toThrow();
		expect(() =>
			buildAuctionSummary({ fractionAmount: 1, reservePriceStroops: 0, durationSeconds: 3_600 })
		).toThrow();
		expect(() =>
			buildAuctionSummary({ fractionAmount: 1, reservePriceStroops: 1, durationSeconds: 999 })
		).toThrow();
	});
});

describe('SecondaryMarketSellPanel (#1174)', () => {
	const noop = vi.fn();

	it('renders the Auction tab alongside the Fixed Price tab', () => {
		render(
			<SecondaryMarketSellPanel
				availableFractions={10}
				onCreateAuction={noop}
			/>
		);
		expect(screen.getByTestId('sell-mode-tab-fixed')).toBeInTheDocument();
		expect(screen.getByTestId('sell-mode-tab-auction')).toBeInTheDocument();
		expect(screen.getByTestId('fixed-price-panel')).toBeInTheDocument();
	});

	it('switches to the auction panel and shows duration options', () => {
		render(
			<SecondaryMarketSellPanel availableFractions={10} onCreateAuction={noop} />
		);
		fireEvent.click(screen.getByTestId('sell-mode-tab-auction'));

		expect(screen.getByTestId('auction-panel')).toBeInTheDocument();
		for (const d of AUCTION_DURATIONS) {
			const btn = screen.getByTestId(`auction-duration-${d.label}`);
			expect(btn).toHaveAttribute('data-seconds', String(d.seconds));
		}
	});

	it('summary preview shows reserve and end time', () => {
		render(
			<SecondaryMarketSellPanel availableFractions={10} onCreateAuction={noop} />
		);
		fireEvent.click(screen.getByTestId('sell-mode-tab-auction'));

		fireEvent.change(screen.getByTestId('auction-reserve-price'), {
			target: { value: '2500000' },
		});

		expect(screen.getByTestId('auction-summary-reserve')).toHaveTextContent('0.25');
		expect(screen.getByTestId('auction-summary-amount')).toHaveTextContent('1');
		// End time is a locale string — just require it rendered something.
		expect(
			screen.getByTestId('auction-summary-end').textContent
		).not.toBe('—');
	});

	it('submits create_auction with duration mapped to seconds', async () => {
		const onCreateAuction = vi.fn().mockResolvedValue(undefined);
		render(
			<SecondaryMarketSellPanel
				availableFractions={10}
				onCreateAuction={onCreateAuction}
			/>
		);
		fireEvent.click(screen.getByTestId('sell-mode-tab-auction'));

		fireEvent.change(screen.getByTestId('auction-fraction-amount'), {
			target: { value: '3' },
		});
		fireEvent.change(screen.getByTestId('auction-reserve-price'), {
			target: { value: '1000000' },
		});
		fireEvent.click(screen.getByTestId('auction-duration-6h'));
		fireEvent.click(screen.getByTestId('submit-auction'));

		await waitFor(() => expect(onCreateAuction).toHaveBeenCalledTimes(1));
		expect(onCreateAuction).toHaveBeenCalledWith({
			fractionAmount: 3,
			reservePriceStroops: 1_000_000,
			durationSeconds: 21_600,
		});
	});
});

describe('ActiveAuctionCard (#1174)', () => {
	const auction = {
		auctionId: 'auc-1',
		seller: 'GSSELLER',
		fractionAmount: 5,
		reservePriceStroops: 2_500_000,
		highestBidStroops: 3_100_000,
		highestBidder: 'GBIDDER',
		endsAt: new Date('2026-03-01T13:00:00Z'),
		status: 'active' as const,
	};

	it('shows the correct highest bid for the seller', () => {
		render(
			<ActiveAuctionCard auction={auction} walletAddress="gseller" />
		);
		expect(screen.getByTestId('auction-highest-bid')).toHaveTextContent('0.31');
		expect(screen.getByTestId('active-auction-card')).toHaveAttribute(
			'data-is-seller',
			'true'
		);
		expect(screen.getByTestId('auction-highest-bidder')).toHaveTextContent('GBIDDER');
	});

	it('shows a no-bids state when nothing has been bid', () => {
		render(
			<ActiveAuctionCard
				auction={{ ...auction, highestBidStroops: 0, highestBidder: null }}
				walletAddress="gseller"
			/>
		);
		expect(screen.getByTestId('auction-highest-bid')).toHaveTextContent('No bids yet');
	});

	it('isAuctionSeller is case-insensitive', () => {
		expect(isAuctionSeller({ seller: 'GSSELLER' }, 'gseller')).toBe(true);
		expect(isAuctionSeller({ seller: 'GSSELLER' }, 'gother')).toBe(false);
		expect(isAuctionSeller({ seller: 'GSSELLER' }, null)).toBe(false);
	});
});
