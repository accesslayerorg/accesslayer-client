import React, { useMemo, useState } from 'react';
import {
	useMutation,
	useQueries,
	useQueryClient,
} from '@tanstack/react-query';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import VestingScheduleCard from '@/components/common/VestingScheduleCard';
import Skeleton from '@/components/ui/skeleton';
import { submitCreatorContractCall } from '@/hooks/useCreatorContractActions';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';
import showToast from '@/utils/toast.util';
import { courseService } from '@/services/course.service';
import { queryKeys } from '@/lib/queryKeys';
import { useWalletVestingPositions } from '@/hooks/useWalletVestingPositions';

export interface VestingPositionsSectionProps {
	/** Wallet whose vesting positions are listed (profile wallet). */
	wallet: string;
	/** Creator keys held by the wallet (from the holdings query). */
	keyIds: string[];
	/** Optional keyId -> display-name map for card headers. */
	keyNames?: Record<string, string | undefined>;
	className?: string;
}

const SKELETON_CARD_COUNT = 3;

/**
 * Vesting schedules section of the creator key portfolio page (#1018).
 *
 * Renders one card per vesting position — cliff countdown, linear progress,
 * claim action — with completed schedules moved into a collapsible archive.
 * Sections never render empty-shaped: loading shows skeletons, a total
 * failure shows a retryable alert, and a wallet without schedules shows an
 * explicit empty state.
 */
export const VestingPositionsSection: React.FC<
	VestingPositionsSectionProps
> = ({ wallet, keyIds, keyNames, className }) => {
	const { positions, isLoading, isError } = useWalletVestingPositions(
		keyIds,
		keyNames
	);
	const queryClient = useQueryClient();
	const [isArchiveOpen, setIsArchiveOpen] = useState(false);

	const claimMutation = useMutation({
		mutationKey: ['contract', 'claim_vested_tokens', 'portfolio'],
		mutationFn: async (variables: { keyId: string; amountXlm: number }) => {
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

	const claimHistoryQueries = useQueries({
		queries: positions
			.filter(position => position.schedule.totalAllocation > 0)
			.map(position => ({
				queryKey: queryKeys.creators.vestingClaims(
					position.keyId,
					wallet
				),
				queryFn: () =>
					courseService.getKeyVestingClaims(position.keyId, wallet),
				enabled: Boolean(wallet),
				staleTime: 30_000,
				retry: false,
			})),
	});

	const claimsByKey = useMemo(() => {
		const map = new Map<string, Awaited<ReturnType<typeof courseService.getKeyVestingClaims>>>();
		const scheduled = positions.filter(
			position => position.schedule.totalAllocation > 0
		);
		claimHistoryQueries.forEach((query, index) => {
			const keyId = scheduled[index]?.keyId;
			if (keyId && Array.isArray(query.data)) map.set(keyId, query.data);
		});
		return map;
	}, [positions, claimHistoryQueries]);

	const active = useMemo(
		() => positions.filter(position => position.schedule.phase !== 'completed'),
		[positions]
	);
	const completed = useMemo(
		() => positions.filter(position => position.schedule.phase === 'completed'),
		[positions]
	);

	return (
		<div className={className} data-testid="vesting-positions-section">
			{isError && (
				<div
					role="alert"
					className="mb-4 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200"
					data-testid="vesting-section-error"
				>
					<AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
					<p>
						Some vesting schedules failed to load. The rest of the
						section is still usable — refresh to try again.
					</p>
				</div>
			)}

			{isLoading ? (
				<div
					className="grid grid-cols-1 gap-4 lg:grid-cols-2"
					data-testid="vesting-section-loading"
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
			) : positions.length === 0 ? (
				<p
					className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/55"
					data-testid="vesting-section-empty"
				>
					No vesting schedules for this wallet. Vesting positions appear
					here once a creator key with a reserved allocation is held.
				</p>
			) : (
				<>
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
						{active.map(position => (
							<VestingScheduleCard
								key={position.keyId}
								keyId={position.keyId}
								keyName={position.keyName}
								beneficiary={position.beneficiary}
								schedule={position.schedule}
								cliffAt={position.cliffAt}
								endAt={position.endAt}
								claims={claimsByKey.get(position.keyId) ?? []}
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

					{completed.length > 0 && (
						<div className="mt-6" data-testid="vesting-archive">
							<button
								type="button"
								className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left text-sm font-bold text-white hover:bg-white/[0.05]"
								onClick={() => setIsArchiveOpen(open => !open)}
								aria-expanded={isArchiveOpen}
								data-testid="vesting-archive-row"
							>
								{isArchiveOpen ? (
									<ChevronDown className="size-4" aria-hidden="true" />
								) : (
									<ChevronRight className="size-4" aria-hidden="true" />
								)}
								Completed schedules
								<span
									className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/70"
									data-testid="vesting-archive-count"
								>
									{completed.length}
								</span>
							</button>
							{isArchiveOpen && (
								<div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
									{completed.map(position => (
										<VestingScheduleCard
											key={position.keyId}
											keyId={position.keyId}
											keyName={position.keyName}
											beneficiary={position.beneficiary}
											schedule={position.schedule}
											cliffAt={position.cliffAt}
											endAt={position.endAt}
											claims={claimsByKey.get(position.keyId) ?? []}
										/>
									))}
								</div>
							)}
						</div>
					)}
				</>
			)}
		</div>
	);
};

export default VestingPositionsSection;
