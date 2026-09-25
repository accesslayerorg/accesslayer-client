import { BaseApiService, type APIResponse } from './api.service';
import type {
	HolderListResponse,
	HolderQueryParams,
} from '@/types/holder.types';

export class HolderService extends BaseApiService {
	/**
	 * Fetch paginated list of key holders for a creator
	 */
	async getHolders({
		creatorId,
		limit = 50,
		cursor,
	}: HolderQueryParams): Promise<HolderListResponse> {
		try {
			const params = new URLSearchParams({
				limit: limit.toString(),
			});

			if (cursor) {
				params.append('cursor', cursor);
			}

			const response = await this.api.get<APIResponse<HolderListResponse>>(
				`/creators/${creatorId}/holders?${params.toString()}`
			);

			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const holderService = new HolderService();
