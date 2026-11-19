import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import WalletConnectionPopover from '@/components/common/WalletConnectionPopover';

// ── wagmi mocks ───────────────────────────────────────────────────────────────
vi.mock('wagmi', () => ({
	useAccount: vi.fn(),
	useConnect: vi.fn(),
	useDisconnect: vi.fn(),
}));

// ── stall detection — keep it quiet in unit tests ────────────────────────────
vi.mock('@/hooks/useWalletConnectionStallDetection', () => ({
	useWalletConnectionStallDetection: vi.fn(() => false),
	WALLET_CONNECTION_AD_BLOCKER_MESSAGE: 'Ad blocker detected.',
}));

import { useAccount, useConnect, useDisconnect } from 'wagmi';

const mockUseAccount = vi.mocked(useAccount);
const mockUseConnect = vi.mocked(useConnect);
const mockUseDisconnect = vi.mocked(useDisconnect);

// ── helpers ───────────────────────────────────────────────────────────────────

function setupDisconnected() {
	mockUseAccount.mockReturnValue({
		address: undefined,
		isConnected: false,
	} as ReturnType<typeof useAccount>);

	mockUseConnect.mockReturnValue({
		connect: vi.fn(),
		connectAsync: vi.fn(),
		connectors: [{ id: 'mock', name: 'Mock Wallet' }] as ReturnType<typeof useConnect>['connectors'],
		error: null,
		isPending: false,
		variables: undefined,
		status: 'idle',
		data: undefined,
		failureCount: 0,
		failureReason: null,
		isError: false,
		isIdle: true,
		isPaused: false,
		isSuccess: false,
		reset: vi.fn(),
		submittedAt: 0,
	} as ReturnType<typeof useConnect>);

	mockUseDisconnect.mockReturnValue({
		disconnect: vi.fn(),
		disconnectAsync: vi.fn(),
		variables: undefined,
		status: 'idle',
		data: undefined,
		error: null,
		failureCount: 0,
		failureReason: null,
		isError: false,
		isIdle: true,
		isPending: false,
		isPaused: false,
		isSuccess: false,
		reset: vi.fn(),
	} as ReturnType<typeof useDisconnect>);
}

function setupConnected(address = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12') {
	mockUseAccount.mockReturnValue({
		address,
		isConnected: true,
	} as ReturnType<typeof useAccount>);

	mockUseConnect.mockReturnValue({
		connect: vi.fn(),
		connectAsync: vi.fn(),
		connectors: [],
		error: null,
		isPending: false,
		variables: undefined,
		status: 'idle',
		data: undefined,
		failureCount: 0,
		failureReason: null,
		isError: false,
		isIdle: true,
		isPaused: false,
		isSuccess: false,
		reset: vi.fn(),
		submittedAt: 0,
	} as ReturnType<typeof useConnect>);

	mockUseDisconnect.mockReturnValue({
		disconnect: vi.fn(),
		disconnectAsync: vi.fn(),
		variables: undefined,
		status: 'idle',
		data: undefined,
		error: null,
		failureCount: 0,
		failureReason: null,
		isError: false,
		isIdle: true,
		isPending: false,
		isPaused: false,
		isSuccess: false,
		reset: vi.fn(),
	} as ReturnType<typeof useDisconnect>);
}

// ─────────────────────────────────────────────────────────────────────────────

describe('WalletConnectionPopover — disconnected state', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDisconnected();
	});

	it('renders the Connect Wallet button when no wallet is connected', () => {
		render(<WalletConnectionPopover />);

		expect(
			screen.getByRole('button', { name: /connect wallet/i })
		).toBeInTheDocument();
	});

	it('does not render the wallet address trigger when no wallet is connected', () => {
		render(<WalletConnectionPopover />);

		expect(
			screen.queryByTestId('wallet-address-trigger')
		).not.toBeInTheDocument();
	});

	it('does not render a truncated address anywhere when no wallet is connected', () => {
		render(<WalletConnectionPopover />);

		// No element should contain a hex address pattern
		expect(screen.queryByText(/0x[0-9a-fA-F]/)).not.toBeInTheDocument();
	});

	it('does not render the disconnect button when no wallet is connected', () => {
		render(<WalletConnectionPopover />);

		expect(
			screen.queryByRole('button', { name: /disconnect/i })
		).not.toBeInTheDocument();
	});

	it('calls connect with the primary connector when the button is clicked', async () => {
		const user = userEvent.setup();
		const mockConnect = vi.fn();
		const fakeConnector = { id: 'mock', name: 'Mock Wallet' };

		mockUseConnect.mockReturnValue({
			connect: mockConnect,
			connectAsync: vi.fn(),
			connectors: [fakeConnector] as ReturnType<typeof useConnect>['connectors'],
			error: null,
			isPending: false,
			variables: undefined,
			status: 'idle',
			data: undefined,
			failureCount: 0,
			failureReason: null,
			isError: false,
			isIdle: true,
			isPaused: false,
			isSuccess: false,
			reset: vi.fn(),
			submittedAt: 0,
		} as ReturnType<typeof useConnect>);

		render(<WalletConnectionPopover />);
		await user.click(screen.getByRole('button', { name: /connect wallet/i }));

		expect(mockConnect).toHaveBeenCalledOnce();
		expect(mockConnect).toHaveBeenCalledWith({ connector: fakeConnector });
	});
});

describe('WalletConnectionPopover — connected state', () => {
	const FULL_ADDRESS = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';
	// shortenAddress defaults: first 6 chars + '...' + last 4 chars
	const TRUNCATED_ADDRESS = `${FULL_ADDRESS.slice(0, 4)}...${FULL_ADDRESS.slice(-4)}`;

	beforeEach(() => {
		vi.clearAllMocks();
		setupConnected(FULL_ADDRESS);
	});

	it('renders the truncated address trigger when a wallet is connected', () => {
		render(<WalletConnectionPopover />);

		const trigger = screen.getByTestId('wallet-address-trigger');
		expect(trigger).toBeInTheDocument();
		expect(trigger).toHaveTextContent(TRUNCATED_ADDRESS);
	});

	it('does not render the Connect Wallet button when a wallet is connected', () => {
		render(<WalletConnectionPopover />);

		expect(
			screen.queryByRole('button', { name: /connect wallet/i })
		).not.toBeInTheDocument();
	});

	it('does not render the full wallet address as plain text in the DOM', () => {
		render(<WalletConnectionPopover />);

		// The full address must not appear as a text node anywhere
		// (it only lives inside the CopyField input value attribute,
		// which is not a text node and is only visible after opening the popover)
		const allText = document.body.textContent ?? '';
		expect(allText).not.toContain(FULL_ADDRESS);
	});

	it('opens the popover and reveals the copy button and disconnect button', async () => {
		const user = userEvent.setup();
		render(<WalletConnectionPopover />);

		// Before opening the popover, the content is not in the DOM
		expect(
			screen.queryByTestId('disconnect-wallet-button')
		).not.toBeInTheDocument();

		// Open the popover
		await user.click(screen.getByTestId('wallet-address-trigger'));

		// Disconnect button should now be visible
		expect(
			screen.getByRole('button', { name: /disconnect/i })
		).toBeInTheDocument();

		// Copy button for the wallet address should be visible
		expect(
			screen.getByRole('button', { name: /copy wallet address/i })
		).toBeInTheDocument();
	});

	it('shows the wallet address in the copy field input after opening the popover', async () => {
		const user = userEvent.setup();
		render(<WalletConnectionPopover />);

		await user.click(screen.getByTestId('wallet-address-trigger'));

		// The CopyField renders an input with aria-label="Wallet address"
		const addressInput = screen.getByRole('textbox', {
			name: /wallet address/i,
		});
		expect(addressInput).toHaveValue(FULL_ADDRESS);
	});

	it('calls disconnect when the disconnect button is clicked', async () => {
		const user = userEvent.setup();
		const mockDisconnect = vi.fn();

		mockUseDisconnect.mockReturnValue({
			disconnect: mockDisconnect,
			disconnectAsync: vi.fn(),
			variables: undefined,
			status: 'idle',
			data: undefined,
			error: null,
			failureCount: 0,
			failureReason: null,
			isError: false,
			isIdle: true,
			isPending: false,
			isPaused: false,
			isSuccess: false,
			reset: vi.fn(),
		} as ReturnType<typeof useDisconnect>);

		render(<WalletConnectionPopover />);

		await user.click(screen.getByTestId('wallet-address-trigger'));
		await user.click(screen.getByRole('button', { name: /disconnect/i }));

		expect(mockDisconnect).toHaveBeenCalledOnce();
	});

	it('the truncated address trigger does not expose the full address as text', () => {
		render(<WalletConnectionPopover />);

		const trigger = screen.getByTestId('wallet-address-trigger');
		// The text content of the trigger is the truncated address only
		expect(trigger.textContent).toBe(TRUNCATED_ADDRESS);
		expect(trigger.textContent).not.toContain(FULL_ADDRESS);
	});

	it('the popover content is not in the DOM before the trigger is clicked', () => {
		render(<WalletConnectionPopover />);

		// Radix Popover uses a portal — content is absent until opened
		expect(
			screen.queryByRole('button', { name: /disconnect/i })
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /copy wallet address/i })
		).not.toBeInTheDocument();
	});
});
