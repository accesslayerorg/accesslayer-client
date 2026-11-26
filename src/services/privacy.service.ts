import { BaseApiService, type APIResponse } from './api.service';

export type DataExportStatus = 'pending' | 'ready' | 'expired' | 'failed';

export interface DataExport {
	id: string;
	status: DataExportStatus;
	/** ISO timestamp when the export was requested. */
	requestedAt: string;
	/** ISO timestamp when the download link expires, present when status is "ready". */
	expiresAt: string | null;
	/** Signed download URL, present when status is "ready". */
	downloadUrl: string | null;
}

export type DeletionStatus = 'none' | 'pending' | 'cancelled';

export interface AccountDeletionState {
	status: DeletionStatus;
	/** ISO timestamp when the grace period ends, present when status is "pending". */
	gracePeriodEndsAt: string | null;
	/** Reasons blocking deletion, e.g. "active positions". */
	blockingReasons: string[];
}

class PrivacyService extends BaseApiService {
	/** Request a new data export — POST /privacy/export */
	async requestDataExport(): Promise<DataExport> {
		try {
			const response = await this.api.post<APIResponse<DataExport>>(
				'/privacy/export'
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** Poll the current export status — GET /privacy/export/status */
	async getExportStatus(): Promise<DataExport | null> {
		try {
			const response = await this.api.get<APIResponse<DataExport | null>>(
				'/privacy/export/status'
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** Fetch deletion state including blocking reasons — GET /privacy/deletion */
	async getDeletionState(): Promise<AccountDeletionState> {
		try {
			const response =
				await this.api.get<APIResponse<AccountDeletionState>>(
					'/privacy/deletion'
				);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** Submit an account deletion request — POST /privacy/deletion */
	async requestDeletion(): Promise<AccountDeletionState> {
		try {
			const response = await this.api.post<APIResponse<AccountDeletionState>>(
				'/privacy/deletion'
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** Cancel a pending deletion during the grace period — DELETE /privacy/deletion */
	async cancelDeletion(): Promise<AccountDeletionState> {
		try {
			const response =
				await this.api.delete<APIResponse<AccountDeletionState>>(
					'/privacy/deletion'
				);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const privacyService = new PrivacyService();
