import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useOtcTrades } from '../useOtcTrades';
import { OtcContractService } from '@/services/otcContract.service';

const SELLER = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const BUYER = 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBQ2C';
const ARBITER = 'GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC3A4';

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useOtcTrades', () => {
  it('lists user trades and filters by status', async () => {
    const store = new Map();
    const service = new OtcContractService(undefined, undefined, store);
    const future = Math.floor(Date.now() / 1000) + 3600;

    const openTrade = await service.openTrade(SELLER, {
      counterparty: BUYER,
      keyId: 'k1',
      quantity: 1n,
      priceStroops: 1000n,
      arbiter: ARBITER,
      expiresAt: future,
    });

    const settledTrade = await service.openTrade(SELLER, {
      counterparty: BUYER,
      keyId: 'k2',
      quantity: 1n,
      priceStroops: 2000n,
      arbiter: ARBITER,
      expiresAt: future,
    });
    await service.fundAsSeller(settledTrade.id);
    await service.fundAsBuyer(settledTrade.id);

    const { result } = renderHook(() => useOtcTrades(SELLER, service), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.trades).toHaveLength(2);
    });

    act(() => {
      result.current.setStatusFilter('settled');
    });
    expect(result.current.filteredTrades.map(t => t.id)).toEqual([settledTrade.id]);

    act(() => {
      result.current.setStatusFilter('pending_funding');
    });
    expect(result.current.filteredTrades.map(t => t.id)).toEqual([openTrade.id]);
  });
});
