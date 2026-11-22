import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccount } from 'wagmi';
import GiftReceivedBanner from '../GiftReceivedBanner';
import type { ReceivedGift } from '@/utils/giftKey.utils';

const useReceivedGifts = vi.fn();

vi.mock('@/hooks/useWallet', () => ({
	useReceivedGifts: (...args: unknown[]) => useReceivedGifts(...args),
}));

const wallet = `G${'A'.repeat(55)}`;
const sender = `G${'B'.repeat(55)}`;

const makeGift = (overrides: Partial<ReceivedGift> = {}): ReceivedGift => ({
	id: 'gift-1',
	keyId: 'creator-1',
	keyName: 'Alex Rivers',
	quantity: 3,
	from: sender,
	fromName: 'Maya',
	message: 'Enjoy these keys!',
	receivedAt: Date.now(),
	...overrides,
});

describe('GiftReceivedBanner', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		window.localStorage.clear();
		vi.mocked(useAccount).mockReturnValue({
			address: wallet,
			isConnected: true,
		} as unknown as ReturnType<typeof useAccount>);
	});

	it('shows the sender and message for gifts received since the last visit', () => {
		useReceivedGifts.mockReturnValue({ data: [makeGift()] });

		render(<GiftReceivedBanner />);

		expect(screen.getByTestId('gift-received-banner')).toBeInTheDocument();
		expect(screen.getByTestId('gift-received-summary')).toHaveTextContent(
			'Maya sent you 3 Alex Rivers keys'
		);
		expect(screen.getByTestId('gift-received-message')).toHaveTextContent(
			'Enjoy these keys!'
		);
	});

	it('falls back to the sender address when no name is provided', () => {
		useReceivedGifts.mockReturnValue({
			data: [makeGift({ fromName: undefined })],
		});

		render(<GiftReceivedBanner />);

		expect(screen.getByTestId('gift-received-summary')).toHaveTextContent(
			'GBBBBB…BBBB sent you 3 Alex Rivers keys'
		);
	});

	it('hides gifts already seen on a previous visit', () => {
		window.localStorage.setItem(
			`accesslayer.gifts.lastSeen.${wallet}`,
			String(Date.now())
		);
		useReceivedGifts.mockReturnValue({
			data: [makeGift({ receivedAt: Date.now() - 1000 })],
		});

		render(<GiftReceivedBanner />);

		expect(
			screen.queryByTestId('gift-received-banner')
		).not.toBeInTheDocument();
	});

	it('renders nothing when there are no gifts', () => {
		useReceivedGifts.mockReturnValue({ data: [] });

		render(<GiftReceivedBanner />);

		expect(
			screen.queryByTestId('gift-received-banner')
		).not.toBeInTheDocument();
	});
});
