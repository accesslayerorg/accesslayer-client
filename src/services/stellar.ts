import { Federation, StrKey } from '@stellar/stellar-sdk';

export const FederationServer = Federation.Server;

export type FederationErrorCode =
	'NOT_FOUND' | 'INVALID_DOMAIN' | 'NETWORK_ERROR';

export class FederationError extends Error {
	code: FederationErrorCode;

	constructor(code: FederationErrorCode, message: string) {
		super(message);
		this.name = 'FederationError';
		this.code = code;
	}
}

const federationCache = new Map<string, string>();

export function clearFederationCache(): void {
	federationCache.clear();
}

export function getCachedFederationAddress(
	address: string
): string | undefined {
	return federationCache.get(address.trim().toLowerCase());
}

function isValidDomain(domain: string): boolean {
	if (!domain || domain.length > 255) return false;
	return /^(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)*[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?::\d+)?$/.test(
		domain
	);
}

/**
 * Resolves a Stellar federation address (e.g. alice*example.com) to a public key (G...).
 * Raw public keys bypass network lookup and return the key directly if valid.
 */
export async function resolveFederationAddress(
	address: string
): Promise<string> {
	const trimmed = address.trim();
	if (!trimmed) {
		throw new FederationError('INVALID_DOMAIN', 'Address cannot be empty');
	}

	const cacheKey = trimmed.toLowerCase();
	const cached = federationCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	// Raw public key check: bypass resolution
	if (!trimmed.includes('*')) {
		if (StrKey.isValidEd25519PublicKey(trimmed)) {
			return trimmed;
		}
		throw new FederationError('INVALID_DOMAIN', 'Invalid Stellar address');
	}

	const parts = trimmed.split('*');
	if (parts.length !== 2 || !parts[0] || !parts[1]) {
		throw new FederationError('INVALID_DOMAIN', 'Invalid federation domain');
	}

	const [, domain] = parts;
	if (!isValidDomain(domain)) {
		throw new FederationError('INVALID_DOMAIN', 'Invalid federation domain');
	}

	try {
		const record = await FederationServer.resolve(trimmed);
		if (!record || !record.account_id) {
			throw new FederationError('NOT_FOUND', 'Federation address not found');
		}

		federationCache.set(cacheKey, record.account_id);
		return record.account_id;
	} catch (error: unknown) {
		if (error instanceof FederationError) {
			throw error;
		}

		const err = error as {
			message?: string;
			response?: { status?: number };
			status?: number;
		};
		const status = err.response?.status ?? err.status;
		const msg = err.message || '';

		if (
			/rfc 1035/i.test(msg) ||
			/invalid domain/i.test(msg) ||
			/invalid stellar address/i.test(msg)
		) {
			throw new FederationError(
				'INVALID_DOMAIN',
				'Invalid federation domain'
			);
		}

		if (
			status === 404 ||
			/404/i.test(msg) ||
			/not found/i.test(msg) ||
			/does not contain federation_server/i.test(msg)
		) {
			throw new FederationError('NOT_FOUND', 'Federation address not found');
		}

		throw new FederationError(
			'NETWORK_ERROR',
			'Network error resolving address'
		);
	}
}
