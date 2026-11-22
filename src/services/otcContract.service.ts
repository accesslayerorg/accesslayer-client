import type { ContractProvider, ContractSigner } from '@/hooks/useContractService';
import type {
  ArbiterDecision,
  CreateOtcTradeParams,
  OtcTrade,
} from '@/types/otc';

const STELLAR_PUBLIC_KEY_REGEX = /^G[A-Z2-7]{55}$/;
const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function isValidWalletAddress(address: string): boolean {
  const trimmed = address.trim();
  return STELLAR_PUBLIC_KEY_REGEX.test(trimmed) || EVM_ADDRESS_REGEX.test(trimmed);
}

export function calculateArbiterFeeStroops(
  totalStroops: bigint,
  feeBps = 250n
): bigint {
  if (totalStroops <= 0n) return 0n;
  return (totalStroops * feeBps) / 10_000n;
}

export function deriveTradeStatus(
  trade: OtcTrade,
  nowSec = Math.floor(Date.now() / 1000)
): OtcTrade {
  if (trade.status === 'refunded' || trade.status === 'resolved') {
    return trade;
  }

  // A disputed trade blocks settlement and refund until resolved
  if (trade.status === 'disputed' || Boolean(trade.disputeReason && !trade.arbiterDecision)) {
    return {
      ...trade,
      status: 'disputed',
    };
  }

  // Settlement happens automatically once both sides are funded
  if (trade.sellerFunded && trade.buyerFunded) {
    return {
      ...trade,
      status: 'settled',
    };
  }

  if (nowSec >= trade.expiresAt) {
    return {
      ...trade,
      status: 'expired',
    };
  }

  if (trade.sellerFunded) {
    return { ...trade, status: 'seller_funded' };
  }
  if (trade.buyerFunded) {
    return { ...trade, status: 'buyer_funded' };
  }

  return { ...trade, status: 'open' };
}

export interface IOtcContractService {
  openTrade(creatorAddress: string, params: CreateOtcTradeParams): Promise<OtcTrade>;
  getTrade(tradeId: string, nowSec?: number): Promise<OtcTrade | undefined>;
  listTradesForAddress(address: string, nowSec?: number): Promise<OtcTrade[]>;
  fundAsSeller(tradeId: string, nowSec?: number): Promise<OtcTrade>;
  fundAsBuyer(tradeId: string, nowSec?: number): Promise<OtcTrade>;
  raiseDispute(tradeId: string, reason: string, nowSec?: number): Promise<OtcTrade>;
  resolveDispute(tradeId: string, decision: ArbiterDecision): Promise<OtcTrade>;
  refundTrade(tradeId: string, nowSec?: number): Promise<OtcTrade>;
}

export class OtcContractService implements IOtcContractService {
  private static sharedStore = new Map<string, OtcTrade>();
  private static nextSeq = 1;

  readonly provider: ContractProvider;
  readonly signer: ContractSigner;
  private readonly store: Map<string, OtcTrade>;

  constructor(
    provider: ContractProvider,
    signer: ContractSigner,
    store: Map<string, OtcTrade> = OtcContractService.sharedStore
  ) {
    this.provider = provider;
    this.signer = signer;
    this.store = store;
  }

  async openTrade(creatorAddress: string, params: CreateOtcTradeParams): Promise<OtcTrade> {
    const id = `otc-${OtcContractService.nextSeq++}`;
    const totalStroops = params.quantity * params.priceStroops;
    const arbiterFeeStroops = calculateArbiterFeeStroops(totalStroops);

    const created: OtcTrade = {
      id,
      seller: creatorAddress,
      buyer: params.counterparty,
      arbiter: params.arbiter,
      keyId: params.keyId,
      quantity: params.quantity,
      priceStroops: params.priceStroops,
      arbiterFeeStroops,
      sellerFunded: false,
      buyerFunded: false,
      status: 'open',
      expiresAt: params.expiresAt,
    };

    const normalized = deriveTradeStatus(created);
    this.store.set(id, normalized);
    return normalized;
  }

  async getTrade(
    tradeId: string,
    nowSec = Math.floor(Date.now() / 1000)
  ): Promise<OtcTrade | undefined> {
    const raw = this.store.get(tradeId);
    if (!raw) return undefined;
    const updated = deriveTradeStatus(raw, nowSec);
    this.store.set(tradeId, updated);
    return updated;
  }

  async listTradesForAddress(
    address: string,
    nowSec = Math.floor(Date.now() / 1000)
  ): Promise<OtcTrade[]> {
    const normalizedAddr = address.toLowerCase();
    const results: OtcTrade[] = [];
    for (const [id, raw] of this.store.entries()) {
      const updated = deriveTradeStatus(raw, nowSec);
      this.store.set(id, updated);
      if (
        updated.seller.toLowerCase() === normalizedAddr ||
        updated.buyer.toLowerCase() === normalizedAddr ||
        updated.arbiter.toLowerCase() === normalizedAddr
      ) {
        results.push(updated);
      }
    }
    return results;
  }

  private async requireTrade(
    tradeId: string,
    nowSec = Math.floor(Date.now() / 1000)
  ): Promise<OtcTrade> {
    const trade = await this.getTrade(tradeId, nowSec);
    if (!trade) {
      throw new Error(`OTC trade "${tradeId}" not found.`);
    }
    return trade;
  }

  async fundAsSeller(
    tradeId: string,
    nowSec = Math.floor(Date.now() / 1000)
  ): Promise<OtcTrade> {
    const trade = await this.requireTrade(tradeId, nowSec);
    if (trade.status === 'disputed') {
      throw new Error('Cannot fund while trade is disputed.');
    }
    if (trade.status === 'expired' || trade.status === 'refunded') {
      throw new Error('Cannot fund an expired or refunded trade.');
    }
    const updated = deriveTradeStatus(
      {
        ...trade,
        sellerFunded: true,
      },
      nowSec
    );
    this.store.set(tradeId, updated);
    return updated;
  }

  async fundAsBuyer(
    tradeId: string,
    nowSec = Math.floor(Date.now() / 1000)
  ): Promise<OtcTrade> {
    const trade = await this.requireTrade(tradeId, nowSec);
    if (trade.status === 'disputed') {
      throw new Error('Cannot fund while trade is disputed.');
    }
    if (trade.status === 'expired' || trade.status === 'refunded') {
      throw new Error('Cannot fund an expired or refunded trade.');
    }
    const updated = deriveTradeStatus(
      {
        ...trade,
        buyerFunded: true,
      },
      nowSec
    );
    this.store.set(tradeId, updated);
    return updated;
  }

  async raiseDispute(
    tradeId: string,
    reason: string,
    nowSec = Math.floor(Date.now() / 1000)
  ): Promise<OtcTrade> {
    const trimmed = reason.trim();
    if (!trimmed) {
      throw new Error('A dispute reason is required.');
    }
    const trade = await this.requireTrade(tradeId, nowSec);
    if (trade.status === 'settled' || trade.status === 'refunded') {
      throw new Error('Completed trades cannot be disputed.');
    }
    const updated: OtcTrade = {
      ...trade,
      status: 'disputed',
      disputeReason: trimmed,
    };
    this.store.set(tradeId, updated);
    return updated;
  }

  async resolveDispute(tradeId: string, decision: ArbiterDecision): Promise<OtcTrade> {
    const trade = await this.requireTrade(tradeId);
    const nextStatus =
      decision.outcome === 'refund_all' ? 'refunded' : 'resolved';
    const updated: OtcTrade = {
      ...trade,
      status: nextStatus,
      arbiterDecision: decision,
    };
    this.store.set(tradeId, updated);
    return updated;
  }

  async refundTrade(
    tradeId: string,
    nowSec = Math.floor(Date.now() / 1000)
  ): Promise<OtcTrade> {
    const trade = await this.requireTrade(tradeId, nowSec);
    if (trade.status === 'disputed') {
      throw new Error('Disputed trades are locked from refund until resolved.');
    }
    if (trade.status === 'settled' || trade.status === 'resolved') {
      throw new Error('Settled trades cannot be refunded.');
    }
    if (nowSec < trade.expiresAt) {
      throw new Error('Refund is only available after expiry for unsettled trades.');
    }
    const updated: OtcTrade = {
      ...trade,
      status: 'refunded',
    };
    this.store.set(tradeId, updated);
    return updated;
  }
}

export function createOtcContractService(
  provider: ContractProvider,
  signer: ContractSigner,
  store?: Map<string, OtcTrade>
): OtcContractService {
  return new OtcContractService(provider, signer, store);
}
