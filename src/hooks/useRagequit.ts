import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { ragequitService } from '@/services/ragequit.service';
import type { RagequitState } from '@/types/ragequit';
import showToast from '@/utils/toast.util';

export interface UseRagequitResult {
	/** Full ragequit state. */
	data: RagequitState | undefined;
	/** Whether the ragequit grace window is currently open. */
	isWindowOpen: boolean;
	/** ISO string timestamp when window ends. */
	windowEndsAt: string;
	/** Remaining time in seconds until the window closes (live ticked). */
	remainingSeconds: number;
	/** Formatted countdown string (HH:MM:SS or DDd HHh). */
	countdownText: string;
	/** Total reserve available backing creator keys. */
	totalReserveXlm: number;
	/** Cumulative keys exited so far. */
	cumulativeExits: number;
	/** Maximum keys allowed to exit in this window. */
	exitCap: number;
	/** Percentage of exit cap reached. */
	exitCapPercent: number;
	/** Whether the current user is eligible to exit with reserve share. */
	isEligible: boolean;
	/** Reason explaining why the user is ineligible, if applicable. */
	ineligibilityReason?: string;
	/** User's opposing keys available to burn. */
	userKeys: number;
	/** Estimated total payout in XLM if user burns their eligible keys. */
	estimatedPayoutXlm: number;
	/** Proportional reserve payout per individual key. */
	payoutPerKeyXlm: number;
	/** Whether proposal was executed after the window closed. */
	isExecuted: boolean;
	/** Linked executed proposal ID. */
	executedProposalId?: string;
	/** Execute ragequit exit mutation. */
	executeRagequit: (keysToBurn: number) => Promise<{ txHash: string; payoutXlm: number }>;
	/** Loading state. */
	isLoading: boolean;
	/** Mutation pending. */
	isMutating: boolean;
	/** Error state. */
	error: Error | null;
}

export function formatCountdown(seconds: number): string {
	const safe = Math.max(0, seconds);
	if (safe === 0) return '00:00:00 (Window Ended)';

	const days = Math.floor(safe / 86400);
	const hours = Math.floor((safe % 86400) / 3600);
	const minutes = Math.floor((safe % 3600) / 60);
	const secs = safe % 60;

	if (days > 0) {
		return `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
	}

	return [
		hours.toString().padStart(2, '0'),
		minutes.toString().padStart(2, '0'),
		secs.toString().padStart(2, '0'),
	].join(':');
}

export function useRagequit(
	proposalId: string,
	userAddress?: string
): UseRagequitResult {
	const queryClient = useQueryClient();

	const { data, isLoading, error } = useQuery({
		queryKey: queryKeys.ragequit.state(proposalId, userAddress),
		queryFn: () => ragequitService.getRagequitState(proposalId, userAddress),
		enabled: Boolean(proposalId),
	});

	// Live countdown timer state
	const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

	useEffect(() => {
		if (!data?.windowEndsAt) return;
		const endMs = new Date(data.windowEndsAt).getTime();

		const update = () => {
			const diff = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
			setRemainingSeconds(diff);
		};

		update();
		const interval = setInterval(update, 1000);
		return () => clearInterval(interval);
	}, [data?.windowEndsAt]);

	const mutation = useMutation({
		mutationFn: (keysToBurn: number) =>
			ragequitService.executeRagequit(proposalId, keysToBurn, userAddress),
		onSuccess: res => {
			showToast.success(
				`Ragequit successful! Burned keys and received ${res.payoutXlm.toFixed(2)} XLM from reserve.`
			);
			void queryClient.invalidateQueries({
				queryKey: queryKeys.ragequit.all(),
			});
		},
		onError: (err: Error) => {
			showToast.error(err.message || 'Failed to execute ragequit');
		},
	});

	const isWindowOpen = Boolean(data?.isOpen) && remainingSeconds > 0;
	const isExecuted = Boolean(data?.isExecuted);
	const executedProposalId =
		data?.executedProposalId ?? (isExecuted ? proposalId : undefined);

	const cumulativeExits = data?.cumulativeExits ?? 0;
	const exitCap = Math.max(1, data?.exitCap ?? 1);
	const exitCapPercent = Math.min(100, (cumulativeExits / exitCap) * 100);

	return {
		data,
		isWindowOpen,
		windowEndsAt: data?.windowEndsAt ?? '',
		remainingSeconds,
		countdownText: formatCountdown(remainingSeconds),
		totalReserveXlm: data?.totalReserveXlm ?? 0,
		cumulativeExits,
		exitCap,
		exitCapPercent,
		isEligible: isWindowOpen && Boolean(data?.isEligible),
		ineligibilityReason: !isWindowOpen
			? 'The ragequit window for this proposal has closed.'
			: data?.ineligibilityReason,
		userKeys: data?.userKeys ?? 0,
		estimatedPayoutXlm: data?.estimatedPayoutXlm ?? 0,
		payoutPerKeyXlm: data?.payoutPerKeyXlm ?? 0,
		isExecuted,
		executedProposalId,
		executeRagequit: mutation.mutateAsync,
		isLoading,
		isMutating: mutation.isPending,
		error: (error as Error) || null,
	};
}
