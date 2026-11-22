import { BaseApiService, type APIResponse } from './api.service';

/** Date ranges offered by the key analytics chart (#1142). */
export type SnapshotHistoryRange = '7d' | '30d' | '90d' | 'all';

/** Metrics the chart can plot, one per tab. */
export type SnapshotMetric = 'price' | 'volume' | 'holders' | 'marketCap';

/** One daily on-chain snapshot for a key. */
export interface KeySnapshot {
	/** ISO date (or timestamp) the snapshot was taken. */
	snapshotDate: string;
	/** Key price in stroops at snapshot time. */
	priceStroops: number;
	/** Trading volume in stroops over the snapshot's day. */
	volumeStroops: number;
	/** Total distinct holders at snapshot time. */
	holderCount: number;
	/** Market cap in stroops (price * circulating supply) at snapshot time. */
	marketCapStroops: number;
}

interface KeySnapshotsEnvelope {
	snapshots: KeySnapshot[];
}

class KeySnapshotHistoryService extends BaseApiService {
	/**
	 * Fetches daily on-chain snapshots for a key from
	 * `GET /keys/:key_id/snapshots?range=X` (#1142).
	 */
	async getSnapshotHistory(
		keyId: string,
		range: SnapshotHistoryRange
	): Promise<KeySnapshot[]> {
		try {
			const response = await this.api.get<
				APIResponse<KeySnapshotsEnvelope | KeySnapshot[]>
			>(`/keys/${keyId}/snapshots`, { params: { range } });

			const payload = response.data.data;
			if (Array.isArray(payload)) return payload;
			return payload?.snapshots ?? [];
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const keySnapshotHistoryService = new KeySnapshotHistoryService();
