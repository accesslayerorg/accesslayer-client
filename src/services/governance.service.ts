import { BaseApiService, type APIResponse } from './api.service';
import { cacheManager } from '@/utils/cache.utils';
import { normalizeProposal } from '@/utils/governance.utils';
import type { Proposal } from '@/types/governance';
import type { Proposal, ProposalVotesPage } from '@/types/governance';

const PROPOSAL_CACHE_TTL = 15_000;
export const PROPOSAL_VOTES_PAGE_SIZE = 20;

function asRecord(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

class GovernanceService extends BaseApiService {
	private cacheKeys = new Set<string>();

	async getProposals(creatorId?: string): Promise<Proposal[]> {
		const cacheKey = `proposals_${creatorId ?? 'all'}`;
		const cached = cacheManager.get<Proposal[]>(cacheKey);
		if (cached) return cached;

		try {
			const params: Record<string, string> = {};
			if (creatorId) params.creatorId = creatorId;

			const response = await this.api.get<APIResponse<unknown>>(
				'/governance/proposals',
				{ params }
			);
			const payload = asRecord(response.data.data);
			const rawProposals = Array.isArray(response.data.data)
				? response.data.data
				: Array.isArray(payload.proposals)
					? payload.proposals
					: Array.isArray(payload.items)
						? payload.items
						: Array.isArray(payload.data)
							? payload.data
							: [];
			const proposals = rawProposals.map(normalizeProposal);
			this.cacheKeys.add(cacheKey);
			cacheManager.set(cacheKey, proposals, PROPOSAL_CACHE_TTL);
			return proposals;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async getProposal(proposalId: string): Promise<Proposal> {
		const cacheKey = `proposal_${proposalId}`;
		const cached = cacheManager.get<Proposal>(cacheKey);
		if (cached) return cached;

		try {
			const response = await this.api.get<APIResponse<unknown>>(
				`/governance/proposals/${encodeURIComponent(proposalId)}`
			);
			const payload = asRecord(response.data.data);
			const rawProposal =
				payload.proposal ??
				payload.data ??
				(Array.isArray(payload.items) ? payload.items[0] : undefined) ??
				response.data.data;
			const proposal = normalizeProposal(rawProposal);
			this.cacheKeys.add(cacheKey);
			cacheManager.set(cacheKey, proposal, PROPOSAL_CACHE_TTL);
			return proposal;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	clearCache(): void {
		for (const cacheKey of this.cacheKeys) {
			cacheManager.invalidate(cacheKey);
		}
		this.cacheKeys.clear();
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
