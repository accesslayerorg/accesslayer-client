import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TimelockQueuePanel from '@/components/admin/TimelockQueuePanel';
import { useTimelockActions } from '@/hooks/useTimelockActions';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import type { TimelockAction } from '@/services/admin.service';

vi.mock('@/hooks/useTimelockActions', () => ({
	useTimelockActions: vi.fn(),
}));
vi.mock('@/hooks/useStellarWallet', () => ({
	useStellarWallet: vi.fn(),
}));

const mockUseTimelockActions = vi.mocked(useTimelockActions);
const mockUseStellarWallet = vi.mocked(useStellarWallet);

function createAction(overrides: Partial<TimelockAction> = {}): TimelockAction {
	const now = Date.now();
	return {
		id: 'queue-1',
		type: 'set-oracle',
		params: { address: 'CA123', nested: { enabled: true }, amount: 10 },
		eta: new Date(now + 60 * 60 * 1000).toISOString(),
		status: 'pending',
		cancellable: true,
		cancellationDeadline: new Date(now + 10 * 60 * 1000).toISOString(),
		...overrides,
	};
}

function setup({
	isAdmin = true,
	action = createAction(),
}: {
	isAdmin?: boolean;
	action?: TimelockAction;
} = {}) {
	const cancel = { isPending: false, variables: undefined, mutate: vi.fn() };
	mockUseStellarWallet.mockReturnValue({
		address: 'CAADMIN',
		isConnected: true,
	} as ReturnType<typeof useStellarWallet>);
	mockUseTimelockActions.mockReturnValue({
		pending: { data: [action], isLoading: false, isError: false },
		history: { data: [], isLoading: false, isError: false },
		cancel,
		enabled: isAdmin,
	} as ReturnType<typeof useTimelockActions>);
	return { cancel };
}

describe('TimelockQueuePanel (#1014)', () => {
	beforeEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it('does not render for a non-admin wallet', () => {
		setup({ isAdmin: false });

		render(<TimelockQueuePanel isAdmin={false} />);

		expect(
			screen.queryByTestId('timelock-queue-panel')
		).not.toBeInTheDocument();
	});

	it('shows queued actions, ticks the ETA, and displays complete params', async () => {
		const now = new Date('2026-09-28T12:00:00.000Z');
		vi.useFakeTimers();
		vi.setSystemTime(now);
		const action = createAction({
			eta: new Date(now.getTime() + 3_600_000).toISOString(),
			cancellationDeadline: new Date(now.getTime() + 600_000).toISOString(),
		});
		setup({ action });

		render(<TimelockQueuePanel isAdmin />);

		expect(screen.getByText('set-oracle')).toBeInTheDocument();
		expect(screen.getByTestId('timelock-eta-queue-1')).toHaveTextContent(
			'01:00:00'
		);
		act(() => vi.advanceTimersByTime(1000));
		expect(screen.getByTestId('timelock-eta-queue-1')).toHaveTextContent(
			'00:59:59'
		);

		await act(async () => {
			screen
				.getByRole('button', { name: 'View set-oracle details' })
				.click();
		});
		expect(screen.getByRole('dialog')).toHaveTextContent(
			'"address": "CA123"'
		);
		expect(screen.getByRole('dialog')).toHaveTextContent('"enabled": true');
		expect(screen.getByRole('dialog')).toHaveTextContent('"amount": 10');
	});

	it('allows cancellation only within the advertised window and submits the selected action', async () => {
		const user = userEvent.setup();
		const { cancel } = setup();
		render(<TimelockQueuePanel isAdmin />);

		await user.click(screen.getByTestId('timelock-cancel-queue-1'));
		await user.click(
			screen.getByRole('button', { name: 'Cancel queued action' })
		);

		expect(cancel.mutate).toHaveBeenCalledWith(
			'queue-1',
			expect.objectContaining({ onSuccess: expect.any(Function) })
		);
	});

	it('disables cancellation after the advertised cancellation deadline', () => {
		setup({
			action: createAction({
				cancellationDeadline: new Date(Date.now() - 1000).toISOString(),
			}),
		});

		render(<TimelockQueuePanel isAdmin />);

		expect(screen.getByTestId('timelock-cancel-queue-1')).toBeDisabled();
	});
});
