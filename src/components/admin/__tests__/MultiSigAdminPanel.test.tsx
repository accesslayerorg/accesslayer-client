import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MultiSigAdminPanel from '@/components/admin/MultiSigAdminPanel';
import { useMultiSigActions } from '@/hooks/useMultiSigActions';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import showToast from '@/utils/toast.util';
import type { MultiSigAction } from '@/services/admin.service';

vi.mock('@/hooks/useMultiSigActions', () => ({
	useMultiSigActions: vi.fn(),
}));
vi.mock('@/hooks/useStellarWallet', () => ({
	useStellarWallet: vi.fn(),
}));
vi.mock('@/utils/toast.util', () => ({
	default: { error: vi.fn(), success: vi.fn() },
}));

const mockUseMultiSigActions = vi.mocked(useMultiSigActions);
const mockUseStellarWallet = vi.mocked(useStellarWallet);
const mockToastError = vi.mocked(showToast.error);

const ADMIN_ADDRESS = '0x1111111111111111111111111111111111111111';
const SECOND_SIGNER = '0x2222222222222222222222222222222222222222';
const CONNECTED_SIGNER = '0x3333333333333333333333333333333333333333';
const ACTION: MultiSigAction = {
	id: 'action-1',
	type: 'deprecate-key',
	title: 'Deprecate key',
	payload: 'deprecate-key:key-1',
	createdAt: '2026-09-01T12:00:00.000Z',
	requiredSignatures: 2,
	totalSigners: 3,
	signatures: [{ signer: ADMIN_ADDRESS, signature: '0xfirst', signedAt: '2026-09-01T12:01:00.000Z' }],
};

function setup({
	isAdmin = true,
	signatures = ACTION.signatures,
	connectedAddress = ADMIN_ADDRESS,
}: {
	isAdmin?: boolean;
	signatures?: MultiSigAction['signatures'];
	connectedAddress?: string;
} = {}) {
	const sign = { isPending: false, mutate: vi.fn() };
	const execute = { isPending: false, mutate: vi.fn() };
	mockUseStellarWallet.mockReturnValue({
		address: connectedAddress,
		isConnected: true,
		activeSigner: { signMessage: vi.fn().mockResolvedValue('signature-2') },
	} as ReturnType<typeof useStellarWallet>);
	mockUseMultiSigActions.mockReturnValue({
		pending: { data: [{ ...ACTION, signatures }], isLoading: false, isError: false },
		history: { data: [], isLoading: false, isError: false },
		sign,
		execute,
		enabled: isAdmin,
	} as ReturnType<typeof useMultiSigActions>);
	return { sign, execute };
}

describe('MultiSigAdminPanel (#928)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('does not render for a non-admin wallet', () => {
		setup({ isAdmin: false });

		render(<MultiSigAdminPanel isAdmin={false} />);

		expect(screen.queryByTestId('multisig-admin-panel')).not.toBeInTheDocument();
	});

	it('lists the current signature count and disables execution below threshold', () => {
		setup();

		render(<MultiSigAdminPanel isAdmin />);

		expect(screen.getByText('1 / 2 signatures')).toBeInTheDocument();
		expect(screen.getByTestId('multisig-execute-action-1')).toBeDisabled();
	});

	it('enables execution at the 2-of-3 threshold and submits the wallet signature', async () => {
		const user = userEvent.setup();
		const { sign } = setup({
			connectedAddress: CONNECTED_SIGNER,
			signatures: [
				...ACTION.signatures,
				{ signer: SECOND_SIGNER, signature: '0xsecond', signedAt: '2026-09-01T12:02:00.000Z' },
			],
		});

		render(<MultiSigAdminPanel isAdmin />);

		expect(screen.getByTestId('multisig-execute-action-1')).toBeEnabled();
		await user.click(screen.getByRole('button', { name: /sign action/i }));
		expect(sign.mutate).toHaveBeenCalledWith(
			{ action: expect.objectContaining({ id: 'action-1' }), signature: 'signature-2' },
			expect.objectContaining({ onSettled: expect.any(Function) })
		);
	});

	it('surfaces wallet rejection without leaving the action in a signing state', async () => {
		const user = userEvent.setup();
		setup({ signatures: [] });
		vi.mocked(useStellarWallet).mockReturnValue({
			address: ADMIN_ADDRESS,
			isConnected: true,
			activeSigner: { signMessage: vi.fn().mockRejectedValue(new Error('User rejected request')) },
		} as ReturnType<typeof useStellarWallet>);

		render(<MultiSigAdminPanel isAdmin />);
		await user.click(screen.getByRole('button', { name: /sign action/i }));

		expect(mockToastError).toHaveBeenCalledWith('User rejected request');
		expect(screen.getByRole('button', { name: /sign action/i })).toBeEnabled();
	});
});
