import { BaseApiService, type APIResponse } from './api.service';

export type KeyReportReason = 'scam' | 'impersonation' | 'harassment' | 'other';

export interface KeyReportPayload {
	reason: KeyReportReason;
	details: string;
	reporterAddress: string;
}

class ModerationService extends BaseApiService {
	async reportKey(keyId: string, payload: KeyReportPayload): Promise<void> {
		try {
			await this.api.post<APIResponse>(
				`/keys/${encodeURIComponent(keyId)}/reports`,
				payload
			);
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

const moderationService = new ModerationService();

export const reportKey = (keyId: string, payload: KeyReportPayload) =>
	moderationService.reportKey(keyId, payload);
