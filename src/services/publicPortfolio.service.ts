import { BaseApiService, type APIResponse } from './api.service';
import type { PublicPortfolio } from '@/utils/publicPortfolio.utils';

/** Public, unauthenticated portfolio for `/u/:handle` (#1398). */
class PublicPortfolioService extends BaseApiService {
	/** Returns null when the handle does not exist or its page is turned off (404). */
	async getPublicPortfolio(handle: string): Promise<PublicPortfolio | null> {
		try {
			const response = await this.api.get<APIResponse<PublicPortfolio>>(
				`/u/${encodeURIComponent(handle.toLowerCase())}/portfolio`
			);
			return response.data.data;
		} catch (error) {
			const apiError = this.handleError(error);
			if (apiError.status === 404) return null;
			throw apiError;
		}
	}
}

export const publicPortfolioService = new PublicPortfolioService();

export async function fetchPublicPortfolio(handle: string): Promise<PublicPortfolio | null> {
	return publicPortfolioService.getPublicPortfolio(handle);
}
