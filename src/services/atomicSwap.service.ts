import { BaseApiService, type APIResponse } from './api.service';
import { cacheManager } from '@/utils/cache.utils';
import type {
  AtomicSwapProposal,
  CreateProposalInput,
  ProposalValidationResult,
  SwapHistoryEntry,
} from '@/types/atomicSwap';
import { generateProposalId, calculateExpiryTimestamp, isProposalExpired } from '@/types/atomicSwap';

const PROPOSAL_CACHE_PREFIX = 'atomic_swap_proposal_';
const PROPOSALS_LIST_CACHE_PREFIX = 'atomic_swap_proposals_';
const PROPOSAL_CACHE_TTL_MS = 30_000;

export interface CreateProposalParams {
  proposerAddress: string;
  offeredKeyId: string;
  offeredKeyName: string;
  offeredAmount: number;
  desiredKeyId: string;
  desiredKeyName: string;
  desiredAmount: number;
  expiryHours?: number;
}

export interface GetProposalParams {
  proposalId: string;
}

export interface AcceptProposalParams {
  proposalId: string;
  counterpartyAddress: string;
}

export interface GetUserProposalsParams {
  address: string;
  status?: AtomicSwapProposal['status'];
}

export interface GetSwapHistoryParams {
  address: string;
  cursor?: string | null;
  limit?: number;
}

export interface SwapHistoryPage {
  swaps: SwapHistoryEntry[];
  nextCursor: string | null;
}

class AtomicSwapService extends BaseApiService {
  async createProposal(params: CreateProposalParams): Promise<AtomicSwapProposal> {
    const proposal: AtomicSwapProposal = {
      id: generateProposalId(),
      proposer: 'Current User',
      proposerAddress: params.proposerAddress,
      offeredKeyId: params.offeredKeyId,
      offeredKeyName: params.offeredKeyName,
      offeredAmount: params.offeredAmount,
      desiredKeyId: params.desiredKeyId,
      desiredKeyName: params.desiredKeyName,
      desiredAmount: params.desiredAmount,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: calculateExpiryTimestamp(params.expiryHours),
    };

    try {
      const response = await this.api.post<APIResponse<AtomicSwapProposal>>(
        '/atomic-swaps/proposals',
        proposal
      );
      return response.data.data;
    } catch {
      // Mock implementation for development
      // In production, this would call the actual backend
      this.cacheProposal(proposal);
      return proposal;
    }
  }

  async getProposal(params: GetProposalParams): Promise<AtomicSwapProposal | null> {
    const cacheKey = `${PROPOSAL_CACHE_PREFIX}${params.proposalId}`;
    const cached = cacheManager.get<AtomicSwapProposal>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.api.get<APIResponse<AtomicSwapProposal>>(
        `/atomic-swaps/proposals/${params.proposalId}`
      );
      const proposal = response.data.data;
      this.cacheProposal(proposal);
      return proposal;
    } catch {
      // Mock implementation - check local storage for demo
      const stored = this.getStoredProposal(params.proposalId);
      return stored;
    }
  }

  async acceptProposal(params: AcceptProposalParams): Promise<{ transactionHash: string; proposal: AtomicSwapProposal }> {
    try {
      const response = await this.api.post<APIResponse<{ transactionHash: string; proposal: AtomicSwapProposal }>>(
        `/atomic-swaps/proposals/${params.proposalId}/accept`,
        { counterpartyAddress: params.counterpartyAddress }
      );
      return response.data.data;
    } catch {
      // Mock implementation
      const proposal = await this.getProposal({ proposalId: params.proposalId });
      if (!proposal) throw new Error('Proposal not found');
      if (isProposalExpired(proposal)) throw new Error('Proposal has expired');
      if (proposal.status !== 'pending') throw new Error('Proposal is no longer actionable');

      const updatedProposal: AtomicSwapProposal = {
        ...proposal,
        status: 'executed',
        counterpartyAddress: params.counterpartyAddress,
        counterparty: 'Counterparty',
        executedAt: Date.now(),
        transactionHash: `0x${Math.random().toString(16).slice(2, 66)}`,
      };
      this.cacheProposal(updatedProposal);
      this.addToSwapHistory(updatedProposal);
      return { transactionHash: updatedProposal.transactionHash!, proposal: updatedProposal };
    }
  }

  async getUserProposals(params: GetUserProposalsParams): Promise<AtomicSwapProposal[]> {
    const cacheKey = `${PROPOSALS_LIST_CACHE_PREFIX}${params.address}_${params.status ?? 'all'}`;
    const cached = cacheManager.get<AtomicSwapProposal[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.api.get<APIResponse<AtomicSwapProposal[]>>(
        `/atomic-swaps/proposals`,
        {
          params: {
            address: params.address,
            ...(params.status ? { status: params.status } : {}),
          },
        }
      );
      const proposals = response.data.data;
      cacheManager.set(cacheKey, proposals, PROPOSAL_CACHE_TTL_MS);
      return proposals;
    } catch {
      // Mock implementation
      return this.getStoredUserProposals(params.address, params.status);
    }
  }

  async getSwapHistory(params: GetSwapHistoryParams): Promise<SwapHistoryPage> {
    try {
      const response = await this.api.get<APIResponse<SwapHistoryPage>>(
        `/atomic-swaps/history/${params.address}`,
        {
          params: {
            ...(params.cursor ? { cursor: params.cursor } : {}),
            ...(params.limit ? { limit: params.limit } : {}),
          },
        }
      );
      return response.data.data;
    } catch {
      // Mock implementation
      return this.getStoredSwapHistory(params.address, params.cursor, params.limit);
    }
  }

  private cacheProposal(proposal: AtomicSwapProposal): void {
    const cacheKey = `${PROPOSAL_CACHE_PREFIX}${proposal.id}`;
    cacheManager.set(cacheKey, proposal, PROPOSAL_CACHE_TTL_MS);
  }

  private getStoredProposal(proposalId: string): AtomicSwapProposal | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(`atomic_swap_proposal_${proposalId}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private getStoredUserProposals(address: string, status?: AtomicSwapProposal['status']): AtomicSwapProposal[] {
    if (typeof window === 'undefined') return [];
    try {
      const allKeys = Object.keys(localStorage);
      const proposalKeys = allKeys.filter(k => k.startsWith('atomic_swap_proposal_'));
      const proposals: AtomicSwapProposal[] = [];
      for (const key of proposalKeys) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const proposal = JSON.parse(stored) as AtomicSwapProposal;
          if (
            (proposal.proposerAddress === address || proposal.counterpartyAddress === address) &&
            (!status || proposal.status === status)
          ) {
            proposals.push(proposal);
          }
        }
      }
      return proposals.sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  }

  private addToSwapHistory(proposal: AtomicSwapProposal): void {
    if (typeof window === 'undefined') return;
    try {
      const historyKey = `atomic_swap_history_${proposal.proposerAddress}`;
      const existing = localStorage.getItem(historyKey);
      const history: SwapHistoryEntry[] = existing ? JSON.parse(existing) : [];

      const entry: SwapHistoryEntry = {
        id: `swap_hist_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        type: 'atomic-swap',
        proposer: proposal.proposer,
        proposerAddress: proposal.proposerAddress,
        counterparty: proposal.counterparty ?? 'Unknown',
        counterpartyAddress: proposal.counterpartyAddress ?? '',
        offeredKeyId: proposal.offeredKeyId,
        offeredKeyName: proposal.offeredKeyName,
        offeredAmount: proposal.offeredAmount,
        receivedKeyId: proposal.desiredKeyId,
        receivedKeyName: proposal.desiredKeyName,
        receivedAmount: proposal.desiredAmount,
        timestamp: proposal.executedAt ?? Date.now(),
        transactionHash: proposal.transactionHash ?? '',
        status: 'completed',
      };

      history.unshift(entry);
      localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 100)));
    } catch {
      // Ignore storage errors
    }
  }

  private getStoredSwapHistory(
    address: string,
    cursor: string | null | undefined,
    limit = 20
  ): SwapHistoryPage {
    if (typeof window === 'undefined') return { swaps: [], nextCursor: null };
    try {
      const historyKey = `atomic_swap_history_${address}`;
      const stored = localStorage.getItem(historyKey);
      const allSwaps: SwapHistoryEntry[] = stored ? JSON.parse(stored) : [];

      let startIndex = 0;
      if (cursor) {
        const cursorIndex = allSwaps.findIndex(s => s.id === cursor);
        if (cursorIndex !== -1) startIndex = cursorIndex + 1;
      }

      const pageSwaps = allSwaps.slice(startIndex, startIndex + limit);
      const nextCursor = startIndex + limit < allSwaps.length ? pageSwaps[pageSwaps.length - 1].id : null;

      return { swaps: pageSwaps, nextCursor };
    } catch {
      return { swaps: [], nextCursor: null };
    }
  }

  validateProposal(input: CreateProposalInput, userHoldings: Record<string, number>): ProposalValidationResult {
    const errors: string[] = [];

    if (!input.offeredKeyId) errors.push('Offered key is required');
    if (!input.desiredKeyId) errors.push('Desired key is required');
    if (!Number.isFinite(input.offeredAmount) || input.offeredAmount <= 0) {
      errors.push('Offered amount must be greater than zero');
    }
    if (!Number.isFinite(input.desiredAmount) || input.desiredAmount <= 0) {
      errors.push('Desired amount must be greater than zero');
    }
    if (input.offeredKeyId === input.desiredKeyId) {
      errors.push('Cannot create a swap with the same key on both sides');
    }

    const availableHolding = userHoldings[input.offeredKeyId] ?? 0;
    if (input.offeredAmount > availableHolding) {
      errors.push(`Insufficient holdings: you have ${availableHolding} ${input.offeredKeyName} keys`);
    }

    return { valid: errors.length === 0, errors };
  }
}

export const atomicSwapService = new AtomicSwapService();

export async function createAtomicSwapProposal(params: CreateProposalParams): Promise<AtomicSwapProposal> {
  return atomicSwapService.createProposal(params);
}

export async function fetchAtomicSwapProposal(params: GetProposalParams): Promise<AtomicSwapProposal | null> {
  return atomicSwapService.getProposal(params);
}

export async function acceptAtomicSwapProposal(params: AcceptProposalParams): Promise<{ transactionHash: string; proposal: AtomicSwapProposal }> {
  return atomicSwapService.acceptProposal(params);
}

export async function fetchUserAtomicSwapProposals(params: GetUserProposalsParams): Promise<AtomicSwapProposal[]> {
  return atomicSwapService.getUserProposals(params);
}

export async function fetchAtomicSwapHistory(params: GetSwapHistoryParams): Promise<SwapHistoryPage> {
  return atomicSwapService.getSwapHistory(params);
}

export function validateAtomicSwapProposal(
  input: CreateProposalInput,
  userHoldings: Record<string, number>
): ProposalValidationResult {
  return atomicSwapService.validateProposal(input, userHoldings);
}