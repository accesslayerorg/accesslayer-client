import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { OtcContractService, type IOtcContractService } from '@/services/otcContract.service';
import type { OtcTrade, OtcTradeFilterStatus } from '@/types/otc';

const defaultOtcService = new OtcContractService(undefined, undefined);

export function matchesTradeFilter(trade: OtcTrade, filter: OtcTradeFilterStatus): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'pending_funding':
      return (
        trade.status === 'open' ||
        trade.status === 'seller_funded' ||
        trade.status === 'buyer_funded'
      );
    case 'settled':
      return trade.status === 'settled' || trade.status === 'resolved';
    case 'disputed':
      return trade.status === 'disputed';
    case 'expired':
      return trade.status === 'expired' || trade.status === 'refunded';
    default:
      return true;
  }
}

export function useOtcTrades(
  address: string | undefined,
  service: IOtcContractService = defaultOtcService
) {
  const [statusFilter, setStatusFilter] = useState<OtcTradeFilterStatus>('all');

  const query = useQuery<OtcTrade[]>({
    queryKey: ['otc-trades', address ?? ''],
    queryFn: () => service.listTradesForAddress(address ?? ''),
    enabled: Boolean(address),
  });

  const trades = useMemo(() => query.data ?? [], [query.data]);
  const filteredTrades = useMemo(
    () => trades.filter(trade => matchesTradeFilter(trade, statusFilter)),
    [trades, statusFilter]
  );

  return {
    trades,
    filteredTrades,
    statusFilter,
    setStatusFilter,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
