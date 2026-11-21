import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Lock, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/common/EmptyState';
import { useClaimStakeMutation } from '@/hooks/useWallet';
import { formatCountdownTime } from '@/utils/lockupCountdown.utils';
import {
	computeRemainingStakeLockSeconds,
	computeStakedPositionValueStroops,
	formatClaimableReward,
	formatStakedQuantity,
	isStakePositionUnlocked,
} from '@/utils/stakingPositions.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import type { StakingPosition } from '@/services/stakingPositions.service';
import { cn } from '@/lib/utils';

export interface StakingPositionsListProps {
	/** Wallet the positions belong to — identifies the stake being claimed. */
	walletAddress: string;
	/** Staking positions, ready for display (prices already merged in). */
	positions: StakingPosition[];
	/** Whether the viewer owns this profile — hides the Claim action when false. */
	isOwnProfile?: boolean;
	isLoading?: boolean;
	isError?: boolean;
	className?: string;
}

function LockStatus({ position }: { position: StakingPosition }) {
	const [nowMs, setNowMs] = useState(() => Date.now());

	useEffect(() => {
		const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
		return () => window.clearInterval(intervalId);
	}, []);

	const unlocked = isStakePositionUnlocked(position, nowMs);

	if (unlocked) {
		return (
			<span
				data-testid={`staking-lock-status-${position.id}`}
				className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300"
			>
				<TrendingUp className="size-3" aria-hidden="true" />
				Unlocked
			</span>
		);
	}

	return (
		<span
			data-testid={`staking-lock-status-${position.id}`}
			className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300"
		>
			<Lock className="size-3" aria-hidden="true" />
			Unlocks in{' '}
			{formatCountdownTime(
				computeRemainingStakeLockSeconds(position, nowMs)
			)}
		</span>
	);
}

function StakingRowSkeleton() {
	return (
		<div
			aria-hidden="true"
			className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
		>
			<div className="space-y-2">
				<div className="h-4 w-36 animate-pulse rounded bg-white/10" />
				<div className="h-3 w-24 animate-pulse rounded bg-white/10" />
			</div>
			<div className="flex items-center gap-3">
				<div className="h-4 w-20 animate-pulse rounded bg-white/10" />
				<div className="h-8 w-24 animate-pulse rounded bg-white/10" />
			</div>
		</div>
	);
}

/**
 * Active staking positions for the user profile page (#921).
 *
 * Renders each position with its staked quantity, current bond-curve value,
 * live lock countdown, and claimable rewards. The profile owner gets a Claim
 * button (via the existing `useClaimStakeMutation` flow); public profile views
 * render the same positions read-only.
 *
 * Purely presentational: the caller owns the data so it can enrich positions
 * with current creator prices before they are valued.
 */
const StakingPositionsList: React.FC<StakingPositionsListProps> = ({
	walletAddress,
	positions,
	isOwnProfile = true,
	isLoading = false,
	isError = false,
	className,
}) => {
	const claimMutation = useClaimStakeMutation(walletAddress);

	if (isLoading) {
		return (
			<section
				role="status"
				aria-label="Loading staking positions"
				aria-busy="true"
				className={cn('space-y-2', className)}
				data-testid="staking-positions-skeleton"
			>
				<span className="sr-only">Loading staking positions</span>
				{Array.from({ length: 3 }).map((_, i) => (
					<StakingRowSkeleton key={i} />
				))}
			</section>
		);
	}

	if (isError) {
		return (
			<EmptyState
				title="Couldn't load staking positions"
				description="There was a problem fetching your staking positions. Please try again shortly."
				data-testid="staking-positions-error"
				className={className}
			/>
		);
	}

	if (positions.length === 0) {
		return (
			<EmptyState
				title="No active staking positions"
				description="Staked keys and their lock timers will appear here once you stake your first key."
				data-testid="staking-positions-empty"
				className={className}
			/>
		);
	}

	return (
		<section
			aria-label="Staking positions"
			className={cn('space-y-2', className)}
			data-testid="staking-positions-list"
		>
			<div className="mb-2 hidden items-center justify-between px-5 text-[10px] font-bold uppercase tracking-widest text-white/30 sm:flex">
				<span className="flex-1">Key</span>
				<div className="flex items-center gap-6">
					<span className="w-24 text-right">Staked</span>
					<span className="w-28 text-right">Current value</span>
					<span className="flex items-center gap-1 w-32 text-right">
						<Clock className="size-3" aria-hidden="true" />
						Lock status
					</span>
					{isOwnProfile && (
						<span className="w-40 text-right">Rewards</span>
					)}
				</div>
			</div>

			{positions.map(position => {
				const valueStroops = computeStakedPositionValueStroops(position);
				const unlocked = isStakePositionUnlocked(position);
				const claimable = position.claimableReward ?? 0;
				const canClaim = isOwnProfile && unlocked && claimable > 0;

				return (
					<div
						key={position.id}
						data-testid={`staking-position-${position.id}`}
						className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/20 sm:flex-row sm:items-center sm:justify-between"
					>
						<div className="min-w-0 flex-1">
							<Link
								to={`/creator/${position.keyId}`}
								className="block truncate text-sm font-semibold text-white transition-colors hover:text-amber-300"
							>
								{position.keyName}
							</Link>
						</div>

						<div className="flex items-center gap-6 text-xs text-white/60 sm:gap-6">
							<div className="flex flex-col items-end">
								<span className="text-[10px] font-bold uppercase tracking-widest text-white/30 sm:hidden">
									Staked
								</span>
								<span
									data-testid={`staking-quantity-${position.id}`}
									className="font-mono text-white/80"
								>
									{formatStakedQuantity(position.stakedQuantity)}
								</span>
							</div>

							<div className="flex flex-col items-end">
								<span className="text-[10px] font-bold uppercase tracking-widest text-white/30 sm:hidden">
									Value
								</span>
								<span
									data-testid={`staking-value-${position.id}`}
									className="font-mono font-semibold text-white"
								>
									{formatDisplayKeyPrice(valueStroops)}
								</span>
							</div>

							<div className="flex flex-col items-end">
								<span className="text-[10px] font-bold uppercase tracking-widest text-white/30 sm:hidden">
									Lock
								</span>
								<LockStatus position={position} />
							</div>

							{isOwnProfile && (
								<div className="flex flex-col items-end gap-2">
									<span className="text-[10px] font-bold uppercase tracking-widest text-white/30 sm:hidden">
										Rewards
									</span>
									<span
										data-testid={`staking-claimable-${position.id}`}
										className="font-mono text-sm font-bold text-emerald-300"
									>
										{formatClaimableReward(claimable)}
									</span>
									{canClaim && (
										<Button
											size="xs"
											onClick={() =>
												claimMutation.mutate({
													keyId: position.keyId,
												})
											}
											disabled={
												claimMutation.isPending ||
												claimMutation.variables?.keyId ===
													position.keyId
											}
											data-testid={`staking-claim-${position.id}`}
											className="mt-1 rounded-lg"
										>
											{claimMutation.isPending &&
											claimMutation.variables?.keyId ===
												position.keyId
												? 'Claiming…'
												: 'Claim'}
										</Button>
									)}
								</div>
							)}
						</div>
					</div>
				);
			})}
		</section>
	);
};

export default StakingPositionsList;
