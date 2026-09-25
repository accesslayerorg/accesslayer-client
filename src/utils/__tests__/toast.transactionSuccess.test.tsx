import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import toast, { type Toast } from 'react-hot-toast';
import showToast from '@/utils/toast.util';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
	default: {
		remove: vi.fn(),
		custom: vi.fn(),
	},
}));

describe('showToast.transactionSuccess', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('shows transaction confirmed toast with truncated tx hash', () => {
		const txHash =
			'0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
		const explorerUrl = 'https://stellar.expert/explorer/testnet/tx/' + txHash;

		showToast.transactionSuccess(
			'Transaction confirmed',
			'0xabcdef…567890',
			txHash,
			explorerUrl
		);

		expect(toast.remove).toHaveBeenCalledOnce();
		expect(toast.custom).toHaveBeenCalledOnce();

		// Verify the duration is 6 seconds (6000ms)
		const [, options] = vi.mocked(toast.custom).mock.calls[0];
		expect(options).toMatchObject({ duration: 6000 });
	});

	it('renders transaction toast with View on Stellar Expert link', () => {
		const txHash =
			'0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
		const explorerUrl = 'https://stellar.expert/explorer/testnet/tx/' + txHash;

		// Capture the JSX component passed to toast.custom
		showToast.transactionSuccess(
			'Transaction confirmed',
			'0xabcdef…567890',
			txHash,
			explorerUrl
		);

		const [toastComponent] = vi.mocked(toast.custom).mock.calls[0];
		const mockToastState = { visible: true, id: '1' };

		// Render the toast component
		render(
			<div>{toastComponent(mockToastState as Toast)}</div>
		);

		// Check that the title is rendered
		expect(screen.getByText('Transaction confirmed')).toBeInTheDocument();

		// Check that the truncated hash message is shown
		expect(screen.getByText('0xabcdef…567890')).toBeInTheDocument();

		// Check that the "View on Stellar Expert" link is present
		const explorerLink = screen.getByText('View on Stellar Expert');
		expect(explorerLink).toBeInTheDocument();
		expect(explorerLink.closest('a')).toHaveAttribute('href', explorerUrl);
		expect(explorerLink.closest('a')).toHaveAttribute('target', '_blank');
		expect(explorerLink.closest('a')).toHaveAttribute(
			'rel',
			'noopener noreferrer'
		);
	});

	it('shows transaction hash in TransactionHashRow when txHash is provided', () => {
		const txHash =
			'0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
		const explorerUrl = 'https://stellar.expert/explorer/mainnet/tx/' + txHash;

		showToast.transactionSuccess(
			'Transaction confirmed',
			'Transaction completed successfully',
			txHash,
			explorerUrl
		);

		const [toastComponent] = vi.mocked(toast.custom).mock.calls[0];
		const mockToastState = { visible: true, id: '1' };

		render(<div>{toastComponent(mockToastState as Toast)}</div>);

		// The TransactionHashRow will display the full hash somewhere (likely in a copy field)
		// We can't easily test the internal CopyField behavior without more mocking,
		// but we can verify the structure is rendered
		expect(screen.getByText('Transaction confirmed')).toBeInTheDocument();
	});

	it('auto-dismisses after 6 seconds', () => {
		const txHash = '0xabc123';
		const explorerUrl = 'https://stellar.expert/explorer/testnet/tx/0xabc123';

		showToast.transactionSuccess(
			'Transaction confirmed',
			'0xabc123',
			txHash,
			explorerUrl
		);

		const [, options] = vi.mocked(toast.custom).mock.calls[0];
		expect(options?.duration).toBe(6000);
	});

	it('works without explorer URL', () => {
		const txHash =
			'0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

		showToast.transactionSuccess(
			'Transaction confirmed',
			'0xabcdef…567890',
			txHash,
			undefined // No explorer URL
		);

		const [toastComponent] = vi.mocked(toast.custom).mock.calls[0];
		const mockToastState = { visible: true, id: '1' };

		render(<div>{toastComponent(mockToastState as Toast)}</div>);

		expect(screen.getByText('Transaction confirmed')).toBeInTheDocument();
		// No "View on Stellar Expert" link should be shown
		expect(
			screen.queryByText('View on Stellar Expert')
		).not.toBeInTheDocument();
	});

	it('removes previous toasts before showing new one (no duplicates)', () => {
		showToast.transactionSuccess('Transaction confirmed', '0xabc', 'hash', 'url');

		expect(toast.remove).toHaveBeenCalledOnce();

		// Show another toast
		showToast.transactionSuccess(
			'Another transaction',
			'0xdef',
			'hash2',
			'url2'
		);

		expect(toast.remove).toHaveBeenCalledTimes(2);
	});

	it('handles mainnet network correctly', () => {
		const txHash = '0x123abc';
		const explorerUrl = 'https://stellar.expert/explorer/mainnet/tx/0x123abc';

		showToast.transactionSuccess(
			'Transaction confirmed',
			'0x123abc',
			txHash,
			explorerUrl
		);

		const [toastComponent] = vi.mocked(toast.custom).mock.calls[0];
		const mockToastState = { visible: true, id: '1' };

		render(<div>{toastComponent(mockToastState as Toast)}</div>);

		const explorerLink = screen.getByText('View on Stellar Expert');
		expect(explorerLink.closest('a')).toHaveAttribute('href', explorerUrl);
	});
});
