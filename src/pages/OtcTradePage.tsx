import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router';
import {
  OtcContractService,
  type IOtcContractService,
} from '@/services/otcContract.service';
import type { OtcPartyRole, OtcTrade } from '@/types/otc';

const defaultOtcService = new OtcContractService(undefined, undefined);

interface OtcTradePageProps {
  tradeId?: string;
  currentAddress?: string;
  contractService?: IOtcContractService;
  nowSec?: number;
}

function resolveRole(trade: OtcTrade, address?: string): OtcPartyRole {
  if (!address) return 'viewer';
  const normalized = address.toLowerCase();
  if (trade.seller.toLowerCase() === normalized) return 'seller';
  if (trade.buyer.toLowerCase() === normalized) return 'buyer';
  if (trade.arbiter.toLowerCase() === normalized) return 'arbiter';
  return 'viewer';
}

export function OtcTradePage({
  tradeId: propTradeId,
  currentAddress = '',
  contractService = defaultOtcService,
  nowSec,
}: OtcTradePageProps) {
  const params = useParams();
  const tradeId = propTradeId ?? params.id ?? '';
  const [trade, setTrade] = useState<OtcTrade | null>(null);
  const [loading, setLoading] = useState(true);
  const [disputeReason, setDisputeReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tickNow, setTickNow] = useState<number>(
    nowSec ?? Math.floor(Date.now() / 1000)
  );

  const effectiveNow = typeof nowSec === 'number' ? nowSec : tickNow;

  useEffect(() => {
    if (typeof nowSec === 'number') {
      return;
    }
    const interval = window.setInterval(() => {
      setTickNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [nowSec]);

  const loadTrade = useCallback(async () => {
    try {
      const found = await contractService.getTrade(tradeId, effectiveNow);
      setTrade(found ?? null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load trade.');
    } finally {
      setLoading(false);
    }
  }, [contractService, effectiveNow, tradeId]);

  useEffect(() => {
    void loadTrade();
  }, [loadTrade]);

  if (loading) {
    return <p>Loading OTC trade...</p>;
  }

  if (!trade) {
    return <p>OTC trade not found.</p>;
  }

  const role = resolveRole(trade, currentAddress);
  const isDisputed = trade.status === 'disputed';
  const isSettled = trade.status === 'settled' || trade.status === 'resolved';
  const isExpired =
    !isDisputed &&
    !isSettled &&
    trade.status !== 'refunded' &&
    effectiveNow >= trade.expiresAt;
  const remainingSeconds = Math.max(0, trade.expiresAt - effectiveNow);
  const totalStroops = trade.quantity * trade.priceStroops;

  const canFundAsSeller =
    role === 'seller' &&
    !trade.sellerFunded &&
    !isDisputed &&
    !isSettled &&
    !isExpired;

  const canFundAsBuyer =
    role === 'buyer' &&
    !trade.buyerFunded &&
    !isDisputed &&
    !isSettled &&
    !isExpired;

  const canRefund =
    isExpired && !isDisputed && !isSettled && trade.status !== 'refunded';

  const handleFundSeller = async () => {
    setErrorMsg(null);
    try {
      const updated = await contractService.fundAsSeller(trade.id, effectiveNow);
      setTrade(updated);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Funding failed.');
    }
  };

  const handleFundBuyer = async () => {
    setErrorMsg(null);
    try {
      const updated = await contractService.fundAsBuyer(trade.id, effectiveNow);
      setTrade(updated);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Funding failed.');
    }
  };

  const handleRaiseDispute = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const updated = await contractService.raiseDispute(
        trade.id,
        disputeReason,
        effectiveNow
      );
      setTrade(updated);
      setDisputeReason('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not raise dispute.');
    }
  };

  const handleRefund = async () => {
    setErrorMsg(null);
    try {
      const updated = await contractService.refundTrade(trade.id, effectiveNow);
      setTrade(updated);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Refund failed.');
    }
  };

  return (
    <main>
      <h1>OTC Trade #{trade.id}</h1>
      <p>
        Status: <strong data-testid="trade-status">{trade.status}</strong>
      </p>

      <section aria-label="Funding Status">
        <h2>Funding Status</h2>
        <p>
          Seller ({trade.seller}):{' '}
          <strong>{trade.sellerFunded ? 'Funded' : 'Unfunded'}</strong>
        </p>
        <p>
          Buyer ({trade.buyer}):{' '}
          <strong>{trade.buyerFunded ? 'Funded' : 'Unfunded'}</strong>
        </p>
      </section>

      <section aria-label="Settlement Preview">
        <h2>Settlement Preview</h2>
        <p>Key: {trade.keyId}</p>
        <p>Quantity: {trade.quantity.toString()}</p>
        <p>Total Value: {totalStroops.toString()} stroops</p>
        <p>
          Arbiter Fee:{' '}
          <strong data-testid="trade-arbiter-fee">
            {trade.arbiterFeeStroops.toString()} stroops
          </strong>
        </p>
        <p>
          Expiry Countdown:{' '}
          <strong data-testid="expiry-countdown">
            {isExpired ? 'Expired' : `${remainingSeconds}s remaining`}
          </strong>
        </p>
        {isSettled && (
          <p role="status">
            Trade settled automatically: {trade.quantity.toString()} key(s) of {trade.keyId} and{' '}
            {totalStroops.toString()} stroops distributed.
          </p>
        )}
      </section>

      <section aria-label="Funding Actions">
        {canFundAsSeller && (
          <button type="button" onClick={handleFundSeller}>
            Fund as seller
          </button>
        )}
        {canFundAsBuyer && (
          <button type="button" onClick={handleFundBuyer}>
            Fund as buyer
          </button>
        )}
      </section>

      {canRefund && (
        <section aria-label="Refund Action">
          <button type="button" onClick={handleRefund}>
            Refund
          </button>
        </section>
      )}

      <section aria-label="Dispute Flow">
        <h2>Dispute</h2>
        {!isSettled &&
          trade.status !== 'refunded' &&
          (role === 'seller' || role === 'buyer') && (
            <form onSubmit={handleRaiseDispute}>
              <label htmlFor="dispute-reason">Dispute Reason</label>
              <textarea
                id="dispute-reason"
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                placeholder="Describe why this trade is being disputed..."
              />
              <button type="submit">Raise dispute</button>
            </form>
          )}

        {isDisputed && (
          <div role="alert" data-testid="dispute-lock-banner">
            <p>
              Trade is disputed. Settlement and refund are blocked until the arbiter resolves the
              dispute.
            </p>
            {trade.disputeReason && <p>Reason: {trade.disputeReason}</p>}
          </div>
        )}

        {trade.arbiterDecision && (
          <div data-testid="arbiter-decision">
            <h3>Arbiter Decision</h3>
            <p>Outcome: {trade.arbiterDecision.outcome}</p>
            <p>Decision: {trade.arbiterDecision.summary}</p>
          </div>
        )}
      </section>

      {errorMsg && <p role="alert">{errorMsg}</p>}
    </main>
  );
}

export default OtcTradePage;
