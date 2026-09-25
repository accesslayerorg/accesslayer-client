import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TimelockAdminPanel from '../TimelockAdminPanel';
import { useTimelockStore, ADMIN_WALLETS } from '@/hooks/useTimelockStore';

describe('TimelockAdminPanel (#964)', () => {
	const adminWallet = Array.from(ADMIN_WALLETS)[0];
	const nonAdminWallet = '0x1111111111111111111111111111111111111111';

	beforeEach(() => {
		useTimelockStore.getState().reset();
	});

	it('renders nothing for non-admin wallet', () => {
		const { container } = render(<TimelockAdminPanel walletAddress={nonAdminWallet} />);
		expect(container.firstChild).toBeNull();
		expect(screen.queryByTestId('timelock-admin-panel')).not.toBeInTheDocument();
	});

	it('renders panel and lists pending actions with parameters for authorized admin', () => {
		render(<TimelockAdminPanel walletAddress={adminWallet} />);

		expect(screen.getByTestId('timelock-admin-panel')).toBeInTheDocument();
		expect(screen.getByText('Timelock Governance')).toBeInTheDocument();
		expect(screen.getByText('Update Protocol Fee Recipient')).toBeInTheDocument();

		// Action parameters should be visible
		expect(screen.getByText(/newRecipient:/i)).toBeInTheDocument();
	});

	it('has execute button enabled for ready actions and disabled for pending delays', () => {
		render(<TimelockAdminPanel walletAddress={adminWallet} />);

		// Action 1 is ready (delay elapsed) -> execute button should be enabled
		const readyExecuteBtn = screen.getByTestId('timelock-execute-btn-tl-action-1');
		expect(readyExecuteBtn).not.toBeDisabled();

		// Action 2 has delay remaining -> execute button should be disabled
		const pendingExecuteBtn = screen.getByTestId('timelock-execute-btn-tl-action-2');
		expect(pendingExecuteBtn).toBeDisabled();
		expect(pendingExecuteBtn).toHaveAttribute(
			'title',
			'Action cannot be executed until timelock delay elapses'
		);
	});

	it('executes a ready action and moves it to history', async () => {
		render(<TimelockAdminPanel walletAddress={adminWallet} />);

		const readyExecuteBtn = screen.getByTestId('timelock-execute-btn-tl-action-1');
		fireEvent.click(readyExecuteBtn);

		await waitFor(() => {
			// Should no longer be in pending
			expect(screen.queryByTestId('timelock-action-tl-action-1')).not.toBeInTheDocument();
		});

		// Switch to history tab
		const historyTab = screen.getByTestId('tab-history-actions');
		fireEvent.click(historyTab);

		// Action 1 should be listed as executed in history
		expect(screen.getByTestId('timelock-history-tl-action-1')).toBeInTheDocument();
	});

	it('cancels an action and moves it to history', async () => {
		render(<TimelockAdminPanel walletAddress={adminWallet} />);

		const cancelBtn = screen.getByTestId('timelock-cancel-btn-tl-action-2');
		fireEvent.click(cancelBtn);

		await waitFor(() => {
			// Should no longer be in pending
			expect(screen.queryByTestId('timelock-action-tl-action-2')).not.toBeInTheDocument();
		});

		// Switch to history tab
		const historyTab = screen.getByTestId('tab-history-actions');
		fireEvent.click(historyTab);

		// Action 2 should be in history
		expect(screen.getByTestId('timelock-history-tl-action-2')).toBeInTheDocument();
	});
});
