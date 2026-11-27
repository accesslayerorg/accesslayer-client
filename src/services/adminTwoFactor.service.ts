import { BaseApiService, type APIResponse } from './api.service';
import type {
	AdminLoginInput,
	AdminLoginResult,
	TwoFactorChallengeInput,
	TwoFactorSetup,
	TwoFactorVerifyInput,
	TwoFactorVerifyResult,
} from './adminTwoFactor.types';

class AdminTwoFactorService extends BaseApiService {
	async setup(): Promise<TwoFactorSetup> {
		try {
			const response = await this.api.post<APIResponse<TwoFactorSetup>>(
				'/admin/2fa/setup'
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async verify(input: TwoFactorVerifyInput): Promise<TwoFactorVerifyResult> {
		try {
			const response = await this.api.post<APIResponse<TwoFactorVerifyResult>>(
				'/admin/2fa/verify',
				input
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async login(input: AdminLoginInput): Promise<AdminLoginResult> {
		try {
			const response = await this.api.post<APIResponse<AdminLoginResult>>(
				'/auth/admin/login',
				input
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async challenge(input: TwoFactorChallengeInput): Promise<TwoFactorVerifyResult> {
		try {
			const response = await this.api.post<APIResponse<TwoFactorVerifyResult>>(
				'/admin/2fa/login',
				input
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const adminTwoFactorService = new AdminTwoFactorService();
