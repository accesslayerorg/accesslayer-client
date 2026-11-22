/**
 * Assumed admin 2FA API contract. Reconcile with the backend before release.
 */
export type AdminSessionStatus = 'pending_2fa' | 'active';

export interface TwoFactorSetup {
	secret: string;
	otpauthUrl: string;
	issuer?: string;
	accountName?: string;
}

export interface TwoFactorVerifyInput {
	code: string;
}

export interface TwoFactorVerifyResult {
	enabled: boolean;
	recoveryCodes: string[];
	status?: AdminSessionStatus;
	token?: string;
}

export interface AdminLoginInput {
	email: string;
	password: string;
}

export interface AdminLoginResult {
	status: AdminSessionStatus;
	twoFactorRequired?: boolean;
	token?: string;
}

export interface TwoFactorChallengeInput {
	code?: string;
	recoveryCode?: string;
}
