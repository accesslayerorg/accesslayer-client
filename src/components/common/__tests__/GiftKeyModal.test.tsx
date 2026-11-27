import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GiftKeyModal from '../GiftKeyModal';
import { MAX_GIFT_MESSAGE_LENGTH } from '@/utils/giftKey.utils';

const mutateAsync = vi.fn();

vi.mock('@/hooks/useWallet', () => ({
	useGiftKeyMutation: () => ({ mutateAsync, isPending: false }),
}));

vi.mock('@/utils/toast.util', () => ({
	default: {
		loading: vi.fn(),
		error: vi.fn(),
		transactionSuccess: vi.fn(),
	},
}));

const validAddress = (char: string) => `G${char.repeat(55)}`;

const renderModal = (
	props?: Partial<React.ComponentProps<typeof GiftKeyModal>>
) => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<GiftKeyModal
				open
				onOpenChange={vi.fn()}
				keyId="creator-1"
				keyName="Alex Rivers"
				availableBalance={10}
				{...props}
			/>
		</QueryClientProvider>
	);
};

describe('GiftKeyModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mutateAsync.mockResolvedValue({ success: true });
	});

	it('blocks a quantity above the sender balance with an error', async () => {
		const user = userEvent.setup();
		renderModal({ availableBalance: 2 });

		const quantity = screen.getByTestId('gift-key-quantity');
		await user.clear(quantity);
		await user.type(quantity, '3');
		await user.type(
			screen.getByTestId('gift-key-recipient'),
			validAddress('A')
		);
		await user.click(screen.getByTestId('gift-key-review'));

		expect(screen.getByTestId('gift-key-quantity-error')).toHaveTextContent(
			'Quantity exceeds your balance of 2 keys'
		);
		expect(screen.queryByTestId('gift-key-summary')).not.toBeInTheDocument();
	});

	it('blocks a message longer than the limit', () => {
		renderModal();

		fireEvent.change(screen.getByTestId('gift-key-message'), {
			target: { value: 'x'.repeat(MAX_GIFT_MESSAGE_LENGTH + 1) },
		});
		fireEvent.click(screen.getByTestId('gift-key-review'));

		expect(screen.getByTestId('gift-key-message-error')).toHaveTextContent(
			`Message cannot exceed ${MAX_GIFT_MESSAGE_LENGTH} characters`
		);
	});

	it('reviews the gift before signing, listing key, quantity and recipient', async () => {
		const user = userEvent.setup();
		renderModal();

		const quantity = screen.getByTestId('gift-key-quantity');
		await user.clear(quantity);
		await user.type(quantity, '4');
		const recipient = validAddress('B');
		await user.type(screen.getByTestId('gift-key-recipient'), recipient);
		await user.click(screen.getByTestId('gift-key-review'));

		const summary = screen.getByTestId('gift-key-summary');
		expect(summary).toHaveTextContent('Alex Rivers');
		expect(screen.getByTestId('gift-key-summary-quantity')).toHaveTextContent(
			'4'
		);
		expect(
			screen.getByTestId('gift-key-summary-recipient')
		).toHaveTextContent(recipient);
	});

	it('sends the gift with quantity, recipient and message on confirm', async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn();
		renderModal({ onOpenChange });

		const quantity = screen.getByTestId('gift-key-quantity');
		await user.clear(quantity);
		await user.type(quantity, '2');
		const recipient = validAddress('C');
		await user.type(screen.getByTestId('gift-key-recipient'), recipient);
		await user.type(screen.getByTestId('gift-key-message'), 'Happy birthday');

		await user.click(screen.getByTestId('gift-key-review'));
		await user.click(screen.getByTestId('gift-key-confirm'));

		await waitFor(() => {
			expect(mutateAsync).toHaveBeenCalledWith({
				keyId: 'creator-1',
				quantity: 2,
				to: recipient,
				message: 'Happy birthday',
			});
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});
	});
});
