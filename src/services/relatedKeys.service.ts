import { BaseApiService, type APIResponse } from './api.service';

/** A key recommended because it shares holders with the source key (#1318). */
export interface RelatedKey {
	id: string;
	/** Social handle, with or without a leading `@`. */
	handle?: string | null;
	/** Display name, used for the avatar fallback and accessible labels. */
	name?: string | null;
	avatarUrl?: string | null;
	/** Current key price in stroops. */
	priceStroops?: number | null;
	/** 24h price change as a percentage (12.5 means +12.5%). */
	change24h?: number | null;
	/** Share of the source key's holders that also hold this key (0-100). */
	holderOverlapPct?: number | null;
}

class RelatedKeysService extends BaseApiService {
	/**
	 * Keys related to `keyId` by shared holders (#1318).
	 * GET /keys/:keyId/related?limit=
	 */
	async getRelatedKeys(keyId: string, limit: number): Promise<RelatedKey[]> {
		try {
			const response = await this.api.get<APIResponse<RelatedKey[]>>(
				`/keys/${encodeURIComponent(keyId)}/related`,
				{ params: { limit } }
			);
			const data = response.data.data;
			return Array.isArray(data) ? data : [];
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const relatedKeysService = new RelatedKeysService();
