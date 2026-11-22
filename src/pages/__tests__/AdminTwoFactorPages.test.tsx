import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import AdminTwoFactorSetupPage from '../AdminTwoFactorSetupPage';
import AdminTwoFactorChallengePage from '../AdminTwoFactorChallengePage';

const mutateVerify = vi.fn();
const mutateChallenge = vi.fn();
const mutateSetup = vi.fn();
let mockTwoFactorError: {
	message: string;
	rateLimited?: boolean;
	remainingAttempts?: number;
} | null = null;

vi.mock('@/hooks/useAdminTwoFactor', () => ({
	useAdminTwoFactor: () => ({
		setup: { data: { secret: 'MANUALKEY', otpauthUrl: 'otpauth://totp/test' }, mutate: mutateSetup, isPending: false },
		verify: { mutate: mutateVerify, isPending: false },
		challenge: { mutate: mutateChallenge, isPending: false },
		isLoading: false,
		error: mockTwoFactorError,
		login: { mutate: vi.fn(), isPending: false },
	}),
}));

vi.mock('@/utils/toast.util', () => ({
	default: { success: vi.fn(), error: vi.fn() },
}));

describe('admin 2FA pages', () => {
	it('renders QR and manual key and submits a verification code', async () => {
		const user = userEvent.setup();
		mutateVerify.mockImplementationOnce(
			(
				_input: unknown,
				options?: {
					onSuccess?: (result: {
						enabled: boolean;
						recoveryCodes: string[];
					}) => void;
				}
			) =>
				options?.onSuccess?.({
					enabled: true,
					recoveryCodes: Array.from(
						{ length: 10 },
						(_, index) => `RECOVERY-${index + 1}`
					),
				})
		);
		render(<MemoryRouter><AdminTwoFactorSetupPage /></MemoryRouter>);
		expect(screen.getByTestId('admin-2fa-qr')).toBeInTheDocument();
		expect(screen.getByDisplayValue('MANUALKEY')).toBeInTheDocument();
		await user.type(screen.getByLabelText('Authenticator code'), '123456');
		await user.click(screen.getByRole('button', { name: 'Enable two-factor authentication' }));
		expect(mutateVerify).toHaveBeenCalledWith(
			{ code: '123456' },
			expect.any(Object)
		);
		expect(screen.getByRole('heading', { name: 'Save your recovery codes' }))
			.toBeInTheDocument();
		expect(screen.getAllByRole('listitem')).toHaveLength(10);
	});

	it('submits TOTP and recovery codes through the challenge', async () => {
		const user = userEvent.setup();
		render(<MemoryRouter><AdminTwoFactorChallengePage /></MemoryRouter>);
		await user.type(screen.getByLabelText('6-digit code'), '123456');
		await user.click(screen.getByRole('button', { name: 'Verify and continue' }));
		expect(mutateChallenge).toHaveBeenCalledWith(
			{ code: '123456' },
			expect.any(Object)
		);

		await user.click(screen.getByRole('button', { name: 'Recovery code' }));
		await user.type(screen.getByLabelText('Recovery code'), 'RECOVERY123');
		await user.click(screen.getByRole('button', { name: 'Verify and continue' }));
		expect(mutateChallenge).toHaveBeenCalledWith(
			{ recoveryCode: 'RECOVERY123' },
			expect.any(Object)
		);
	});

	it('shows remaining attempts and blocks input when rate limited', () => {
		mockTwoFactorError = {
			message: 'Invalid code',
			remainingAttempts: 2,
		};
		const { rerender } = render(
			<MemoryRouter><AdminTwoFactorChallengePage /></MemoryRouter>
		);
		rerender(<MemoryRouter><AdminTwoFactorChallengePage /></MemoryRouter>);
		expect(screen.getByLabelText('6-digit code')).toBeEnabled();

		mockTwoFactorError = {
			message: 'Too many attempts',
			rateLimited: true,
		};
		rerender(<MemoryRouter><AdminTwoFactorChallengePage /></MemoryRouter>);
		expect(screen.getByText('Too many attempts. Please wait before trying again.'))
			.toBeInTheDocument();
		expect(screen.getByLabelText('6-digit code')).toBeDisabled();
		mockTwoFactorError = null;
	});
});
