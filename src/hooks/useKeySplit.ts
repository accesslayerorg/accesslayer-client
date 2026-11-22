import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { QueryClientContext } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { SplitExecutedEvent } from '@/types/keySplit';
import {
	dismissSplitForSession,
	formatSplitRatio,
	getSplitRemainingMs,
	isSplitActive,
	isSplitDismissedForSession,
	resolveSplitBalances,
} from '@/utils/keySplit.utils';
import { keySplitEventService } from '@/services/keySplitEvents.service';
import { useWalletHoldings } from './useWallet';

export function useSafeQueryClient() {
	return useContext(QueryClientContext);
}

export interface UseKeySplitOptions {
	keyId?: string;
	userAddress?: string;
	/** Direct split event instance (e.g. from course.recentSplit). */
	initialSplit?: SplitExecutedEvent | null;
	/** Quantity of keys held by the connected wallet. */
	holdingQuantity?: number | null;
}

export interface UseKeySplitResult {
	/** Active split event, or null if no split or split is expired (> 48h). */
	split: SplitExecutedEvent | null;
	/** Whether a split occurred within the last 48 hours. */
	isActive: boolean;
	/** Whether the banner was dismissed for this session. */
	isDismissed: boolean;
	/** Formatted ratio string (e.g. "2:1"). */
	ratioDisplay: string;
	/** Numeric split ratio. */
	ratio: number;
	/** Pre-split holding balance for this wallet. */
	preSplitBalance: number;
	/** Post-split holding balance for this wallet. */
	postSplitBalance: number;
	/** Dismiss the split notification for this session. */
	dismiss: () => void;
	/** Manually trigger balance refresh. */
	refetchBalances: () => Promise<void>;
}

/**
 * Hook to manage split event lifecycle, live socket updates, balances, and session dismissal (#1151).
 */
export function useKeySplit({
	keyId,
	userAddress,
	initialSplit,
	holdingQuantity: explicitHoldingQuantity,
}: UseKeySplitOptions = {}): UseKeySplitResult {
	const queryClient = useSafeQueryClient();
	const [, setTick] = useState(0);

	// Fetch holdings if userAddress is provided and no explicit quantity was passed
	const { data: holdings = [], refetch: refetchHoldings } = useWalletHoldings(
		userAddress ?? ''
	);

	const holdingQuantity = useMemo(() => {
		if (explicitHoldingQuantity != null) return explicitHoldingQuantity;
		if (!keyId || !holdings.length) return 0;
		const found = holdings.find(h => h.creatorId === keyId);
		return found?.quantity ?? 0;
	}, [explicitHoldingQuantity, holdings, keyId]);

	// Fetch recent split from API / cache if keyId is present
	const [queriedSplit, setQueriedSplit] = useState<SplitExecutedEvent | null>(() => {
		if (keyId) return keySplitEventService.getActiveSplit(keyId);
		return null;
	});

	useEffect(() => {
		if (!keyId) return;
		let cancelled = false;
		void keySplitEventService.fetchRecentSplit(keyId).then(res => {
			if (!cancelled && res) {
				setQueriedSplit(res);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [keyId]);

	// Derive the candidate split from initial props, query result, or service cache
	const candidateSplit = useMemo<SplitExecutedEvent | null>(() => {
		if (initialSplit !== undefined) {
			if (initialSplit && isSplitActive(initialSplit)) {
				keySplitEventService.recordSplit(initialSplit);
				return initialSplit;
			}
			return initialSplit;
		}
		if (queriedSplit && isSplitActive(queriedSplit)) {
			return queriedSplit;
		}
		if (keyId) {
			const cached = keySplitEventService.getActiveSplit(keyId);
			if (cached && isSplitActive(cached)) return cached;
		}
		return queriedSplit ?? null;
	}, [initialSplit, queriedSplit, keyId]);

	const [liveSplit, setLiveSplit] = useState<SplitExecutedEvent | null>(null);

	// Subscribe to realtime SplitExecuted events for this key
	useEffect(() => {
		if (!keyId) return;

		const unsubscribe = keySplitEventService.subscribe(keyId, event => {
			setLiveSplit(event);
			// Updated balances fetched and displayed immediately after split event (#1151)
			if (userAddress) {
				void queryClient?.invalidateQueries({
					queryKey: queryKeys.wallet.holdings(userAddress),
				});
				void refetchHoldings();
			}
			void queryClient?.invalidateQueries({
				queryKey: queryKeys.creators.detail(keyId),
			});
			void queryClient?.invalidateQueries({
				queryKey: queryKeys.creators.all,
			});
		});

		return () => {
			unsubscribe();
		};
	}, [keyId, userAddress, queryClient, refetchHoldings]);

	const activeSplit = liveSplit ?? candidateSplit;
	const isActive = Boolean(activeSplit && isSplitActive(activeSplit));

	// Dismissal state backed by sessionStorage
	const [sessionDismissed, setSessionDismissed] = useState<boolean>(() => {
		if (!keyId || !activeSplit) return false;
		return isSplitDismissedForSession(keyId, activeSplit.executedAt);
	});

	// Update dismissal state if keyId or activeSplit changes
	useEffect(() => {
		if (keyId && activeSplit) {
			setSessionDismissed(isSplitDismissedForSession(keyId, activeSplit.executedAt));
		}
	}, [keyId, activeSplit]);

	// Auto-expire when the 48-hour window elapses while mounted
	useEffect(() => {
		if (!activeSplit || !isActive) return;

		const remainingMs = getSplitRemainingMs(activeSplit);
		if (remainingMs <= 0) return;

		const timer = window.setTimeout(() => {
			setTick(t => t + 1);
		}, remainingMs);

		return () => {
			window.clearTimeout(timer);
		};
	}, [activeSplit, isActive]);

	const dismiss = useCallback(() => {
		if (!keyId) return;
		setSessionDismissed(true);
		dismissSplitForSession(keyId, activeSplit?.executedAt);
	}, [keyId, activeSplit]);

	const refetchBalances = useCallback(async () => {
		if (userAddress) {
			await queryClient?.invalidateQueries({
				queryKey: queryKeys.wallet.holdings(userAddress),
			});
			await refetchHoldings();
		}
	}, [userAddress, queryClient, refetchHoldings]);

	const balances = useMemo(() => {
		if (!activeSplit) {
			return { preSplitBalance: 0, postSplitBalance: 0 };
		}
		return resolveSplitBalances(activeSplit, holdingQuantity, true);
	}, [activeSplit, holdingQuantity]);

	const ratio = activeSplit?.ratio ?? 1;

	return {
		split: activeSplit,
		isActive,
		isDismissed: sessionDismissed,
		ratioDisplay: formatSplitRatio(ratio),
		ratio,
		preSplitBalance: balances.preSplitBalance,
		postSplitBalance: balances.postSplitBalance,
		dismiss,
		refetchBalances,
	};
}

/**
 * Hook to retrieve all active key splits (for portfolio page highlighting #1151).
 */
export function useActiveKeySplits(userAddress?: string) {
	const queryClient = useSafeQueryClient();
	const [, setTick] = useState(0);

	// Subscribe to all split events to update badges dynamically
	useEffect(() => {
		const unsubscribe = keySplitEventService.subscribe('*', () => {
			setTick(t => t + 1);
			if (userAddress && queryClient) {
				void queryClient.invalidateQueries({
					queryKey: queryKeys.wallet.holdings(userAddress),
				});
			}
		});

		return () => {
			unsubscribe();
		};
	}, [userAddress, queryClient]);

	const activeSplits = useMemo(() => {
		return keySplitEventService.getAllActiveSplits();
	}, []);

	const isKeySplitActive = useCallback((keyId: string): boolean => {
		const split = keySplitEventService.getActiveSplit(keyId);
		return Boolean(split && isSplitActive(split));
	}, []);

	return {
		activeSplits,
		isKeySplitActive,
	};
}
