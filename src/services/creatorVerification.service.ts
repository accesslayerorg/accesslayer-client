import { BaseApiService, type APIResponse } from './api.service';

export const VERIFICATION_STATUSES = [
	'submitted',
	'in_review',
	'approved',
	'rejected',
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export interface VerificationApplicationDraft {
	legalName: string;
	socialUrls: string[];
	proofCode: string;
}

export interface VerificationApplication extends VerificationApplicationDraft {
	id: string;
	status: VerificationStatus;
	reviewerNote?: string | null;
	proofVerified: boolean;
	submittedAt: string;
	updatedAt: string;
}

export interface ProofCheckResult {
	verified: boolean;
	checkedAt: string;
}

class CreatorVerificationService extends BaseApiService {
	async getMyApplication(): Promise<VerificationApplication | null> {
		try {
			const response = await this.api.get<
				APIResponse<VerificationApplication | null>
			>('/creator/verification/application');
			return response.data.data ?? null;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async submitApplication(
		draft: VerificationApplicationDraft
	): Promise<VerificationApplication> {
		try {
			const response = await this.api.post<APIResponse<VerificationApplication>>(
				'/creator/verification/application',
				draft
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async resubmitApplication(
		id: string,
		draft: VerificationApplicationDraft
	): Promise<VerificationApplication> {
		try {
			const response = await this.api.patch<APIResponse<VerificationApplication>>(
				`/creator/verification/application/${id}`,
				draft
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async checkProofCode(proofCode: string): Promise<ProofCheckResult> {
		try {
			const response = await this.api.post<APIResponse<ProofCheckResult>>(
				'/creator/verification/proof-check',
				{ proofCode }
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const creatorVerificationService = new CreatorVerificationService();
