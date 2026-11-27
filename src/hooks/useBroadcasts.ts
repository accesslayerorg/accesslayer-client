import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { courseService } from '@/services/course.service';
import {
	cancelScheduledBroadcast,
	countAudience,
	createBroadcast,
	dispatchDueBroadcasts,
	listBroadcasts,
	listEmailSubscriptions,
	remainingAllowance,
	setEmailOptIn,
	type AudienceHolder,
	type BroadcastInput,
} from '@/services/broadcasts.service';

/** Upper bound on holder pages fetched for audience counting. */
const MAX_HOLDER_PAGES = 50;
const HISTORY_REFRESH_MS = 60_000;

/** Every holder of a key, following the holders endpoint's cursor. */
export async function fetchAllHolders(keyId: string): Promise<AudienceHolder[]> {
	const out: AudienceHolder[] = [];
	let cursor: string | null = null;
	for (let page = 0; page < MAX_HOLDER_PAGES; page++) {
		const res = await courseService.getHoldersPage(keyId, cursor);
		for (const h of res.holders) out.push({ walletAddress: h.walletAddress, keyCount: h.keyCount });
		if (!res.nextCursor) break;
		cursor = res.nextCursor;
	}
	return out;
}

/**
 * Creator email broadcasts for one key (#1476): audience counting, send,
 * schedule, cancel and history, plus the remaining monthly allowance.
 */
export function useBroadcasts(keyId: string) {
	const queryClient = useQueryClient();
	const holders = useQuery({
		queryKey: queryKeys.broadcasts.holders(keyId),
		queryFn: () => fetchAllHolders(keyId),
		enabled: Boolean(keyId),
	});
	const history = useQuery({
		queryKey: queryKeys.broadcasts.history(keyId),
		queryFn: () => {
			// Scheduled broadcasts go out once due, with the audience as it is then.
			dispatchDueBroadcasts(keyId, holders.data ?? []);
			return listBroadcasts(keyId);
		},
		enabled: Boolean(keyId) && holders.isSuccess,
		refetchInterval: HISTORY_REFRESH_MS,
	});

	const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.broadcasts.history(keyId) });
	const send = useMutation({
		mutationFn: async (input: Omit<BroadcastInput, 'keyId' | 'scheduledFor'>) =>
			createBroadcast({ ...input, keyId }, holders.data ?? []),
		onSuccess: invalidate,
	});
	const schedule = useMutation({
		mutationFn: async (input: Omit<BroadcastInput, 'keyId'> & { scheduledFor: Date }) =>
			createBroadcast({ ...input, keyId }, holders.data ?? []),
		onSuccess: invalidate,
	});
	const cancel = useMutation({
		mutationFn: async (id: string) => cancelScheduledBroadcast(id),
		onSuccess: invalidate,
	});

	const holderList = holders.data;
	const audience = useCallback(
		(minBalance: number) => countAudience(keyId, holderList ?? [], minBalance),
		[keyId, holderList]
	);

	return {
		isLoading: holders.isLoading || history.isLoading,
		isError: holders.isError || history.isError,
		history: history.data ?? [],
		audience,
		// Recomputed on every render so it follows sends and month changes.
		remaining: remainingAllowance(keyId),
		send,
		schedule,
		cancel,
	};
}

/** A holder's per-key creator email opt-ins (#1476). */
export function useCreatorEmailOptIns(wallet: string | null | undefined) {
	const queryClient = useQueryClient();
	const key = queryKeys.broadcasts.optIns(wallet ?? '');
	const subscriptions = useQuery({
		queryKey: key,
		queryFn: () => listEmailSubscriptions(wallet ?? ''),
		enabled: Boolean(wallet),
	});
	const setOptIn = useMutation({
		mutationFn: async (v: { keyId: string; email: string; optedIn: boolean }) =>
			setEmailOptIn(v.keyId, wallet ?? '', v.email, v.optedIn),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
	});
	return { subscriptions: subscriptions.data ?? [], isLoading: subscriptions.isLoading, setOptIn };
}
