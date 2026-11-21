import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BatchTransferModal from '../BatchTransferModal';
import { MAX_BATCH_TRANSFER_RECIPIENTS } from '@/utils/batchTransfer.utils';

const mutateAsync = vi.fn();

vi.mock('@/hooks/useWallet', () => ({
	useBatchTransferMutation: () => ({ mutateAsync, isPending: false }),
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
	props?: Partial<React.ComponentProps<typeof BatchTransferModal>>
) => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<BatchTransferModal
				open
				onOpenChange={vi.fn()}
				creatorId="creator-1"
				creatorName="Alex Rivers"
				liquidBalance={10}
				{...props}
			/>
		</QueryClientProvider>
	);
};

describe('BatchTransferModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mutateAsync.mockResolvedValue({ success: true });
	});

	it('renders modal dialog with initial 1 recipient row and total keys', () => {
		renderModal({ liquidBalance: 15 });

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('Batch Transfer Keys')).toBeInTheDocument();
		expect(screen.getByTestId('batch-transfer-row-0')).toBeInTheDocument();
		expect(screen.getByTestId('batch-transfer-total-keys')).toHaveTextContent(
			'1 key'
		);
		expect(
			screen.getByTestId('batch-transfer-liquid-balance')
		).toHaveTextContent('15 keys');
	});

	it('updates total keys displayed in real time as quantities change', async () => {
		const user = userEvent.setup();
		renderModal({ liquidBalance: 20 });

		const qtyInput = screen.getByTestId('batch-transfer-quantity-0');
		await user.clear(qtyInput);
		await user.type(qtyInput, '5');

		expect(screen.getByTestId('batch-transfer-total-keys')).toHaveTextContent(
			'5 keys'
		);

		// Add second recipient
		await user.click(screen.getByTestId('batch-transfer-add-row'));
		const secondQtyInput = screen.getByTestId('batch-transfer-quantity-1');
		await user.clear(secondQtyInput);
		await user.type(secondQtyInput, '3');

		expect(screen.getByTestId('batch-transfer-total-keys')).toHaveTextContent(
			'8 keys'
		);
	});

	it('allows adding up to 10 recipient rows and disables Add Recipient button at 10', async () => {
		const user = userEvent.setup();
		renderModal({ liquidBalance: 50 });

		const addButton = screen.getByTestId('batch-transfer-add-row');

		// Starts with 1 row, click 9 times to reach 10 rows
		for (let i = 1; i < MAX_BATCH_TRANSFER_RECIPIENTS; i++) {
			expect(addButton).toBeEnabled();
			await user.click(addButton);
		}

		// Now 10 rows are present
		for (let i = 0; i < 10; i++) {
			expect(
				screen.getByTestId(`batch-transfer-row-${i}`)
			).toBeInTheDocument();
		}

		// Button must now be disabled at 10 rows
		expect(addButton).toBeDisabled();
		expect(screen.getByText('10 / 10 recipients')).toBeInTheDocument();
	});

	it('re-enables Add Recipient button when a row is removed from 10', async () => {
		const user = userEvent.setup();
		renderModal({ liquidBalance: 50 });

		const addButton = screen.getByTestId('batch-transfer-add-row');
		for (let i = 1; i < 10; i++) {
			await user.click(addButton);
		}
		expect(addButton).toBeDisabled();

		// Remove row 9
		const removeButton = screen.getByTestId('batch-transfer-remove-9');
		await user.click(removeButton);

		expect(addButton).toBeEnabled();
		expect(screen.getByText('9 / 10 recipients')).toBeInTheDocument();
	});

	it('shows row-level error when address is invalid', async () => {
		const user = userEvent.setup();
		renderModal({ liquidBalance: 10 });

		const addressInput = screen.getByTestId('batch-transfer-address-0');
		await user.type(addressInput, 'not-a-valid-stellar-address');

		expect(
			screen.getByTestId('batch-transfer-row-error-0')
		).toHaveTextContent(
			'Invalid Stellar address (must start with G and be 56 characters)'
		);
		expect(screen.getByTestId('batch-transfer-submit')).toBeDisabled();
	});

	it('shows row-level error when address is duplicate', async () => {
		const user = userEvent.setup();
		const addrA = validAddress('A');
		renderModal({ liquidBalance: 10 });

		await user.type(screen.getByTestId('batch-transfer-address-0'), addrA);
		await user.click(screen.getByTestId('batch-transfer-add-row'));
		await user.type(screen.getByTestId('batch-transfer-address-1'), addrA);

		expect(
			screen.getByTestId('batch-transfer-row-error-1')
		).toHaveTextContent('Duplicate recipient address');
		expect(screen.getByTestId('batch-transfer-submit')).toBeDisabled();
	});

	it('shows row-level error when quantity is invalid', async () => {
		const user = userEvent.setup();
		renderModal({ liquidBalance: 10 });

		const qtyInput = screen.getByTestId('batch-transfer-quantity-0');
		await user.clear(qtyInput);
		await user.type(qtyInput, '0');

		expect(
			screen.getByTestId('batch-transfer-row-error-0')
		).toHaveTextContent('Quantity must be at least 1');
		expect(screen.getByTestId('batch-transfer-submit')).toBeDisabled();
	});

	it('shows error and disables submit when total quantity exceeds liquid balance', async () => {
		const user = userEvent.setup();
		renderModal({ liquidBalance: 5 });

		const addrA = validAddress('A');
		await user.type(screen.getByTestId('batch-transfer-address-0'), addrA);

		const qtyInput = screen.getByTestId('batch-transfer-quantity-0');
		await user.clear(qtyInput);
		await user.type(qtyInput, '6');

		expect(
			screen.getByTestId('batch-transfer-balance-error')
		).toHaveTextContent(
			'Total quantity (6) exceeds your liquid balance of 5 keys.'
		);
		expect(screen.getByTestId('batch-transfer-submit')).toBeDisabled();
	});

	it('enables submit when inputs are valid and within liquid balance', async () => {
		const user = userEvent.setup();
		renderModal({ liquidBalance: 10 });

		await user.type(
			screen.getByTestId('batch-transfer-address-0'),
			validAddress('A')
		);
		const qtyInput = screen.getByTestId('batch-transfer-quantity-0');
		await user.clear(qtyInput);
		await user.type(qtyInput, '4');

		expect(
			screen.queryByTestId('batch-transfer-balance-error')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('batch-transfer-row-error-0')
		).not.toBeInTheDocument();
		expect(screen.getByTestId('batch-transfer-submit')).toBeEnabled();
	});

	it('submits valid recipient addresses and quantities and calls the batch_transfer mutation', async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn();
		renderModal({ liquidBalance: 20, onOpenChange });

		const addrA = validAddress('A');
		const addrB = validAddress('B');

		await user.type(screen.getByTestId('batch-transfer-address-0'), addrA);
		const qty0 = screen.getByTestId('batch-transfer-quantity-0');
		await user.clear(qty0);
		await user.type(qty0, '3');

		await user.click(screen.getByTestId('batch-transfer-add-row'));
		await user.type(screen.getByTestId('batch-transfer-address-1'), addrB);
		const qty1 = screen.getByTestId('batch-transfer-quantity-1');
		await user.clear(qty1);
		await user.type(qty1, '2');

		await user.click(screen.getByTestId('batch-transfer-submit'));

		await waitFor(() => {
			expect(mutateAsync).toHaveBeenCalledWith({
				creatorId: 'creator-1',
				recipients: [
					{ address: addrA, quantity: 3 },
					{ address: addrB, quantity: 2 },
				],
			});
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});
	});

	it('calls custom onConfirm callback when provided', async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn().mockResolvedValue(undefined);
		const onOpenChange = vi.fn();
		renderModal({ liquidBalance: 10, onConfirm, onOpenChange });

		const addrA = validAddress('A');
		await user.type(screen.getByTestId('batch-transfer-address-0'), addrA);
		await user.click(screen.getByTestId('batch-transfer-submit'));

		await waitFor(() => {
			expect(onConfirm).toHaveBeenCalledWith(
				[{ address: addrA, quantity: 1 }],
				'creator-1'
			);
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});
	});

	it('closes modal when cancel button is clicked', async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn();
		renderModal({ onOpenChange });

		await user.click(screen.getByTestId('batch-transfer-cancel'));
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});
