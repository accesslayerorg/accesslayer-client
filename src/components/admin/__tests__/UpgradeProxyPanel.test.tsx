import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UpgradeProxyPanel from '@/components/admin/UpgradeProxyPanel';
import { useUpgradeProxy } from '@/hooks/useUpgradeProxy';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import showToast from '@/utils/toast.util';
import type { PendingUpgrade, UpgradeProxyStatus } from '@/services/admin.service';

vi.mock('@/hooks/useUpgradeProxy', () => ({
	useUpgradeProxy: vi.fn(),
}));
vi.mock('@/hooks/useStellarWallet', () => ({
	useStellarWallet: vi.fn(),
}));
vi.mock('@/utils/toast.util', () => ({
	default: { error: vi.fn(), success: vi.fn() },
}));

const mockUseUpgradeProxy = vi.mocked(useUpgradeProxy);
const mockUseStellarWallet = vi.mocked(useStellarWallet);
const mockToastError = vi.mocked(showToast.error);

const ADMIN_ADDRESS = 'GBABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJ';
const NEW_LOGIC = 'GNEWLOGICADDRESS123456789012345678901234567890';

const PENDING_UPGRADE: PendingUpgrade = {
	id: 'upgrade-1',
	newImplementation: NEW_LOGIC,
	timelockEndsAt: Date.now() - 60_000,
	signatures: [],
	requiredSignatures: 2,
	totalSigners: 3,
	payload: 'upgrade:123:newlogic',
	createdAt: '2026-09-01T12:00:00.000Z',
};

const FUTURE_UPGRADE: PendingUpgrade = {
	...PENDING_UPGRADE,
	timelockEndsAt: Date.now() + 3_600_000,
};

function setupHooks({
	isAdmin = true,
	isConnected = true,
	address = ADMIN_ADDRESS,
	statusData = { logicAddress: 'GCURRENTLOGIC123456789012345678901234567890', isFrozen: false },
	pendingUpgradeData = null,
	historyData = [],
	signMessageFn,
}: {
	isAdmin?: boolean;
	isConnected?: boolean;
	address?: string;
	statusData?: UpgradeProxyStatus | null;
	pendingUpgradeData?: PendingUpgrade | null;
	historyData?: Array<{
		id: string;
		previousImplementation: string;
		newImplementation: string;
		executedAt: string;
		admin: string;
	}>;
	signMessageFn?: ReturnType<typeof vi.fn>;
} = {}) {
	const executeUpgrade = { isPending: false, mutate: vi.fn() };
	const toggleFreeze = { isPending: false, mutate: vi.fn() };

	mockUseStellarWallet.mockReturnValue({
		address: isConnected ? address : undefined,
		isConnected,
		activeSigner: signMessageFn
			? { signMessage: signMessageFn }
			: { signMessage: vi.fn().mockResolvedValue('0xsignature') },
		loading: false,
	} as ReturnType<typeof useStellarWallet>);

	mockUseUpgradeProxy.mockReturnValue({
		status: {
			data: statusData,
			isLoading: false,
			isError: false,
		},
		pendingUpgrade: {
			data: pendingUpgradeData,
			isLoading: false,
			isError: false,
		},
		history: {
			data: historyData,
			isLoading: false,
			isError: false,
			refetch: vi.fn(),
		},
		executeUpgrade,
		toggleFreeze,
		enabled: isAdmin && isConnected,
	} as ReturnType<typeof useUpgradeProxy>);

	return { executeUpgrade, toggleFreeze };
}

describe('UpgradeProxyPanel (#1032)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders for an admin wallet', () => {
		setupHooks();

		render(<UpgradeProxyPanel isAdmin />);

		expect(screen.getByTestId('upgrade-proxy-panel')).toBeInTheDocument();
	});

	it('does not render for a non-admin wallet', () => {
		setupHooks({ isAdmin: false });

		render(<UpgradeProxyPanel isAdmin={false} />);

		expect(screen.queryByTestId('upgrade-proxy-panel')).not.toBeInTheDocument();
	});

	it('shows the current logic address and active status', () => {
		setupHooks();

		render(<UpgradeProxyPanel isAdmin />);

		expect(screen.getByTestId('upgrade-proxy-status')).toBeInTheDocument();
		expect(screen.getByText('Active')).toBeInTheDocument();
		expect(mockUseStellarWallet).toHaveBeenCalled();
	});

	it('shows "Not configured" when no logic address is set', () => {
		setupHooks({ statusData: { logicAddress: null, isFrozen: false } });

		render(<UpgradeProxyPanel isAdmin />);

		expect(screen.getByText('Not configured')).toBeInTheDocument();
	});

	it('shows the emergency freeze toggle when not frozen', () => {
		setupHooks({ statusData: { logicAddress: null, isFrozen: false } });

		render(<UpgradeProxyPanel isAdmin />);

		expect(screen.getByTestId('upgrade-proxy-freeze-toggle')).toHaveTextContent(
			'Freeze'
		);
	});

	it('shows the unfreeze toggle when frozen', () => {
		setupHooks({ statusData: { logicAddress: null, isFrozen: true } });

		render(<UpgradeProxyPanel isAdmin />);

		expect(screen.getByTestId('upgrade-proxy-freeze-toggle')).toHaveTextContent(
			'Unfreeze'
		);
	});

	it('shows a countdown when a pending upgrade has a future timelock', () => {
		setupHooks({ pendingUpgradeData: FUTURE_UPGRADE });

		render(<UpgradeProxyPanel isAdmin />);

		expect(
			screen.getByTestId('upgrade-proxy-timelock')
		).toHaveTextContent(/^[0-9]{2}:[0-9]{2}:[0-9]{2}$/);
		expect(
			screen.getByTestId('upgrade-proxy-execute')
		).toBeDisabled();
	});

	it('enables the execute button when the timelock has elapsed and signatures are met', () => {
		const upgradeWithSigs: PendingUpgrade = {
			...PENDING_UPGRADE,
			signatures: [
				{
					signer: ADMIN_ADDRESS,
					signature: '0xsig1',
					signedAt: '2026-09-01T12:01:00.000Z',
				},
				{
					signer: 'GSECONDSIGNER12345678901234567890123456789',
					signature: '0xsig2',
					signedAt: '2026-09-01T12:02:00.000Z',
				},
			],
		};
		setupHooks({ pendingUpgradeData: upgradeWithSigs });

		render(<UpgradeProxyPanel isAdmin />);

		expect(
			screen.getByTestId('upgrade-proxy-execute')
		).toBeEnabled();
	});

	it('keeps the execute button disabled when signatures are below threshold', () => {
		const upgradeOneSig: PendingUpgrade = {
			...PENDING_UPGRADE,
			signatures: [
				{
					signer: ADMIN_ADDRESS,
					signature: '0xsig1',
					signedAt: '2026-09-01T12:01:00.000Z',
				},
			],
		};
		setupHooks({ pendingUpgradeData: upgradeOneSig });

		render(<UpgradeProxyPanel isAdmin />);

		expect(
			screen.getByTestId('upgrade-proxy-execute')
		).toBeDisabled();
	});

	it('shows "No pending upgrade proposals" when no pending upgrade exists', () => {
		setupHooks({ pendingUpgradeData: null });

		render(<UpgradeProxyPanel isAdmin />);

		expect(
			screen.getByText(/No pending upgrade proposals/i)
		).toBeInTheDocument();
	});

	it('executes an upgrade by signing with the wallet and submitting the mutation', async () => {
		const user = userEvent.setup();
		const upgradeWithSigs: PendingUpgrade = {
			...PENDING_UPGRADE,
			signatures: [
				{
					signer: ADMIN_ADDRESS,
					signature: '0xsig1',
					signedAt: '2026-09-01T12:01:00.000Z',
				},
				{
					signer: 'GSECONDSIGNER12345678901234567890123456789',
					signature: '0xsig2',
					signedAt: '2026-09-01T12:02:00.000Z',
				},
			],
		};
		const { executeUpgrade } = setupHooks({
			pendingUpgradeData: upgradeWithSigs,
		});

		render(<UpgradeProxyPanel isAdmin />);

		await user.click(screen.getByTestId('upgrade-proxy-execute'));

		await waitFor(() => {
			expect(executeUpgrade.mutate).toHaveBeenCalledWith(
				{ signature: '0xsignature', signer: ADMIN_ADDRESS },
				expect.objectContaining({ onSettled: expect.any(Function) })
			);
		});
	});

	it('surfaces a toast when the wallet rejects the upgrade signature', async () => {
		const user = userEvent.setup();
		const upgradeWithSigs: PendingUpgrade = {
			...PENDING_UPGRADE,
			signatures: [
				{
					signer: ADMIN_ADDRESS,
					signature: '0xsig1',
					signedAt: '2026-09-01T12:01:00.000Z',
				},
				{
					signer: 'GSECONDSIGNER12345678901234567890123456789',
					signature: '0xsig2',
					signedAt: '2026-09-01T12:02:00.000Z',
				},
			],
		};
		setupHooks({
			pendingUpgradeData: upgradeWithSigs,
			signMessageFn: vi
				.fn()
				.mockRejectedValue(new Error('User rejected request')),
		});

		render(<UpgradeProxyPanel isAdmin />);

		await user.click(screen.getByTestId('upgrade-proxy-execute'));

		expect(mockToastError).toHaveBeenCalledWith(
			'User rejected request'
		);
		expect(
			screen.getByTestId('upgrade-proxy-execute')
		).toBeEnabled();
	});

	it('renders the history list with executed upgrades', () => {
		setupHooks({
			historyData: [
				{
					id: 'hist-1',
					previousImplementation: 'GOLDPREV12345678901234567890123456789',
					newImplementation: NEW_LOGIC,
					executedAt: '2026-09-01T12:05:00.000Z',
					admin: ADMIN_ADDRESS,
				},
			],
		});

		render(<UpgradeProxyPanel isAdmin />);

		expect(
			screen.getByTestId('upgrade-proxy-history-list')
		).toBeInTheDocument();
		expect(screen.getByText('Implementation upgraded')).toBeInTheDocument();
	});

	it('shows an empty state when no upgrade history exists', () => {
		setupHooks({ historyData: [] });

		render(<UpgradeProxyPanel isAdmin />);

		expect(
			screen.getByText(/No upgrade history recorded yet/i)
		).toBeInTheDocument();
	});
});
