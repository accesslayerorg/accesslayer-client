export type ProposalStatus = 'pending' | 'accepted' | 'expired' | 'executed' | 'cancelled';

export interface AtomicSwapProposal {
  id: string;
  proposer: string;
  proposerAddress: string;
  offeredKeyId: string;
  offeredKeyName: string;
  offeredAmount: number;
  desiredKeyId: string;
  desiredKeyName: string;
  desiredAmount: number;
  status: ProposalStatus;
  createdAt: number;
  expiresAt: number;
  executedAt?: number;
  counterparty?: string;
  counterpartyAddress?: string;
  transactionHash?: string;
}

export interface CreateProposalInput {
  offeredKeyId: string;
  offeredKeyName: string;
  offeredAmount: number;
  desiredKeyId: string;
  desiredKeyName: string;
  desiredAmount: number;
  expiryHours?: number;
}

export interface ProposalValidationResult {
  valid: boolean;
  errors: string[];
}

export interface SwapHistoryEntry {
  id: string;
  type: 'atomic-swap';
  proposer: string;
  proposerAddress: string;
  counterparty: string;
  counterpartyAddress: string;
  offeredKeyId: string;
  offeredKeyName: string;
  offeredAmount: number;
  receivedKeyId: string;
  receivedKeyName: string;
  receivedAmount: number;
  timestamp: number;
  transactionHash: string;
  status: 'completed' | 'failed';
}

export const PROPOSAL_EXPIRY_HOURS = 24;
export const PROPOSAL_ID_PREFIX = 'swap_';

export function generateProposalId(): string {
  return `${PROPOSAL_ID_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function calculateExpiryTimestamp(hours: number = PROPOSAL_EXPIRY_HOURS): number {
  return Date.now() + hours * 60 * 60 * 1000;
}

export function isProposalExpired(proposal: AtomicSwapProposal): boolean {
  return Date.now() > proposal.expiresAt;
}

export function canAcceptProposal(proposal: AtomicSwapProposal, userAddress: string): boolean {
  if (proposal.status !== 'pending') return false;
  if (isProposalExpired(proposal)) return false;
  if (proposal.proposerAddress === userAddress) return false;
  return true;
}