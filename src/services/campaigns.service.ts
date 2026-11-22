import { BaseApiService, type APIResponse } from './api.service';
import type { Campaign } from '@/utils/campaign.utils';

type CampaignsPayload = Campaign[] | { campaigns?: Campaign[] };

class CampaignsService extends BaseApiService {
	/**
	 * Active seasonal campaigns, with the wallet's progress when supplied (#1226).
	 * GET /campaigns/active?wallet=
	 */
	async getActiveCampaigns(wallet?: string): Promise<Campaign[]> {
		try {
			const response = await this.api.get<APIResponse<CampaignsPayload>>(
				'/campaigns/active',
				{ params: wallet ? { wallet } : undefined }
			);

			const payload = response.data.data;
			if (Array.isArray(payload)) return payload;
			if (Array.isArray(payload?.campaigns)) return payload.campaigns;
			return [];
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Every campaign — upcoming, active and ended — with the wallet's progress
	 * and claim status when supplied (#1204).
	 * GET /campaigns?wallet=
	 */
	async getCampaigns(wallet?: string): Promise<Campaign[]> {
		try {
			const response = await this.api.get<APIResponse<CampaignsPayload>>(
				'/campaigns',
				{ params: wallet ? { wallet } : undefined }
			);

			const payload = response.data.data;
			if (Array.isArray(payload)) return payload;
			if (Array.isArray(payload?.campaigns)) return payload.campaigns;
			return [];
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const campaignsService = new CampaignsService();
