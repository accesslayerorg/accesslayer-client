import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OtcTradePage } from '../OtcTradePage';
import { OtcContractService } from '@/services/otcContract.service';

const SELLER = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const BUYER = 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBQ2C';
const ARBITER = 'GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC3A4';
const OUTSIDER = 'GDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD4B5';

describe('OtcTradePage', () => {
  it('shows only the matching party funding button and settles automatically once both sides fund', async () => {
    const store = new Map();
    const service = new OtcContractService(undefined, undefined, store);
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600;

    const trade = await service.openTrade(SELLER, {
      counterparty: BUYER,
      keyId: 'creator-key-1',
      quantity: 3n,
      priceStroops: 1_000_000n,
      arbiter: ARBITER,
      expiresAt: futureExpiry,
    });

    const { unmount: unmountOutsider } = render(
      <OtcTradePage tradeId={trade.id} currentAddress={OUTSIDER} contractService={service} />
    );
    await screen.findByText(new RegExp(`OTC Trade #${trade.id}`));
    expect(screen.queryByRole('button', { name: /fund as seller/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fund as buyer/i })).not.toBeInTheDocument();
    unmountOutsider();

    const { unmount: unmountSeller } = render(
      <OtcTradePage tradeId={trade.id} currentAddress={SELLER} contractService={service} />
    );
    const sellerBtn = await screen.findByRole('button', { name: /fund as seller/i });
    expect(screen.queryByRole('button', { name: /fund as buyer/i })).not.toBeInTheDocument();
    fireEvent.click(sellerBtn);
    await waitFor(() => {
      expect(screen.getByTestId('trade-status')).toHaveTextContent('seller_funded');
    });
    unmountSeller();

    render(
      <OtcTradePage tradeId={trade.id} currentAddress={BUYER} contractService={service} />
    );
    const buyerBtn = await screen.findByRole('button', { name: /fund as buyer/i });
    expect(screen.queryByRole('button', { name: /fund as seller/i })).not.toBeInTheDocument();
    fireEvent.click(buyerBtn);

    await waitFor(() => {
      expect(screen.getByTestId('trade-status')).toHaveTextContent('settled');
    });
    expect(screen.getByRole('status')).toHaveTextContent(/settled automatically/i);
  });

  it('blocks settlement and refund when disputed until arbiter decision is recorded', async () => {
    const store = new Map();
    const service = new OtcContractService(undefined, undefined, store);
    const nowSec = 1_800_000_000;

    const trade = await service.openTrade(SELLER, {
      counterparty: BUYER,
      keyId: 'creator-key-2',
      quantity: 1n,
      priceStroops: 2_000_000n,
      arbiter: ARBITER,
      expiresAt: nowSec + 600,
    });
    await service.fundAsSeller(trade.id);

    const { rerender } = render(
      <OtcTradePage
        tradeId={trade.id}
        currentAddress={BUYER}
        contractService={service}
        nowSec={nowSec}
      />
    );

    const reasonInput = await screen.findByLabelText(/dispute reason/i);
    fireEvent.change(reasonInput, { target: { value: 'Off-chain metadata mismatch' } });
    fireEvent.click(screen.getByRole('button', { name: /raise dispute/i }));

    await waitFor(() => {
      expect(screen.getByTestId('trade-status')).toHaveTextContent('disputed');
    });
    expect(screen.getByTestId('dispute-lock-banner')).toHaveTextContent(
      /settlement and refund are blocked/i
    );

    rerender(
      <OtcTradePage
        tradeId={trade.id}
        currentAddress={BUYER}
        contractService={service}
        nowSec={nowSec + 9999}
      />
    );
    expect(screen.queryByRole('button', { name: /refund/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fund as buyer/i })).not.toBeInTheDocument();

    await service.resolveDispute(trade.id, {
      outcome: 'settle_to_counterparties',
      summary: 'Verified key delivery; release escrow to counterparties.',
      resolvedAt: nowSec + 10_000,
      arbiterAddress: ARBITER,
    });

    rerender(
      <OtcTradePage
        tradeId={trade.id}
        currentAddress={BUYER}
        contractService={service}
        nowSec={nowSec + 10_005}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('arbiter-decision')).toHaveTextContent(
        /Verified key delivery; release escrow to counterparties/i
      );
    });
  });

  it('shows expiry countdown and enables refund action after expiry for unsettled trades', async () => {
    const store = new Map();
    const service = new OtcContractService(undefined, undefined, store);
    const createdAt = Math.floor(Date.now() / 1000);
    const expiresAt = createdAt + 300;

    const trade = await service.openTrade(SELLER, {
      counterparty: BUYER,
      keyId: 'creator-key-3',
      quantity: 1n,
      priceStroops: 1_000_000n,
      arbiter: ARBITER,
      expiresAt,
    });
    await service.fundAsSeller(trade.id);

    const { rerender } = render(
      <OtcTradePage
        tradeId={trade.id}
        currentAddress={SELLER}
        contractService={service}
        nowSec={createdAt + 100}
      />
    );

    expect(await screen.findByTestId('expiry-countdown')).toHaveTextContent('200s remaining');
    expect(screen.queryByRole('button', { name: /refund/i })).not.toBeInTheDocument();

    rerender(
      <OtcTradePage
        tradeId={trade.id}
        currentAddress={SELLER}
        contractService={service}
        nowSec={expiresAt + 1}
      />
    );

    expect(screen.getByTestId('expiry-countdown')).toHaveTextContent('Expired');
    const refundBtn = screen.getByRole('button', { name: /refund/i });
    fireEvent.click(refundBtn);

    await waitFor(() => {
      expect(screen.getByTestId('trade-status')).toHaveTextContent('refunded');
    });
  });
});
