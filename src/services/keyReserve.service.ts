import { BaseApiService, type APIResponse } from './api.service';
import type { KeyReserve } from '@/utils/keyReserve.utils';

class KeyReserveService extends BaseApiService {
	/**
	 * Protocol reserve balance backing a creator key (#1208).
	 * GET /keys/:key_id/reserve
	 */
	async getKeyReserve(keyId: string): Promise<KeyReserve> {
		try {
			const response = await this.api.get<APIResponse<KeyReserve>>(
				`/keys/${keyId}/reserve`
			);

			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const keyReserveService = new KeyReserveService();
