import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import ConnectWalletButton from '@/components/common/ConnectWalletButton';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

vi.mock('wagmi', () => ({
	useAccount: vi.fn(),
	useConnect: vi.fn(),
	useDisconnect: vi.fn(),
}));

const mockUseAccount = vi.mocked(useAccount);
const mockUseConnect = vi.mocked(useConnect);
const mockUseDisconnect = vi.mocked(useDisconnect);

const FULL_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const TRUNCATED_ADDRESS_PATTERN = /0x12.*5678/i;

function setupConnectedWalletMocks(disconnect = vi.fn()) {
	mockUseAccount.mockReturnValue({
		address: FULL_ADDRESS,
		isConnected: true,
	} as ReturnType<typeof useAccount>);
	mockUseConnect.mockReturnValue({
		connect: vi.fn(),
		connectors: [],
		error: null,
		isPending: false,
	} as unknown as ReturnType<typeof useConnect>);
	mockUseDisconnect.mockReturnValue({
		disconnect,
	} as unknown as ReturnType<typeof useDisconnect>);

	return { disconnect };
}

function openAddressPopover() {
	fireEvent.click(
		screen.getByRole('button', { name: TRUNCATED_ADDRESS_PATTERN })
	);
}

describe('ConnectWalletButton wallet address popover', () => {
	function renderConnectedWallet(disconnect = vi.fn()) {
		const result = setupConnectedWalletMocks(disconnect);
		render(<ConnectWalletButton />);
		return result;
	}

	it('opens the address popover when clicking the truncated address', () => {
		const { disconnect } = renderConnectedWallet();

		openAddressPopover();

		expect(screen.getByText(FULL_ADDRESS)).toBeInTheDocument();
		expect(screen.getByText('Wallet address')).toBeInTheDocument();
		expect(disconnect).not.toHaveBeenCalled();
	});

	it('disconnects when the disconnect button is clicked', () => {
		const { disconnect } = renderConnectedWallet();

		openAddressPopover();
		fireEvent.click(screen.getByRole('button', { name: /^disconnect$/i }));

		expect(disconnect).toHaveBeenCalledTimes(1);
	});

	it('emits a structured disconnect log with session duration outside test env', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-27T10:00:00.000Z'));
		const originalEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = 'development';
		const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
		const { disconnect } = renderConnectedWallet();

		act(() => {
			vi.advanceTimersByTime(4_500);
		});

		openAddressPopover();
		fireEvent.click(screen.getByRole('button', { name: /^disconnect$/i }));

		expect(disconnect).toHaveBeenCalledTimes(1);
		expect(debugSpy).toHaveBeenCalledWith('[wallet-disconnect]', {
			truncated_address: '0x12...5678',
			session_duration_ms: 4_500,
			disconnected_at: '2026-07-27T10:00:04.500Z',
		});
		expect(JSON.stringify(debugSpy.mock.calls[0][1])).not.toContain(
			FULL_ADDRESS
		);

		debugSpy.mockRestore();
		process.env.NODE_ENV = originalEnv;
		vi.useRealTimers();
	});

	it('closes the popover without disconnecting when Escape is pressed', async () => {
		const { disconnect } = renderConnectedWallet();

		openAddressPopover();

		expect(screen.getByText(FULL_ADDRESS)).toBeInTheDocument();

		fireEvent.keyDown(document, { key: 'Escape' });

		await waitFor(() => {
			expect(screen.queryByText(FULL_ADDRESS)).not.toBeInTheDocument();
		});
		expect(disconnect).not.toHaveBeenCalled();
	});

	it('closes the popover without disconnecting when clicking outside', async () => {
		const user = userEvent.setup();
		const { disconnect } = renderConnectedWallet();

		openAddressPopover();

		expect(screen.getByText(FULL_ADDRESS)).toBeInTheDocument();

		// Click outside the popover on the document body
		await user.click(document.body);

		expect(screen.queryByText(FULL_ADDRESS)).not.toBeInTheDocument();
		expect(disconnect).not.toHaveBeenCalled();
	});
});

describe('ConnectWalletButton popover dismissal with parent header', () => {
	function renderConnectedWalletInHeader(disconnect = vi.fn()) {
		const result = setupConnectedWalletMocks(disconnect);
		render(
			<header data-testid="app-header">
				<div>
					<span>Access Layer</span>
				</div>
				<ConnectWalletButton />
			</header>
		);
		return result;
	}

	it('popover is visible after clicking the header address display', () => {
		renderConnectedWalletInHeader();

		openAddressPopover();

		expect(screen.getByText(FULL_ADDRESS)).toBeInTheDocument();
		expect(screen.getByText('Wallet address')).toBeInTheDocument();
	});

	it('closes the popover on outside click without unmounting the header', async () => {
		const user = userEvent.setup();
		renderConnectedWalletInHeader();

		openAddressPopover();
		expect(screen.getByText(FULL_ADDRESS)).toBeInTheDocument();

		// Click outside the popover on the header itself
		await user.click(screen.getByTestId('app-header'));

		expect(screen.queryByText(FULL_ADDRESS)).not.toBeInTheDocument();

		// Header address display should still be visible
		expect(
			screen.getByRole('button', { name: TRUNCATED_ADDRESS_PATTERN })
		).toBeInTheDocument();
		expect(screen.getByTestId('app-header')).toBeInTheDocument();
	});

	it('closes the popover on Escape without unmounting the header', async () => {
		renderConnectedWalletInHeader();

		openAddressPopover();
		expect(screen.getByText(FULL_ADDRESS)).toBeInTheDocument();

		fireEvent.keyDown(document, { key: 'Escape' });

		await waitFor(() => {
			expect(screen.queryByText(FULL_ADDRESS)).not.toBeInTheDocument();
		});

		// Header address display should still be visible
		expect(
			screen.getByRole('button', { name: TRUNCATED_ADDRESS_PATTERN })
		).toBeInTheDocument();
		expect(screen.getByTestId('app-header')).toBeInTheDocument();
	});

	it('header address display remains visible after reopen and close via both dismissal paths', async () => {
		const user = userEvent.setup();
		renderConnectedWalletInHeader();

		// First: outside click dismissal
		openAddressPopover();
		expect(screen.getByText(FULL_ADDRESS)).toBeInTheDocument();
		await user.click(screen.getByTestId('app-header'));

		expect(screen.queryByText(FULL_ADDRESS)).not.toBeInTheDocument();

		expect(
			screen.getByRole('button', { name: TRUNCATED_ADDRESS_PATTERN })
		).toBeInTheDocument();

		// Second: Escape dismissal
		openAddressPopover();
		expect(screen.getByText(FULL_ADDRESS)).toBeInTheDocument();
		fireEvent.keyDown(document, { key: 'Escape' });

		await waitFor(() => {
			expect(screen.queryByText(FULL_ADDRESS)).not.toBeInTheDocument();
		});

		expect(
			screen.getByRole('button', { name: TRUNCATED_ADDRESS_PATTERN })
		).toBeInTheDocument();
		expect(screen.getByTestId('app-header')).toBeInTheDocument();
	});
});

describe('ConnectWalletButton copy wallet address', () => {
	beforeEach(() => {
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText: vi.fn().mockResolvedValue(undefined) },
			writable: true,
			configurable: true,
		});
	});

	function renderConnectedWallet() {
		setupConnectedWalletMocks();
		render(<ConnectWalletButton />);
	}

	function openAndFindCopyButton() {
		openAddressPopover();
		return screen.getByRole('button', { name: /copy address/i });
	}

	it('shows the full wallet address inside the popover', () => {
		renderConnectedWallet();

		openAddressPopover();

		expect(screen.getByText(FULL_ADDRESS)).toBeInTheDocument();
		expect(screen.getByText('Wallet address')).toBeInTheDocument();
	});

	it('copies the full unmasked address to the clipboard on click', async () => {
		renderConnectedWallet();

		fireEvent.click(openAndFindCopyButton());

		await waitFor(() => {
			expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
				FULL_ADDRESS
			);
		});
	});

	it('shows a Copied state on the copy button after clicking', async () => {
		renderConnectedWallet();

		fireEvent.click(openAndFindCopyButton());

		expect(await screen.findByText('Copied')).toBeInTheDocument();
	});

	it('removes the Copied state after 2 seconds', async () => {
		vi.useFakeTimers();
		renderConnectedWallet();

		fireEvent.click(openAndFindCopyButton());

		// Flush the clipboard promise microtask so state updates land
		await act(async () => {
			await Promise.resolve();
		});

		expect(screen.getByText('Copied')).toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(2000);
		});

		expect(screen.queryByText('Copied')).not.toBeInTheDocument();

		vi.useRealTimers();
	});
});

describe('ConnectWalletButton connection states', () => {
	describe('Idle state', () => {
		beforeEach(() => {
			mockUseAccount.mockReturnValue({
				address: undefined,
				isConnected: false,
			} as ReturnType<typeof useAccount>);
		});

		it('renders Connect Wallet label in idle state', () => {
			mockUseConnect.mockReturnValue({
				connect: vi.fn(),
				connectors: [{ id: 'test-connector' }] as unknown[],
				error: null,
				isPending: false,
			} as unknown as ReturnType<typeof useConnect>);
			mockUseDisconnect.mockReturnValue({
				disconnect: vi.fn(),
			} as unknown as ReturnType<typeof useDisconnect>);

			render(<ConnectWalletButton />);

			const connectButton = screen.getByRole('button', {
				name: /Connect Wallet/i,
			});
			expect(connectButton).toBeInTheDocument();
		});

		it('Connect Wallet button is enabled in idle state', () => {
			mockUseConnect.mockReturnValue({
				connect: vi.fn(),
				connectors: [{ id: 'test-connector' }] as unknown[],
				error: null,
				isPending: false,
			} as unknown as ReturnType<typeof useConnect>);
			mockUseDisconnect.mockReturnValue({
				disconnect: vi.fn(),
			} as unknown as ReturnType<typeof useDisconnect>);

			render(<ConnectWalletButton />);

			const connectButton = screen.getByRole('button', {
				name: /Connect Wallet/i,
			});
			expect(connectButton).not.toBeDisabled();
		});

		it('disables Connect Wallet button when no connector is available', () => {
			mockUseConnect.mockReturnValue({
				connect: vi.fn(),
				connectors: [],
				error: null,
				isPending: false,
			} as unknown as ReturnType<typeof useConnect>);
			mockUseDisconnect.mockReturnValue({
				disconnect: vi.fn(),
			} as unknown as ReturnType<typeof useDisconnect>);

			render(<ConnectWalletButton />);

			const connectButton = screen.getByRole('button', {
				name: /Connect Wallet/i,
			});
			expect(connectButton).toBeDisabled();
		});
	});

	describe('Connecting state', () => {
		beforeEach(() => {
			mockUseAccount.mockReturnValue({
				address: undefined,
				isConnected: false,
			} as ReturnType<typeof useAccount>);
		});

		it('renders Connecting... label when isPending is true', () => {
			mockUseConnect.mockReturnValue({
				connect: vi.fn(),
				connectors: [{ id: 'test-connector' }] as unknown[],
				error: null,
				isPending: true,
			} as unknown as ReturnType<typeof useConnect>);
			mockUseDisconnect.mockReturnValue({
				disconnect: vi.fn(),
			} as unknown as ReturnType<typeof useDisconnect>);

			render(<ConnectWalletButton />);

			expect(screen.getByText(/Connecting\.\.\./)).toBeInTheDocument();
		});

		it('button is disabled when connecting', () => {
			mockUseConnect.mockReturnValue({
				connect: vi.fn(),
				connectors: [{ id: 'test-connector' }] as unknown[],
				error: null,
				isPending: true,
			} as unknown as ReturnType<typeof useConnect>);
			mockUseDisconnect.mockReturnValue({
				disconnect: vi.fn(),
			} as unknown as ReturnType<typeof useDisconnect>);

			render(<ConnectWalletButton />);

			const connectButton = screen.getByRole('button', {
				name: /Connecting/i,
			});
			expect(connectButton).toBeDisabled();
		});
	});

	describe('Connected state', () => {
		it('renders truncated wallet address when connected', () => {
			mockUseAccount.mockReturnValue({
				address: FULL_ADDRESS,
				isConnected: true,
			} as ReturnType<typeof useAccount>);
			mockUseConnect.mockReturnValue({
				connect: vi.fn(),
				connectors: [],
				error: null,
				isPending: false,
			} as unknown as ReturnType<typeof useConnect>);
			mockUseDisconnect.mockReturnValue({
				disconnect: vi.fn(),
			} as unknown as ReturnType<typeof useDisconnect>);

			render(<ConnectWalletButton />);

			// Should show truncated address button
			expect(
				screen.getByRole('button', { name: TRUNCATED_ADDRESS_PATTERN })
			).toBeInTheDocument();

			// Should NOT show "Connect Wallet" button
			expect(
				screen.queryByRole('button', { name: /Connect Wallet/i })
			).not.toBeInTheDocument();
		});
	});

	describe('Error state', () => {
		beforeEach(() => {
			mockUseAccount.mockReturnValue({
				address: undefined,
				isConnected: false,
			} as ReturnType<typeof useAccount>);
		});

		it('displays error message when connection fails', () => {
			const errorMessage = 'User rejected the request';
			mockUseConnect.mockReturnValue({
				connect: vi.fn(),
				connectors: [{ id: 'test-connector' }] as unknown[],
				error: { message: errorMessage } as unknown,
				isPending: false,
			} as unknown as ReturnType<typeof useConnect>);
			mockUseDisconnect.mockReturnValue({
				disconnect: vi.fn(),
			} as unknown as ReturnType<typeof useDisconnect>);

			render(<ConnectWalletButton />);

			expect(screen.getByText(errorMessage)).toBeInTheDocument();
		});

		it('calls connect handler when retry button is clicked', () => {
			const mockConnect = vi.fn();
			mockUseConnect.mockReturnValue({
				connect: mockConnect,
				connectors: [{ id: 'test-connector' }] as unknown[],
				error: null,
				isPending: false,
			} as unknown as ReturnType<typeof useConnect>);
			mockUseDisconnect.mockReturnValue({
				disconnect: vi.fn(),
			} as unknown as ReturnType<typeof useDisconnect>);

			render(<ConnectWalletButton />);

			// Click the Connect button (acts as retry)
			fireEvent.click(
				screen.getByRole('button', { name: /Connect Wallet/i })
			);

			expect(mockConnect).toHaveBeenCalled();
		});
	});
});
