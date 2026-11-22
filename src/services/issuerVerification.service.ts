import { BaseApiService, type APIResponse } from './api.service';

export type IssuerVerificationTier = 'basic' | 'enhanced' | 'institutional';

/** Issuer verification returned by GET /issuers/:wallet/verification. */
export interface IssuerVerification {
	tier: IssuerVerificationTier;
	/** ISO expiry date for the verification tier, when the API reports it. */
	expiresAt: string | null;
	verified: boolean;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
	return typeof value === 'object' && value !== null
		? (value as UnknownRecord)
		: {};
}

const TIER_ALIASES: Record<string, IssuerVerificationTier> = {
	basic: 'basic',
	tier1: 'basic',
	'1': 'basic',
	enhanced: 'enhanced',
	tier2: 'enhanced',
	'2': 'enhanced',
	institutional: 'institutional',
	tier3: 'institutional',
	'3': 'institutional',
};

function normalizeTier(value: unknown): IssuerVerificationTier | null {
	const key = String(value ?? '').trim().toLowerCase();
	return TIER_ALIASES[key] ?? null;
}

function normalizeExpiry(value: unknown): string | null {
	if (typeof value === 'string' && value.trim() !== '') return value;
	if (typeof value === 'number' && Number.isFinite(value)) {
		return new Date(value < 1_000_000_000_000 ? value * 1_000 : value).toISOString();
	}
	return null;
}

export function normalizeIssuerVerification(value: unknown): IssuerVerification {
	const raw = asRecord(value);
	const tier =
		normalizeTier(raw.tier ?? raw.verificationTier ?? raw.level) ?? 'basic';
	const verifiedFlag = raw.verified ?? raw.isVerified;
	const verified =
		typeof verifiedFlag === 'boolean' ? verifiedFlag : tier !== null;

	return {
		tier,
		expiresAt: normalizeExpiry(raw.expiresAt ?? raw.expires_at ?? raw.expiry),
		verified,
	};
}

class IssuerVerificationService extends BaseApiService {
	async getIssuerVerification(wallet: string): Promise<IssuerVerification> {
		try {
			const response = await this.api.get<APIResponse<unknown>>(
				`/issuers/${encodeURIComponent(wallet)}/verification`
			);
			return normalizeIssuerVerification(response.data.data);
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const issuerVerificationService = new IssuerVerificationService();

export function fetchIssuerVerification(
	wallet: string
): Promise<IssuerVerification> {
	return issuerVerificationService.getIssuerVerification(wallet);
}
