import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AuctionBidPanel from '../AuctionBidPanel';
import { useAccount } from 'wagmi';
import * as creatorContractActions from '@/hooks/useCreatorContractActions';

const mockMutate = vi.fn();

vi.mock('@/hooks/useCreatorContractActions', () => ({
	usePlaceAuctionBidMutation: vi.fn(),
}));

const mockUseAccount = vi.mocked(useAccount);

describe('AuctionBidPanel (#924, #1164)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			creatorContractActions.usePlaceAuctionBidMutation
		).mockReturnValue({
			mutate: mockMutate,
			isPending: false,
		} as unknown as ReturnType<
			typeof creatorContractActions.usePlaceAuctionBidMutation
		>);

		mockUseAccount.mockReturnValue({
			address: '0x1234567890abcdef1234567890abcdef12345678',
			isConnected: true,
		} as ReturnType<typeof useAccount>);
	});

	it('renders highest bid, min increment, min next bid, and escrow notice', () => {
		render(
			<AuctionBidPanel
				creatorId="creator-1"
				highestBid={10}
				minIncrement={0.5}
				startingPrice={5}
			/>
		);

		expect(screen.getByTestId('auction-highest-bid')).toHaveTextContent(
			'10 XLM'
		);
		expect(screen.getByTestId('auction-min-increment')).toHaveTextContent(
			'0.5 XLM'
		);
		expect(screen.getByTestId('auction-min-next-bid')).toHaveTextContent(
			'10.5 XLM'
		);

		// Escrowed funds notice check (#1164)
		const escrowNotice = screen.getByTestId('auction-escrow-notice');
		expect(escrowNotice).toBeInTheDocument();
		expect(escrowNotice).toHaveTextContent(/escrow/i);
	});

	it('displays "No bids yet" and uses startingPrice when no highest bid exists', () => {
		render(
			<AuctionBidPanel
				creatorId="creator-1"
				highestBid={null}
				minIncrement={0.5}
				startingPrice={5}
			/>
		);

		expect(screen.getByTestId('auction-highest-bid')).toHaveTextContent(
			'No bids yet'
		);
		expect(screen.getByTestId('auction-min-next-bid')).toHaveTextContent(
			'5 XLM'
		);
	});

	it('rejects a bid below the minimum with BelowMinimum inline error (#1164)', () => {
		render(
			<AuctionBidPanel
				creatorId="creator-1"
				highestBid={10}
				minIncrement={1}
			/>
		);
		// Min next bid is 11 XLM

		const input = screen.getByTestId('auction-bid-input');
		const submitBtn = screen.getByTestId('auction-bid-submit');

		// Type 10 (below 11 minimum)
		fireEvent.change(input, { target: { value: '10' } });

		// Inline error should appear
		const errorEl = screen.getByTestId('auction-bid-error');
		expect(errorEl).toBeInTheDocument();
		expect(errorEl).toHaveTextContent(/BelowMinimum/i);
		expect(errorEl).toHaveTextContent(/11 XLM/i);

		// Attempting submit should reject and not call mutation
		fireEvent.click(submitBtn);
		expect(mockMutate).not.toHaveBeenCalled();
	});

	it('submits correct place_bid contract call when entered amount is at or above minimum (#1164)', () => {
		render(
			<AuctionBidPanel
				creatorId="creator-1"
				highestBid={10}
				minIncrement={1}
			/>
		);

		const input = screen.getByTestId('auction-bid-input');
		const submitBtn = screen.getByTestId('auction-bid-submit');

		fireEvent.change(input, { target: { value: '15.5' } });
		expect(screen.queryByTestId('auction-bid-error')).not.toBeInTheDocument();

		fireEvent.click(submitBtn);
		expect(mockMutate).toHaveBeenCalledTimes(1);
		expect(mockMutate).toHaveBeenCalledWith(15.5, expect.any(Object));
	});

	it('disables input and submit button when disabled prop is true', () => {
		render(
			<AuctionBidPanel
				creatorId="creator-1"
				highestBid={10}
				minIncrement={1}
				disabled
			/>
		);

		expect(screen.getByTestId('auction-bid-input')).toBeDisabled();
		expect(screen.getByTestId('auction-bid-submit')).toBeDisabled();
	});

	it('prompts to connect wallet when no wallet is connected', () => {
		mockUseAccount.mockReturnValue({
			address: undefined,
			isConnected: false,
		} as ReturnType<typeof useAccount>);

		render(
			<AuctionBidPanel
				creatorId="creator-1"
				highestBid={10}
				minIncrement={1}
			/>
		);

		expect(screen.getByTestId('auction-bid-submit')).toHaveTextContent(
			'Connect wallet to bid'
		);
	});
});
