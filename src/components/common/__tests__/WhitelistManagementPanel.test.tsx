import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WhitelistManagementPanel from '../WhitelistManagementPanel';
import type { WhitelistEntry } from '@/services/creatorWhitelist.service';

const ADDR_1 = 'GBZXN7PIRZGNMHGA72W2DISDGFICRHDEG644GQNDYAWXCVFD3FYMVWAC';
const ADDR_2 = 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ';
const ADDR_3 = 'GCKFBEIYV2U22IO2GUOWGQPTZXCOTIZPGWFFSUK2BUMDHQIBNXFHZU4P';

const INITIAL_ENTRIES: WhitelistEntry[] = [
	{ walletAddress: ADDR_1, addedAt: '2026-09-27T10:00:00.000Z' },
	{ walletAddress: ADDR_2, addedAt: '2026-09-27T11:00:00.000Z' },
];

describe('WhitelistManagementPanel', () => {
	const mockOnAddAddresses = vi.fn();
	const mockOnRemoveAddress = vi.fn();
	const mockOnDisableWhitelist = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders all approved wallets in the whitelist table correctly (Acceptance Criteria 1)', () => {
		render(
			<WhitelistManagementPanel
				creatorId="creator-1"
				isWhitelistEnabled={true}
				whitelist={INITIAL_ENTRIES}
				onAddAddresses={mockOnAddAddresses}
				onRemoveAddress={mockOnRemoveAddress}
				onDisableWhitelist={mockOnDisableWhitelist}
			/>
		);

		expect(screen.getByTestId('whitelist-table')).toBeInTheDocument();
		expect(screen.getByTestId(`whitelist-row-${ADDR_1}`)).toBeInTheDocument();
		expect(screen.getByTestId(`whitelist-row-${ADDR_2}`)).toBeInTheDocument();

		const dateCells = screen.getAllByTestId('whitelist-date-added');
		expect(dateCells).toHaveLength(2);
		expect(dateCells[0]).toHaveTextContent(/Sep|September/);
	});

	it('displays empty state when no wallets are on the whitelist', () => {
		render(
			<WhitelistManagementPanel
				creatorId="creator-1"
				isWhitelistEnabled={true}
				whitelist={[]}
				onAddAddresses={mockOnAddAddresses}
				onRemoveAddress={mockOnRemoveAddress}
				onDisableWhitelist={mockOnDisableWhitelist}
			/>
		);

		expect(screen.getByTestId('whitelist-empty-state')).toBeInTheDocument();
		expect(
			screen.getByText(/no approved wallets on the whitelist yet/i)
		).toBeInTheDocument();
	});

	it('validates Stellar address format before submitting in single address mode (Acceptance Criteria 2)', async () => {
		render(
			<WhitelistManagementPanel
				creatorId="creator-1"
				isWhitelistEnabled={true}
				whitelist={INITIAL_ENTRIES}
				onAddAddresses={mockOnAddAddresses}
				onRemoveAddress={mockOnRemoveAddress}
				onDisableWhitelist={mockOnDisableWhitelist}
			/>
		);

		const input = screen.getByTestId('whitelist-address-input');
		const addButton = screen.getByTestId('whitelist-add-button');

		// 1. Invalid address (EVM address)
		fireEvent.change(input, {
			target: { value: '0x71C8418320499D23b0B27B54714659b85c1F7c2b' },
		});
		fireEvent.click(addButton);

		expect(screen.getByTestId('whitelist-address-error')).toBeInTheDocument();
		expect(screen.getByTestId('whitelist-address-error')).toHaveTextContent(
			/invalid stellar address format/i
		);
		expect(mockOnAddAddresses).not.toHaveBeenCalled();

		// 2. Already whitelisted address
		fireEvent.change(input, { target: { value: ADDR_1 } });
		fireEvent.click(addButton);

		expect(screen.getByTestId('whitelist-address-error')).toHaveTextContent(
			/already on the whitelist/i
		);
		expect(mockOnAddAddresses).not.toHaveBeenCalled();

		// 3. Valid Stellar address
		fireEvent.change(input, { target: { value: ADDR_3 } });
		fireEvent.click(addButton);

		await waitFor(() => {
			expect(mockOnAddAddresses).toHaveBeenCalledWith([ADDR_3]);
		});
	});

	it('parses multiple addresses from newline-separated input in batch paste mode (Acceptance Criteria 3)', async () => {
		render(
			<WhitelistManagementPanel
				creatorId="creator-1"
				isWhitelistEnabled={true}
				whitelist={INITIAL_ENTRIES}
				onAddAddresses={mockOnAddAddresses}
				onRemoveAddress={mockOnRemoveAddress}
				onDisableWhitelist={mockOnDisableWhitelist}
			/>
		);

		// Switch to batch mode
		fireEvent.click(screen.getByTestId('whitelist-mode-batch'));

		const batchInput = screen.getByTestId('whitelist-batch-input');
		const newlineSeparated = `${ADDR_1}\n${ADDR_2}\n${ADDR_3}`;

		fireEvent.change(batchInput, { target: { value: newlineSeparated } });

		expect(screen.getByTestId('whitelist-batch-summary')).toHaveTextContent(
			/3 valid addresses/i
		);

		const batchAddButton = screen.getByTestId('whitelist-batch-add-button');
		fireEvent.click(batchAddButton);

		await waitFor(() => {
			expect(mockOnAddAddresses).toHaveBeenCalledWith([
				ADDR_1,
				ADDR_2,
				ADDR_3,
			]);
		});
	});

	it('requires confirmation before removing a wallet from the whitelist', async () => {
		render(
			<WhitelistManagementPanel
				creatorId="creator-1"
				isWhitelistEnabled={true}
				whitelist={INITIAL_ENTRIES}
				onAddAddresses={mockOnAddAddresses}
				onRemoveAddress={mockOnRemoveAddress}
				onDisableWhitelist={mockOnDisableWhitelist}
			/>
		);

		const removeBtn = screen.getByTestId(`whitelist-remove-${ADDR_1}`);
		fireEvent.click(removeBtn);

		// Confirmation modal should be visible
		expect(screen.getByTestId('remove-wallet-modal')).toBeInTheDocument();
		expect(mockOnRemoveAddress).not.toHaveBeenCalled();

		// Cancel should close modal without removing
		fireEvent.click(screen.getByTestId('cancel-remove-wallet-btn'));
		await waitFor(() => {
			expect(
				screen.queryByTestId('remove-wallet-modal')
			).not.toBeInTheDocument();
		});
		expect(mockOnRemoveAddress).not.toHaveBeenCalled();

		// Open again and confirm
		fireEvent.click(screen.getByTestId(`whitelist-remove-${ADDR_1}`));
		fireEvent.click(screen.getByTestId('confirm-remove-wallet-btn'));

		await waitFor(() => {
			expect(mockOnRemoveAddress).toHaveBeenCalledWith(ADDR_1);
		});
	});

	it('disabling whitelist requires confirmation via warning modal and is irreversible (Acceptance Criteria 4)', async () => {
		render(
			<WhitelistManagementPanel
				creatorId="creator-1"
				isWhitelistEnabled={true}
				whitelist={INITIAL_ENTRIES}
				onAddAddresses={mockOnAddAddresses}
				onRemoveAddress={mockOnRemoveAddress}
				onDisableWhitelist={mockOnDisableWhitelist}
			/>
		);

		const toggleButton = screen.getByTestId('whitelist-gate-toggle');
		expect(toggleButton).toHaveTextContent(/disable whitelist/i);
		expect(screen.getByTestId('whitelist-gate-status')).toHaveTextContent(
			/active/i
		);

		// Clicking toggle opens warning modal
		fireEvent.click(toggleButton);
		expect(screen.getByTestId('disable-whitelist-modal')).toBeInTheDocument();
		expect(
			screen.getByTestId('disable-whitelist-warning')
		).toHaveTextContent(/irreversible/i);
		expect(mockOnDisableWhitelist).not.toHaveBeenCalled();

		// Cancelling modal preserves active state
		fireEvent.click(screen.getByTestId('cancel-disable-whitelist-btn'));
		await waitFor(() => {
			expect(
				screen.queryByTestId('disable-whitelist-modal')
			).not.toBeInTheDocument();
		});
		expect(mockOnDisableWhitelist).not.toHaveBeenCalled();

		// Open again and confirm
		fireEvent.click(toggleButton);
		fireEvent.click(screen.getByTestId('confirm-disable-whitelist-btn'));

		await waitFor(() => {
			expect(mockOnDisableWhitelist).toHaveBeenCalled();
		});
	});

	it('renders disabled state as irreversible and hides the add form when whitelist is disabled', () => {
		render(
			<WhitelistManagementPanel
				creatorId="creator-1"
				isWhitelistEnabled={false}
				whitelist={INITIAL_ENTRIES}
				onAddAddresses={mockOnAddAddresses}
				onRemoveAddress={mockOnRemoveAddress}
				onDisableWhitelist={mockOnDisableWhitelist}
			/>
		);

		expect(screen.getByTestId('whitelist-gate-status')).toHaveTextContent(
			/disabled/i
		);
		const toggleButton = screen.getByTestId('whitelist-gate-toggle');
		expect(toggleButton).toBeDisabled();
		expect(toggleButton).toHaveTextContent(/permanently disabled/i);
		expect(
			screen.getByTestId('whitelist-disabled-banner')
		).toBeInTheDocument();

		// Add form is hidden when gate is disabled
		expect(
			screen.queryByTestId('whitelist-add-form-container')
		).not.toBeInTheDocument();
	});
});
