import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { creatorKeysContractService, type SellableBalanceResult } from '@/services/creatorKeysContract.service';

export interface SellableNowResult extends SellableBalanceResult {
	lockedBalance: number;
	isFullySellable: boolean;
	isFullyLocked: boolean;
	isLoading: boolean;
	data: SellableBalanceResult | undefined;
	error: Error | null;
	isError: boolean;
	isSuccess: boolean;
	refetch: () => Promise<unknown>;
	fetchStatus: 'idle' | 'fetching' | 'paused' | 'pending';
	status: 'idle' | 'loading' | 'success' | 'error' | 'pending';
}

export function useSellableNow(
	wallet: string | undefined,
	keyId: string | undefined
): SellableNowResult {
	const query = useQuery<SellableBalanceResult>({
		queryKey: queryKeys.wallet.sellableNow(wallet ?? '', keyId ?? ''),
		queryFn: () => creatorKeysContractService.getSellableBalance({ keyId: keyId!, wallet: wallet! }),
		enabled: !!wallet && !!keyId,
		refetchInterval: 5000, // Poll every 5 seconds to catch ledger close
		staleTime: 2000,
	});

	const totalBalance = query.data?.totalBalance ?? 0;
	const sellableNow = query.data?.sellableNow ?? 0;
	const isExempt = query.data?.isExempt ?? false;
	const lockedBalance = Math.max(0, totalBalance - sellableNow);
	const isFullySellable = totalBalance > 0 && sellableNow === totalBalance;
	const isFullyLocked = totalBalance > 0 && sellableNow === 0 && !isExempt;

	return {
		totalBalance,
		sellableNow,
		isExempt,
		nextLedgerCloseEstimate: query.data?.nextLedgerCloseEstimate,
		lockedBalance,
		isFullySellable,
		isFullyLocked,
		isLoading: query.isLoading,
		data: query.data,
		error: query.error,
		isError: query.isError,
		isSuccess: query.isSuccess,
		refetch: query.refetch,
		fetchStatus: query.fetchStatus,
		status: query.status,
	};
}