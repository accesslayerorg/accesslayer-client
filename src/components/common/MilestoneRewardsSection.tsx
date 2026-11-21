import React from 'react';
import { Award, Lock, CheckCircle2 } from 'lucide-react';
import Skeleton from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
	useClaimMilestoneReward,
	useMilestoneRewards,
} from '@/hooks/useMilestoneRewards';
import {
	formatDaysHeld,
	hasAnyMilestones,
	milestoneProgressPercent,
	resolveMilestoneState,
} from '@/utils/milestoneRewards.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { cn } from '@/lib/utils';

export interface MilestoneRewardsSectionProps {
	wallet: string;
	className?: string;
}

const STATE_BADGE: Record<string, string> = {
	claimed: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
	claimable: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
	locked: 'border-white/10 bg-white/5 text-white/50',
};

/**
 * Holder milestone rewards tracker for the portfolio page (#1141): per held
 * key loyalty milestones (30/90/180/365 days held) with claimed/claimable/
 * locked state, a progress bar toward the next threshold, and a claim
 * button for eligible rewards.
 */
export const MilestoneRewardsSection: React.FC<
	MilestoneRewardsSectionProps
> = ({ wallet, className }) => {
	const { data: keys = [], isLoading, isError } = useMilestoneRewards(wallet);
	const claimMutation = useClaimMilestoneReward(wallet);

	if (isLoading) {
		return (
			<div
				className={cn('space-y-4', className)}
				data-testid="milestone-rewards-loading"
				role="status"
			>
				<Skeleton className="h-28 w-full" />
				<Skeleton className="h-28 w-full" />
			</div>
		);
	}

	if (isError) {
		return (
			<p
				role="alert"
				className={cn('text-sm text-red-300', className)}
				data-testid="milestone-rewards-error"
			>
				Couldn&apos;t load milestone rewards. Please try again later.
			</p>
		);
	}

	if (!hasAnyMilestones(keys)) {
		return (
			<p
				className={cn('text-sm text-white/60', className)}
				data-testid="milestone-rewards-empty"
			>
				No milestone rewards yet — hold a creator key for 30 days or more
				to start unlocking loyalty rewards.
			</p>
		);
	}

	return (
		<div
			className={cn('space-y-6', className)}
			data-testid="milestone-rewards-section"
		>
			{keys
				.filter(key => key.milestones.length > 0)
				.map(key => (
					<div
						key={key.keyId}
						data-testid={`milestone-key-${key.keyId}`}
						className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
					>
						<div className="mb-4 flex items-center justify-between">
							<h3 className="font-grotesque text-base font-bold text-white">
								{key.keyTitle ?? 'Creator key'}
							</h3>
							<span className="text-xs text-white/50">
								{formatDaysHeld(key.daysHeld)}
							</span>
						</div>

						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
							{key.milestones
								.slice()
								.sort((a, b) => a.thresholdDays - b.thresholdDays)
								.map(milestone => {
									const state = resolveMilestoneState(
										milestone,
										key.daysHeld
									);
									const progress = milestoneProgressPercent(
										milestone,
										key.daysHeld
									);
									const isClaiming =
										claimMutation.isPending &&
										claimMutation.variables?.keyId === key.keyId &&
										claimMutation.variables?.milestoneIndex ===
											milestone.milestoneIndex;

									return (
										<div
											key={milestone.milestoneIndex}
											data-testid={`milestone-card-${key.keyId}-${milestone.milestoneIndex}`}
											data-milestone-state={state}
											className="flex flex-col gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3"
										>
											<div className="flex items-center justify-between">
												<span className="text-sm font-semibold text-white">
													{milestone.thresholdDays}d
												</span>
												<span
													className={cn(
														'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase',
														STATE_BADGE[state]
													)}
												>
													{state === 'claimed' && (
														<CheckCircle2 className="size-2.5" />
													)}
													{state === 'locked' && (
														<Lock className="size-2.5" />
													)}
													{state}
												</span>
											</div>

											<div
												role="progressbar"
												aria-valuenow={progress}
												aria-valuemin={0}
												aria-valuemax={100}
												aria-label={`Progress toward ${milestone.thresholdDays}-day milestone`}
												className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
											>
												<div
													className="h-full rounded-full bg-amber-400"
													style={{ width: `${progress}%` }}
												/>
											</div>

											{state === 'claimed' ? (
												<p className="text-xs text-white/50">
													Received{' '}
													<span className="font-semibold text-emerald-300">
														{formatDisplayKeyPrice(
															milestone.receivedAmountStroops ?? 0
														)}
													</span>
													{milestone.claimedAt && (
														<>
															{' '}
															on{' '}
															{new Date(
																milestone.claimedAt
															).toLocaleDateString()}
														</>
													)}
												</p>
											) : state === 'claimable' ? (
												<Button
													size="sm"
													className="mt-1"
													disabled={claimMutation.isPending}
													onClick={() =>
														claimMutation.mutate({
															keyId: key.keyId,
															milestoneIndex:
																milestone.milestoneIndex,
														})
													}
													data-testid={`claim-milestone-${key.keyId}-${milestone.milestoneIndex}`}
												>
													<Award className="mr-1 size-3.5" />
													{isClaiming ? 'Claiming…' : 'Claim'}
												</Button>
											) : (
												<p className="text-xs text-white/40">
													{Math.max(
														0,
														milestone.thresholdDays - key.daysHeld
													)}{' '}
													days to go
												</p>
											)}
										</div>
									);
								})}
						</div>
					</div>
				))}
		</div>
	);
};

export default MilestoneRewardsSection;
