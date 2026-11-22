import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Hourglass } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import Skeleton from '@/components/ui/skeleton';
import VestingScheduleCard from '@/components/common/VestingScheduleCard';
import { submitCreatorContractCall } from '@/hooks/useCreatorContractActions';
import { useWalletVestingPositions } from '@/hooks/useWalletVestingPositions';
import { queryKeys } from '@/lib/queryKeys';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';
import showToast from '@/utils/toast.util';
import { formatCliffCountdown } from '@/utils/vestingSchedule.utils';
import {
	describeVestingMilestone,
	getNextVestingMilestone,
} from '@/utils/vestingViewer.utils';

export interface VestingSchedulesViewerProps {
	/** Wallet whose vesting schedules are shown (the dashboard owner). */
	wallet: string;
	/** Creator keys to check for vesting allocations (current key + holdings). */
	keyIds: string[];
	/** Optional keyId → display-name map for card headers. */
	keyNames?: Record<string, string | undefined>;
	className?: string;
}

const SKELETON_CARD_COUNT = 2;
const TICK_INTERVAL_MS = 1000;

/**
 * Vesting schedule viewer for the creator dashboard (#1117).
 *
 * Lists every active vesting allocation registered to the wallet across the
 * keys it checks: total locked, claimed, claimable now, cliff status, a
 * vested-vs-total progress bar, a per-second countdown to the next cliff or
 * full unlock, and a Claim button that submits `claim_vested_tokens`.
 * Completed allocations with nothing left to claim are filtered out so the
 * viewer stays focused on what is still unlocking.
 */
export const VestingSchedulesViewer: React.FC<VestingSchedulesViewerProps> = ({
	wallet,
	keyIds,
	keyNames,
	className,
}) => {
	const { positions, isLoading, isError } = useWalletVestingPositions(
		keyIds,
		keyNames
	);
	const queryClient = useQueryClient();

	// Ticking clock for the next-unlock countdown.
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const interval = setInterval(() => setNow(Date.now()), TICK_INTERVAL_MS);
		return () => clearInterval(interval);
	}, []);

	const activeSchedules = useMemo(
		() =>
			positions.filter(position => {
				if (position.schedule.totalAllocation <= 0) return false;
				// Fully vested schedules stay visible while something is still
				// claimable; everything else must still be unlocking.
				if (position.schedule.phase === 'completed') {
					return position.schedule.hasClaimableAmount;
				}
				return true;
			}),
		[positions]
	);

	const nextMilestone = useMemo(
		() => getNextVestingMilestone(activeSchedules, now),
		[activeSchedules, now]
	);

	const claimMutation = useMutation({
		mutationKey: ['contract', 'claim_vested_tokens', 'vesting-viewer'],
		mutationFn: async (variables: {
			keyId: string;
			amountXlm: number;
		}) => {
			await submitCreatorContractCall('claim_vested_tokens', {
				creatorId: variables.keyId,
				wallet,
				amountXlm: variables.amountXlm,
			});
			return variables;
		},
		onSuccess: variables => {
			// Prefix match also invalidates the claims queries for this key.
			void queryClient.invalidateQueries({
				queryKey: queryKeys.creators.vesting(variables.keyId),
			});
			showToast.success('Vested tokens claimed');
		},
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
	});

	return (
		<div
			className={className}
			data-testid="vesting-schedules-viewer"
			aria-label="Vesting schedules viewer"
		>
			{isError && (
				<div
					role="alert"
					className="mb-4 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200"
					data-testid="vesting-viewer-error"
				>
					<AlertTriangle
						className="mt-0.5 size-4 shrink-0"
						aria-hidden="true"
					/>
					<p>
						Some vesting schedules failed to load. Refresh to try again —
						the schedules that did load are still claimable below.
					</p>
				</div>
			)}

			{isLoading ? (
				<div
					className="grid grid-cols-1 gap-4 lg:grid-cols-2"
					data-testid="vesting-viewer-loading"
				>
					{Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
						<div
							key={index}
							className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
						>
							<Skeleton className="h-5 w-40" />
							<Skeleton className="mt-4 h-2 w-full" />
							<div className="mt-4 grid grid-cols-3 gap-3">
								<Skeleton className="h-14 w-full" />
								<Skeleton className="h-14 w-full" />
								<Skeleton className="h-14 w-full" />
							</div>
						</div>
					))}
				</div>
			) : activeSchedules.length === 0 ? (
				<EmptyState
					icon={
						<Hourglass className="size-10 text-amber-300" aria-hidden="true" />
					}
					title="No active vesting schedules"
					description="This wallet has no vesting allocations that are still unlocking. Schedules appear here once a key with a reserved creator allocation is deployed or held."
					data-testid="vesting-viewer-empty"
				/>
			) : (
				<>
					{/* Next unlock summary with live countdown (#1117) */}
					{nextMilestone && (
						<div
							className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3"
							data-testid="vesting-viewer-next-unlock"
							role="timer"
							aria-label="Time until the next vesting unlock"
						>
							<Hourglass
								className="size-4 shrink-0 text-amber-300"
								aria-hidden="true"
							/>
							<span className="text-xs uppercase tracking-[0.18em] text-amber-200/70">
								Next unlock — {describeVestingMilestone(nextMilestone)}
							</span>
							<span
								className="font-mono text-sm font-bold text-white tabular-nums"
								data-testid="vesting-viewer-countdown"
							>
								{formatCliffCountdown(nextMilestone.secondsLeft)}
							</span>
						</div>
					)}

					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
						{activeSchedules.map(position => (
							<VestingScheduleCard
								key={position.keyId}
								keyId={position.keyId}
								keyName={position.keyName}
								beneficiary={position.beneficiary}
								schedule={position.schedule}
								cliffAt={position.cliffAt}
								endAt={position.endAt}
								isClaiming={
									claimMutation.isPending &&
									claimMutation.variables?.keyId === position.keyId
								}
								onClaim={() =>
									claimMutation.mutate({
										keyId: position.keyId,
										amountXlm: position.schedule.claimableAmount,
									})
								}
							/>
						))}
					</div>
				</>
			)}
		</div>
	);
};

export default VestingSchedulesViewer;
