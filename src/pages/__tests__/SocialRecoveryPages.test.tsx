import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Keypair } from '@stellar/stellar-sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GuardiansPage from '@/pages/GuardiansPage';
import GuardianApprovePage from '@/pages/GuardianApprovePage';
import { useSocialRecovery } from '@/hooks/useSocialRecovery';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { RECOVERY_DELAY_MS } from '@/utils/socialRecovery.utils';

vi.mock('@/hooks/useStellarWallet', () => ({
	useStellarWallet: vi.fn(),
}));

const mockUseStellarWallet = vi.mocked(useStellarWallet);
const address = () => Keypair.random().publicKey();

const OWNER = address();
const NEW_OWNER = address();
const GUARDIANS = [address(), address(), address()];
const START = new Date('2026-01-01T00:00:00Z').getTime();

function connectAs(wallet?: string) {
	mockUseStellarWallet.mockReturnValue({
		address: wallet,
		isConnected: Boolean(wallet),
		loading: false,
		activeSigner: null,
	} as ReturnType<typeof useStellarWallet>);
}

function renderPage(ui: React.ReactElement) {
	return render(<MemoryRouter>{ui}</MemoryRouter>);
}

function addGuardian(value: string) {
	fireEvent.change(screen.getByLabelText('Guardian address'), {
		target: { value },
	});
	fireEvent.click(screen.getByRole('button', { name: /add guardian/i }));
}

function seedPendingRecovery() {
	const store = useSocialRecovery.getState();
	const saved = store.saveGuardians(OWNER, GUARDIANS, 2, START);
	if (!saved.ok) throw new Error('seed failed');
	const started = store.startRecovery(OWNER, NEW_OWNER, START);
	if (!started.ok) throw new Error(started.error);
	return started.request;
}

describe('Social recovery screens (#1382)', () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(START);
		window.localStorage.clear();
		useSocialRecovery.getState().reset();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('GuardiansPage', () => {
		it('asks for a wallet when none is connected', () => {
			connectAs(undefined);
			renderPage(<GuardiansPage />);
			expect(
				screen.getByText(/connect your stellar wallet to set up guardians/i)
			).toBeInTheDocument();
		});

		it('validates addresses, duplicates and the owner address', () => {
			connectAs(OWNER);
			renderPage(<GuardiansPage />);

			addGuardian('not-a-stellar-address');
			expect(screen.getByRole('alert')).toHaveTextContent(/valid Stellar/);

			addGuardian(OWNER);
			expect(screen.getByRole('alert')).toHaveTextContent(
				/your own address/
			);

			addGuardian(GUARDIANS[0]);
			addGuardian(GUARDIANS[0].toLowerCase());
			expect(screen.getByRole('alert')).toHaveTextContent(
				/already been added/
			);
			expect(
				within(
					screen.getByRole('list', { name: 'Guardian list' })
				).getAllByRole('listitem')
			).toHaveLength(1);
		});

		it('shows the risk explanation and rejects fewer than 3 guardians', () => {
			connectAs(OWNER);
			renderPage(<GuardiansPage />);

			const save = screen.getByRole('button', { name: /save guardians/i });
			expect(screen.getByTestId('recovery-risk-notice')).toHaveTextContent(
				/move control of this account/
			);
			expect(save).toBeDisabled();

			addGuardian(GUARDIANS[0]);
			addGuardian(GUARDIANS[1]);
			fireEvent.click(screen.getByLabelText(/i understand these risks/i));
			expect(save).toBeEnabled();
			fireEvent.click(save);

			expect(screen.getByRole('alert')).toHaveTextContent(/at least 3/);
			expect(useSocialRecovery.getState().configs[OWNER]).toBeUndefined();
		});

		it('saves 3 guardians with the chosen threshold', () => {
			connectAs(OWNER);
			renderPage(<GuardiansPage />);
			GUARDIANS.forEach(addGuardian);
			fireEvent.change(screen.getByLabelText('Approvals required'), {
				target: { value: '3' },
			});
			fireEvent.click(screen.getByLabelText(/i understand these risks/i));
			fireEvent.click(
				screen.getByRole('button', { name: /save guardians/i })
			);

			expect(screen.getByText('Guardians saved.')).toBeInTheDocument();
			expect(useSocialRecovery.getState().configs[OWNER]).toMatchObject({
				guardians: GUARDIANS,
				threshold: 3,
			});
		});

		it('blocks adding more than 7 guardians', () => {
			connectAs(OWNER);
			renderPage(<GuardiansPage />);
			for (let i = 0; i < 7; i += 1) addGuardian(address());
			expect(
				screen.getByRole('button', { name: /add guardian/i })
			).toBeDisabled();
		});

		it('warns the owner about a pending recovery and lets them cancel it', () => {
			const request = seedPendingRecovery();
			useSocialRecovery.getState().approve(request.id, GUARDIANS[0]);
			connectAs(OWNER);
			renderPage(<GuardiansPage />);

			expect(
				screen.getByTestId('pending-recovery-banner')
			).toHaveTextContent(/recovery of your account is in progress/i);
			expect(screen.getByTestId('recovery-approvals')).toHaveTextContent(
				'1 of 2 required'
			);
			expect(screen.getByTestId('recovery-countdown')).toHaveTextContent(
				'2d 00h 00m'
			);
			expect(
				screen.getByRole('button', { name: /save guardians/i })
			).toBeDisabled();

			fireEvent.click(
				screen.getByRole('button', { name: /cancel recovery/i })
			);

			expect(
				screen.queryByTestId('pending-recovery-banner')
			).not.toBeInTheDocument();
			const stored = useSocialRecovery
				.getState()
				.requests.find(item => item.id === request.id);
			expect(stored?.status).toBe('cancelled');
			expect(stored?.approvals).toEqual([]);
		});

		it('offers execution to the new owner only after threshold and delay', () => {
			const request = seedPendingRecovery();
			connectAs(NEW_OWNER);
			renderPage(<GuardiansPage />);

			const execute = () =>
				screen.queryByRole('button', { name: /execute recovery/i });
			expect(execute()).not.toBeInTheDocument();

			act(() => {
				useSocialRecovery.getState().approve(request.id, GUARDIANS[0]);
				useSocialRecovery.getState().approve(request.id, GUARDIANS[1]);
			});
			expect(execute()).not.toBeInTheDocument();

			act(() => {
				vi.advanceTimersByTime(RECOVERY_DELAY_MS + 1000);
			});
			fireEvent.click(execute()!);
			expect(
				useSocialRecovery
					.getState()
					.requests.find(item => item.id === request.id)?.status
			).toBe('executed');
		});

		it('starts a recovery of a lost account to the connected wallet', () => {
			useSocialRecovery.getState().saveGuardians(OWNER, GUARDIANS, 2, START);
			connectAs(NEW_OWNER);
			renderPage(<GuardiansPage />);

			fireEvent.change(screen.getByLabelText('Account to recover'), {
				target: { value: OWNER },
			});
			fireEvent.click(
				screen.getByRole('button', { name: /start recovery/i })
			);

			expect(screen.getByTestId('recovery-status-card')).toBeInTheDocument();
			expect(useSocialRecovery.getState().requests[0]).toMatchObject({
				owner: OWNER,
				newOwner: NEW_OWNER,
				status: 'pending',
			});
		});
	});

	describe('GuardianApprovePage', () => {
		it('shows nothing to a wallet that is not a named guardian', () => {
			seedPendingRecovery();
			connectAs(address());
			renderPage(<GuardianApprovePage />);
			expect(
				screen.getByText(/no recovery requests name you/i)
			).toBeInTheDocument();
			expect(
				screen.queryByRole('button', { name: /approve recovery/i })
			).not.toBeInTheDocument();
		});

		it('lets a named guardian approve once', () => {
			const request = seedPendingRecovery();
			connectAs(GUARDIANS[1]);
			renderPage(<GuardianApprovePage />);

			expect(screen.getAllByTestId('recovery-status-card')).toHaveLength(1);
			fireEvent.click(
				screen.getByRole('button', { name: /approve recovery/i })
			);

			expect(
				screen.getByText(/you approved this recovery/i)
			).toBeInTheDocument();
			expect(screen.getByTestId('recovery-approvals')).toHaveTextContent(
				'1 of 2 required'
			);
			expect(
				useSocialRecovery
					.getState()
					.requests.find(item => item.id === request.id)?.approvals
			).toEqual([GUARDIANS[1]]);
		});

		it('hides a request once the owner cancels it', () => {
			const request = seedPendingRecovery();
			connectAs(GUARDIANS[0]);
			renderPage(<GuardianApprovePage />);
			expect(screen.getByTestId('recovery-status-card')).toBeInTheDocument();

			act(() => {
				useSocialRecovery.getState().cancel(request.id, OWNER);
			});
			expect(
				screen.queryByTestId('recovery-status-card')
			).not.toBeInTheDocument();
		});
	});
});
