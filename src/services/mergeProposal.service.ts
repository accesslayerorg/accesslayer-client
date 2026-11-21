// src/services/mergeProposal.service.ts
import { BaseApiService, type APIResponse } from './api.service';
import type {
	MergeProposal,
	MergeVoteCastResult,
	MergeVoteDirection,
} from '@/types/mergeProposal';

class MergeProposalService extends BaseApiService {
	/**
	 * Fetch the active (or most recently closed) merge proposal for a
	 * source key, if one exists.
	 * GET /keys/:sourceKeyId/merge-proposal
	 */
	async getMergeProposal(sourceKeyId: string): Promise<MergeProposal | null> {
		try {
			const response = await this.api.get<APIResponse<MergeProposal | null>>(
				`/keys/${sourceKeyId}/merge-proposal`
			);
			return response.data.data ?? null;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Cast (or change) a vote on a merge proposal as the connected wallet.
	 * POST /keys/merge-proposals/:proposalId/votes
	 */
	async castVote(
		proposalId: string,
		direction: MergeVoteDirection
	): Promise<MergeVoteCastResult> {
		try {
			const response = await this.api.post<APIResponse<MergeVoteCastResult>>(
				`/keys/merge-proposals/${proposalId}/votes`,
				{ direction }
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const mergeProposalService = new MergeProposalService();
