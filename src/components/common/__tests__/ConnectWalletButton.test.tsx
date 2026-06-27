import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

describe('ConnectWalletButton wallet disconnect confirmation', () => {
	function renderConnectedWallet(disconnect = vi.fn()) {
		mockUseAccount.mockReturnValue({
			address: '0x1234567890abcdef1234567890abcdef12345678',
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

		render(<ConnectWalletButton />);

		return { disconnect };
	}

	it('opens a confirmation dialog before disconnecting', () => {
		const { disconnect } = renderConnectedWallet();

		fireEvent.click(screen.getByRole('button', { name: /0x1234/i }));

		expect(
			screen.getByRole('dialog', { name: /disconnect wallet/i })
		).toBeInTheDocument();
		expect(disconnect).not.toHaveBeenCalled();
	});

	it('disconnects when the confirmation action is clicked', () => {
		const { disconnect } = renderConnectedWallet();

		fireEvent.click(screen.getByRole('button', { name: /0x1234/i }));
		fireEvent.click(screen.getByRole('button', { name: /^disconnect$/i }));

		expect(disconnect).toHaveBeenCalledTimes(1);
	});

	it('cancels without disconnecting', async () => {
		const { disconnect } = renderConnectedWallet();

		fireEvent.click(screen.getByRole('button', { name: /0x1234/i }));
		fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

		await waitFor(() => {
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});
		expect(disconnect).not.toHaveBeenCalled();
	});

	it('dismisses with Escape without disconnecting', async () => {
		const { disconnect } = renderConnectedWallet();

		fireEvent.click(screen.getByRole('button', { name: /0x1234/i }));
		fireEvent.keyDown(document, { key: 'Escape' });

		await waitFor(() => {
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});
		expect(disconnect).not.toHaveBeenCalled();
	});
});
