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
  counterpartyAddress?: string;
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

export const PROPOSAL_EXPIRY_HOURS = 1;
export const PROPOSAL_ID_PREFIX = 'swap_';

export function generateProposalId(): string {
  return `${PROPOSAL_ID_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function calculateExpiryTimestamp(hours: number = PROPOSAL_EXPIRY_HOURS): number {
  return Date.now() + hours * 60 * 60 * 1000;
}

export function isProposalExpired(
  proposal: Pick<AtomicSwapProposal, 'expiresAt' | 'status'>,
  now: number = Date.now()
): boolean {
  return proposal.status === 'expired' || now >= proposal.expiresAt;
}

export function formatSwapExpiryCountdown(
  expiresAt: number,
  now: number = Date.now()
): string {
  const remainingMs = expiresAt - now;
  if (remainingMs <= 0) return 'Expired';
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

export function canAcceptProposal(
  proposal: AtomicSwapProposal,
  userAddress: string,
  now: number = Date.now()
): boolean {
  if (!userAddress) return false;
  if (proposal.status !== 'pending') return false;
  if (isProposalExpired(proposal, now)) return false;
  if (proposal.proposerAddress.toLowerCase() === userAddress.toLowerCase()) {
    return false;
  }
  if (
    proposal.counterpartyAddress &&
    proposal.counterpartyAddress.toLowerCase() !== userAddress.toLowerCase()
  ) {
    return false;
  }
  return true;
}

export function canCancelProposal(
  proposal: AtomicSwapProposal,
  userAddress: string
): boolean {
  if (!userAddress) return false;
  if (proposal.status !== 'pending') return false;
  return proposal.proposerAddress.toLowerCase() === userAddress.toLowerCase();
}