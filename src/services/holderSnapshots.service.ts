import { BaseApiService, type APIResponse } from './api.service';

/** Time ranges offered by the holder snapshot history viewer (#1107). */
export type HolderSnapshotRange = '7d' | '30d' | 'all';

/** One point-in-time snapshot of a key's holder distribution. */
export interface HolderSnapshot {
	/** ISO timestamp of when the snapshot was taken. */
	snapshotAt: string;
	/** Total number of holders at that time. */
	holderCount: number;
	/** Share of total supply held by the single largest holder, in percent. */
	topHolderPercent: number;
	/** Share of total supply held by the top 10 holders, in percent. */
	top10SharePercent: number;
	/** Gini coefficient of the holder distribution, 0 (equal) to 1 (one holder). */
	giniCoefficient: number;
}

export interface HolderSnapshotsResponse {
	snapshots: HolderSnapshot[];
}

class HolderSnapshotsService extends BaseApiService {
	// GET /keys/:keyId/holder-snapshots?range=7d|30d|all
	async getHolderSnapshots(
		keyId: string,
		range: HolderSnapshotRange
	): Promise<HolderSnapshot[]> {
		try {
			const response = await this.api.get<
				APIResponse<HolderSnapshotsResponse>
			>(`/keys/${keyId}/holder-snapshots`, { params: { range } });

			return response.data.data?.snapshots ?? [];
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const holderSnapshotsService = new HolderSnapshotsService();
