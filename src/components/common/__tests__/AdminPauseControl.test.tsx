import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminPauseControl from '../AdminPauseControl';
import { useContractPausedStore } from '@/hooks/useContractPausedStore';

describe('AdminPauseControl (#953)', () => {
	const ADMIN_WALLET = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
	const NON_ADMIN_WALLET = '0x1234567890123456789012345678901234567890';

	beforeEach(() => {
		useContractPausedStore.setState({
			status: 'inactive',
			lastCheckedAt: null,
			isChecking: false,
			_intervalId: null,
		});
	});

	it('renders nothing when walletAddress is not an authorized admin', () => {
		const { container } = render(
			<AdminPauseControl walletAddress={NON_ADMIN_WALLET} />
		);
		expect(container.firstChild).toBeNull();
		expect(screen.queryByTestId('admin-pause-panel')).not.toBeInTheDocument();
	});

	it('renders nothing when no wallet address is provided and wagmi is disconnected', () => {
		const { container } = render(<AdminPauseControl />);
		expect(container.firstChild).toBeNull();
	});

	it('renders admin controls when connected wallet is an authorized admin', () => {
		render(<AdminPauseControl walletAddress={ADMIN_WALLET} />);

		expect(screen.getByTestId('admin-pause-panel')).toBeInTheDocument();
		expect(screen.getByText('Admin Controls')).toBeInTheDocument();
		expect(screen.getByText(/Active \(Trading Open\)/i)).toBeInTheDocument();

		const toggleBtn = screen.getByTestId('admin-pause-toggle');
		expect(toggleBtn).toBeInTheDocument();
		expect(toggleBtn).toHaveTextContent(/Emergency Pause/i);
	});

	it('toggles pause state when admin clicks emergency pause button', () => {
		render(<AdminPauseControl walletAddress={ADMIN_WALLET} />);

		const toggleBtn = screen.getByTestId('admin-pause-toggle');
		fireEvent.click(toggleBtn);

		expect(useContractPausedStore.getState().status).toBe('active');
		expect(screen.getByText(/Paused \(Trading Suspended\)/i)).toBeInTheDocument();
		expect(toggleBtn).toHaveTextContent(/Resume Contract/i);

		// Click to unpause
		fireEvent.click(toggleBtn);
		expect(useContractPausedStore.getState().status).toBe('inactive');
		expect(screen.getByText(/Active \(Trading Open\)/i)).toBeInTheDocument();
		expect(toggleBtn).toHaveTextContent(/Emergency Pause/i);
	});
});
