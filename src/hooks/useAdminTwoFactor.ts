import { useMutation } from '@tanstack/react-query';
import { ApiError } from '@/services/api.service';
import { adminTwoFactorService } from '@/services/adminTwoFactor.service';
import type {
	AdminLoginInput,
	TwoFactorChallengeInput,
	TwoFactorVerifyInput,
} from '@/services/adminTwoFactor.types';
import { setAdminSession } from '@/utils/adminSession';

export interface AdminTwoFactorError {
	message: string;
	status?: number;
	code?: string;
	remainingAttempts?: number;
	rateLimited?: boolean;
	retryAfterSeconds?: number;
}

function mapError(error: unknown): AdminTwoFactorError {
	if (error instanceof ApiError) {
		const details = error.response;
		const remaining = details?.errors?.find(item => item.field === 'remainingAttempts');
		const retryAfter = details?.errors?.find(item => item.field === 'retryAfterSeconds');
		return {
			message: error.message,
			status: error.status,
			code: details?.code,
			remainingAttempts: remaining ? Number(remaining.message) : undefined,
			rateLimited: error.status === 429 || details?.code === 'RATE_LIMITED',
			retryAfterSeconds: retryAfter ? Number(retryAfter.message) : undefined,
		};
	}
	return { message: error instanceof Error ? error.message : 'Something went wrong' };
}

export function useAdminTwoFactor() {
	const setup = useMutation({
		mutationFn: () => adminTwoFactorService.setup(),
	});
	const verify = useMutation({
		mutationFn: (input: TwoFactorVerifyInput) => adminTwoFactorService.verify(input),
	});
	const login = useMutation({
		mutationFn: (input: AdminLoginInput) => adminTwoFactorService.login(input),
		onSuccess: result => setAdminSession({ status: result.status }),
	});
	const challenge = useMutation({
		mutationFn: (input: TwoFactorChallengeInput) =>
			adminTwoFactorService.challenge(input),
		onSuccess: result => {
			if (result.enabled && result.status !== 'pending_2fa') {
				setAdminSession({ status: 'active' });
			} else if (result.status) {
				setAdminSession({ status: result.status });
			} else {
				setAdminSession({ status: 'active' });
			}
		},
	});

	const mutations = [setup, verify, login, challenge];
	return {
		setup,
		verify,
		login,
		challenge,
		isLoading: mutations.some(mutation => mutation.isPending),
		error: mutations
			.map(mutation => mutation.error)
			.find(Boolean)
			? mapError(mutations.map(mutation => mutation.error).find(Boolean))
			: null,
	};
}
