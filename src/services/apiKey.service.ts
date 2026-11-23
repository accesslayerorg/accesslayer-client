import { BaseApiService, type APIResponse } from './api.service';

/** Scopes a developer API key can be granted (#1322). */
export const API_KEY_SCOPES = [
	'read:keys',
	'read:trades',
	'read:holders',
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export const API_KEY_SCOPE_LABELS: Record<ApiKeyScope, string> = {
	'read:keys': 'Read keys',
	'read:trades': 'Read trades',
	'read:holders': 'Read holders',
};

export type ApiKeyStatus = 'active' | 'revoked';

/**
 * Returns the key-placeholder to use in examples (cURL, snippets). The real
 * secret is never stored or re-fetched, so explorer UIs must use this instead.
 */
export const API_KEY_PLACEHOLDER = 'YOUR_API_KEY';

/** Key metadata returned by the API. The full secret is never part of this. */
export interface ApiKey {
	id: string;
	name: string;
	/** Public, non-secret start of the key, e.g. `ak_live_9f2c`. */
	prefix: string;
	scopes: ApiKeyScope[];
	lastUsedAt: string | null;
	status: ApiKeyStatus;
	createdAt: string;
	revokedAt?: string | null;
}

export interface CreateApiKeyInput {
	name: string;
	scopes: ApiKeyScope[];
}

/** Response of a create call: the only time the API returns the full secret. */
export interface CreatedApiKey {
	apiKey: ApiKey;
	secret: string;
}

class ApiKeyService extends BaseApiService {
	/** Keys owned by the authenticated user — GET /developer/api-keys */
	async listApiKeys(): Promise<ApiKey[]> {
		try {
			const response = await this.api.get<APIResponse<ApiKey[]>>(
				'/developer/api-keys'
			);
			return response.data.data ?? [];
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Create a scoped key — POST /developer/api-keys
	 *
	 * The returned secret is shown to the user once and is never persisted
	 * client-side.
	 */
	async createApiKey(input: CreateApiKeyInput): Promise<CreatedApiKey> {
		try {
			const response = await this.api.post<APIResponse<CreatedApiKey>>(
				'/developer/api-keys',
				input
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** Revoke a key — DELETE /developer/api-keys/:id */
	async revokeApiKey(keyId: string): Promise<void> {
		try {
			await this.api.delete(`/developer/api-keys/${keyId}`);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** Only active keys can be selected for the GraphQL explorer. */
	async listActiveApiKeys(): Promise<ApiKey[]> {
		const keys = await this.listApiKeys();
		return keys.filter((key) => key.status === 'active');
	}
}

export const apiKeyService = new ApiKeyService();
