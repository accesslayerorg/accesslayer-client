// src/services/governance.service.ts
import { BaseApiService, type APIResponse } from './api.service';
import { cacheManager } from '@/utils/cache.utils';
import type { Proposal, ProposalVotesPage } from '@/types/governance';

/** How long fetched proposal data stays fresh (15 seconds — proposals change faster than profiles). */
const PROPOSAL_CACHE_TTL = 15_000;
export const PROPOSAL_VOTES_PAGE_SIZE = 20;

class GovernanceService extends BaseApiService {
	/**
	 * Fetch all proposals, optionally filtered by creator.
	 * GET /governance/proposals?creatorId=:id
	 */
	async getProposals(creatorId?: string): Promise<Proposal[]> {
		const cacheKey = `proposals_${creatorId ?? 'all'}`;
		const cached = cacheManager.get<Proposal[]>(cacheKey);
		if (cached) return cached;

		try {
			const params: Record<string, string> = {};
			if (creatorId) params.creatorId = creatorId;

			const response = await this.api.get<APIResponse<Proposal[]>>(
				'/governance/proposals',
				{ params }
			);

			const data = response.data.data;
			cacheManager.set(cacheKey, data, PROPOSAL_CACHE_TTL);
			return data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Fetch a single proposal by ID.
	 * GET /governance/proposals/:id
	 */
	async getProposal(proposalId: string): Promise<Proposal> {
		const cacheKey = `proposal_${proposalId}`;
		const cached = cacheManager.get<Proposal>(cacheKey);
		if (cached) return cached;

		try {
			const response = await this.api.get<APIResponse<Proposal>>(
				`/governance/proposals/${proposalId}`
			);

			const data = response.data.data;
			cacheManager.set(cacheKey, data, PROPOSAL_CACHE_TTL);
			return data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async getProposalVotes(
		proposalId: string,
		cursor?: string | null,
		limit = PROPOSAL_VOTES_PAGE_SIZE
	): Promise<ProposalVotesPage> {
		const cacheKey = `proposal_votes_${proposalId}_${cursor ?? 'first'}_${limit}`;
		const cached = cacheManager.get<ProposalVotesPage>(cacheKey);
		if (cached) return cached;

		try {
			const response = await this.api.get<APIResponse<ProposalVotesPage>>(
				`/governance/proposals/${proposalId}/votes`,
				{
					params: {
						...(cursor ? { cursor } : {}),
						limit,
					},
				}
			);

			const data = response.data.data;
			cacheManager.set(cacheKey, data, PROPOSAL_CACHE_TTL);
			return data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const governanceService = new GovernanceService();

export function fetchProposalVotesPage(
	proposalId: string,
	cursor: string | null | undefined
): Promise<ProposalVotesPage> {
	return governanceService.getProposalVotes(proposalId, cursor);
}
