import { useMemo } from 'react';
import { Loader2, Unlock, Lock, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { formatXlmPrice, formatNumber } from '@/utils/numberFormat.utils';
import type { VaultStake } from '@/services/stakingVault.service';

// ─── Countdown helpers ────────────────────────────────────────────────────────

/**
 * Returns a human-readable countdown string from now until `expiresAt`.
 * Accurate to the second for times under one hour, otherwise hours/days.
 */
function formatCountdown(expiresAt: string): string {
	const diffMs = new Date(expiresAt).getTime() - Date.now();
	if (diffMs <= 0) return 'Expired';

	const totalSeconds = Math.floor(diffMs / 1_000);
	const days = Math.floor(totalSeconds / 86_400);
	const hours = Math.floor((totalSeconds % 86_400) / 3_600);
	const minutes = Math.floor((totalSeconds % 3_600) / 60);
	const seconds = totalSeconds % 60;

	if (days > 0) return `${days}d ${hours}h`;
	if (hours > 0) return `${hours}h ${minutes}m`;
	return `${minutes}m ${seconds}s`;
}

/** Returns true when the lock window has passed. */
function isExpired(expiresAt: string): boolean {
	return new Date(expiresAt).getTime() <= Date.now();
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ActiveStakesListProps {
	stakes: VaultStake[];
	/** Whether an unstake mutation is pending for a given stakeId. */
	pendingUnstakeId: string | null;
	/** Called when the user clicks Unstake on an unlocked position. */
	onUnstake: (stakeId: string) => void;
}

// ─── Sub-component: single stake row ─────────────────────────────────────────

interface StakeRowProps {
	stake: VaultStake;
	isPendingUnstake: boolean;
	onUnstake: (stakeId: string) => void;
}

function StakeRow({ stake, isPendingUnstake, onUnstake }: StakeRowProps) {
	const expired = useMemo(() => isExpired(stake.lockExpiresAt), [stake.lockExpiresAt]);
	const countdown = useMemo(
		() => (expired ? 'Unlocked' : formatCountdown(stake.lockExpiresAt)),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[expired, stake.lockExpiresAt]
	);
	const lockDate = new Date(stake.lockExpiresAt).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});

	return (
		<li
			data-testid={`vault-stake-row-${stake.id}`}
			className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				{/* Left: staked amount + lock status */}
				<div className="flex items-center gap-3">
					<div
						className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${
							expired
								? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
								: 'border-amber-500/30 bg-amber-500/10 text-amber-400'
						}`}
					>
						{expired ? (
							<Unlock className="size-4" aria-hidden="true" />
						) : (
							<Lock className="size-4" aria-hidden="true" />
						)}
					</div>
					<div>
						<p className="font-jakarta text-sm font-bold text-white">
							{formatNumber(stake.stakedAmount)} key
							{stake.stakedAmount === 1 ? '' : 's'} staked
						</p>
						<p className="mt-0.5 text-xs text-white/45">
							{expired ? (
								<span className="text-emerald-400 font-medium">
									Ready to unstake
								</span>
							) : (
								<>
									Unlocks{' '}
									<span
										className="text-white/60"
										aria-label={`Unlocks on ${lockDate}`}
									>
										{lockDate}
									</span>
								</>
							)}
						</p>
					</div>
				</div>

				{/* Right: stats + unstake button */}
				<div className="flex flex-wrap items-center gap-4">
					{/* Lock expiry countdown */}
					<div className="text-right">
						<p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-white/35">
							{expired ? 'Status' : 'Time left'}
						</p>
						<p
							className={`mt-0.5 text-sm font-bold tabular-nums ${
								expired ? 'text-emerald-400' : 'text-white'
							}`}
							data-testid={`vault-stake-countdown-${stake.id}`}
						>
							{countdown}
						</p>
					</div>

					{/* Accrued rewards */}
					<div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
						<Coins className="size-3.5 shrink-0 text-amber-300/70" aria-hidden="true" />
						<div>
							<p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-white/35">
								Accrued
							</p>
							<p
								className="text-xs font-bold text-amber-300"
								data-testid={`vault-stake-rewards-${stake.id}`}
							>
								{formatXlmPrice(stake.accruedRewards)}
							</p>
						</div>
					</div>

					{/* Unstake button */}
					{expired ? (
						<Button
							type="button"
							size="sm"
							data-testid={`unstake-button-${stake.id}`}
							onClick={() => onUnstake(stake.id)}
							disabled={isPendingUnstake}
							className="rounded-xl font-bold"
						>
							{isPendingUnstake ? (
								<>
									<Loader2 className="animate-spin" aria-hidden="true" />
									Unstaking…
								</>
							) : (
								<>
									<Unlock className="size-3.5" aria-hidden="true" />
									Unstake
								</>
							)}
						</Button>
					) : (
						<Tooltip content="Unstaking is available once the lock period expires.">
							<Button
								type="button"
								size="sm"
								disabled
								data-testid={`unstake-button-${stake.id}`}
								className="rounded-xl font-bold cursor-not-allowed opacity-50"
								aria-disabled="true"
							>
								<Lock className="size-3.5" aria-hidden="true" />
								Unstake
							</Button>
						</Tooltip>
					)}
				</div>
			</div>

			{/* Reward pool balance chip */}
			{stake.rewardPoolBalance > 0 && (
				<div className="mt-3 flex items-center gap-1.5 text-xs text-white/35">
					<span>Reward pool for this key:</span>
					<span
						className="font-medium text-white/55"
						data-testid={`vault-stake-pool-${stake.id}`}
					>
						{formatXlmPrice(stake.rewardPoolBalance)}
					</span>
				</div>
			)}
		</li>
	);
}

// ─── Main list component ──────────────────────────────────────────────────────

export default function ActiveStakesList({
	stakes,
	pendingUnstakeId,
	onUnstake,
}: ActiveStakesListProps) {
	if (stakes.length === 0) {
		return (
			<div
				data-testid="active-stakes-empty"
				className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center"
			>
				<div className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40">
					<Coins className="size-5" aria-hidden="true" />
				</div>
				<p className="font-jakarta text-sm text-white/50">
					No active stakes yet. Use the form above to lock your keys and start
					earning rewards.
				</p>
			</div>
		);
	}

	return (
		<ul
			data-testid="active-stakes-list"
			className="space-y-3"
			aria-label="Active vault stakes"
		>
			{stakes.map(stake => (
				<StakeRow
					key={stake.id}
					stake={stake}
					isPendingUnstake={pendingUnstakeId === stake.id}
					onUnstake={onUnstake}
				/>
			))}
		</ul>
	);
}
