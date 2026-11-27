export type OtcTradeStatus =
  | 'open'
  | 'seller_funded'
  | 'buyer_funded'
  | 'settled'
  | 'disputed'
  | 'resolved'
  | 'expired'
  | 'refunded';

export type OtcTradeFilterStatus =
  | 'all'
  | 'pending_funding'
  | 'settled'
  | 'disputed'
  | 'expired';

export type OtcPartyRole = 'seller' | 'buyer' | 'arbiter' | 'viewer';

export interface ArbiterDecision {
  outcome: 'settle_to_counterparties' | 'refund_all' | 'custom';
  summary: string;
  resolvedAt: number;
  arbiterAddress: string;
}

export interface OtcTrade {
  id: string;
  seller: string;
  buyer: string;
  arbiter: string;
  keyId: string;
  quantity: bigint;
  priceStroops: bigint;
  arbiterFeeStroops: bigint;
  sellerFunded: boolean;
  buyerFunded: boolean;
  status: OtcTradeStatus;
  expiresAt: number;
  disputeReason?: string;
  arbiterDecision?: ArbiterDecision;
}

export interface CreateOtcTradeParams {
  counterparty: string;
  keyId: string;
  quantity: bigint;
  priceStroops: bigint;
  arbiter: string;
  expiresAt: number;
}
