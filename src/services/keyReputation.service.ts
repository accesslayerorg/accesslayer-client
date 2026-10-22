import { BaseApiService, type APIResponse } from './api.service';

/** Composite key reputation score and per-metric breakdown (#1143). */
export interface KeyReputation {
	/** Composite score out of 1000. */
	score: number;
	/** Trade volume component, out of 1000. */
	tradeVolumeScore: number;
	/** Holder retention component, out of 1000. */
	holderRetentionScore: number;
	/** Price stability component, out of 1000. */
	priceStabilityScore: number;
	/** Community/creator rating component, out of 1000. */
	ratingScore: number;
	/** ISO timestamp the score was last computed. */
	updatedAt?: string;
}

class KeyReputationService extends BaseApiService {
	/**
	 * Fetches the composite reputation score and breakdown for a key from
	 * `GET /keys/:key_id/reputation` (#1143).
	 */
	async getKeyReputation(keyId: string): Promise<KeyReputation> {
		try {
			const response = await this.api.get<APIResponse<KeyReputation>>(
				`/keys/${keyId}/reputation`
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const keyReputationService = new KeyReputationService();
