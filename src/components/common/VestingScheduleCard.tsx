import React, { useEffect, useState } from 'react';
import { Clock, HelpCircle, Lock } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AsyncButton } from '@/components/ui/async-button';
import { formatXlmPrice, formatPercent } from '@/utils/numberFormat.utils';
import { formatRelativeTime } from '@/utils/time.utils';
import type { KeyVestingClaim } from '@/services/course.service';
import {
	computeCliffCountdownSeconds,
	describeVestingPhase,
	formatCliffCountdown,
	formatVestingDate,
	getVestingClaimDisabledReason,
	type VestingSchedule,
} from '@/utils/vestingSchedule.utils';

export interface VestingScheduleCardProps {
	/** Creator key this schedule belongs to. */
	keyId: string;
	/** Display name of the creator key, when known. */
	keyName?: string | null;
	/** Wallet registered as the beneficiary of this allocation. */
	beneficiary?: string | null;
	/** Resolved schedule (amounts, phase, progress, countdowns). */
	schedule: VestingSchedule;
	/** ISO timestamp of the vesting cliff. */
	cliffAt?: string | null;
	/** ISO timestamp at which the allocation is fully vested. */
	endAt?: string | null;
	/** Completed claims, newest first. */
	claims?: KeyVestingClaim[];
	/** Whether a claim transaction is currently being submitted. */
	isClaiming?: boolean;
	/** Submits the claim for the current claimable amount. */
	onClaim?: () => void;
	className?: string;
}

/** Live countdown that ticks once per second while mounted (#1018). */
function useCliffCountdown(
	cliffAt: string | number | null | undefined
): { secondsLeft: number; formatted: string } {
	const [secondsLeft, setSecondsLeft] = useState(() =>
		computeCliffCountdownSeconds(cliffAt)
	);

	useEffect(() => {
		setSecondsLeft(computeCliffCountdownSeconds(cliffAt));
		const interval = setInterval(() => {
			setSecondsLeft(computeCliffCountdownSeconds(cliffAt));
		}, 1000);
		return () => clearInterval(interval);
	}, [cliffAt]);

	return { secondsLeft, formatted: formatCliffCountdown(secondsLeft) };
}

const ClaimHistoryTable: React.FC<{ claims: KeyVestingClaim[] }> = ({
	claims,
}) => (
	<div className="mt-3 overflow-x-auto" data-testid="vesting-card-claim-history">
		<table className="w-full min-w-[24rem] text-left text-sm">
			<thead>
				<tr className="border-b border-white/10 text-[0.65rem] uppercase tracking-[0.18em] text-white/40">
					<th scope="col" className="py-2 pr-4 font-bold">
						Date
					</th>
					<th scope="col" className="py-2 pr-4 font-bold">
						Amount
					</th>
					<th scope="col" className="py-2 font-bold">
						Transaction
					</th>
				</tr>
			</thead>
			<tbody>
				{claims.map(claim => (
					<tr
						key={claim.id}
						className="border-b border-white/5"
						data-testid="vesting-card-history-row"
					>
						<td
							className="py-2 pr-4 font-mono text-xs text-white/70"
							title={new Date(claim.claimedAt).toLocaleString()}
						>
							{formatRelativeTime(claim.claimedAt)}
						</td>
						<td className="py-2 pr-4 font-mono text-xs font-semibold text-emerald-400">
							+{formatXlmPrice(claim.amountXlm)}
						</td>
						<td className="py-2 font-mono text-xs text-white/60">
							{claim.transactionHash}
						</td>
					</tr>
				))}
			</tbody>
		</table>
	</div>
);

/**
 * Vesting schedule card for one creator key position (#1018).
 *
 * Shows the beneficiary, totals, a live cliff countdown accurate to the
 * second during the cliff period, a linear vested-vs-total progress bar once
 * the cliff passes, and the claim action. Completed schedules render in a
 * compact state suitable for the collapsible archive.
 */
export const VestingScheduleCard: React.FC<VestingScheduleCardProps> = ({
	keyId,
	keyName,
	beneficiary,
	schedule,
	cliffAt,
	endAt,
	claims = [],
	isClaiming = false,
	onClaim,
	className,
}) => {
	const { secondsLeft, formatted } = useCliffCountdown(cliffAt);
	const disabledReason = getVestingClaimDisabledReason(schedule);
	const canClaim = disabledReason === null && !isClaiming;
	const inCliff = schedule.phase === 'pre_cliff' && secondsLeft > 0;

	return (
		<div
			className={cn(
				'rounded-2xl border border-white/10 bg-white/[0.03] p-5',
				className
			)}
			data-testid="vesting-card"
			data-key-id={keyId}
			data-phase={schedule.phase}
		>
			{/* Header: key name + beneficiary */}
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h3
					className="font-grotesque text-lg font-bold text-white"
					data-testid="vesting-card-key-name"
				>
					{keyName || `Key ${keyId}`}
				</h3>
				{beneficiary && (
					<p
						className="font-mono text-xs text-white/50"
						data-testid="vesting-card-beneficiary"
						title={beneficiary}
					>
						{beneficiary.slice(0, 4)}…{beneficiary.slice(-4)}
					</p>
				)}
			</div>

			{/* Cliff countdown — accurate to the second while in cliff (#1018) */}
			{inCliff && (
				<div
					className="mt-3 flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2"
					data-testid="vesting-card-cliff-countdown"
					role="timer"
					aria-label="Time until the vesting cliff"
				>
					<Clock className="size-4 shrink-0 text-amber-300" aria-hidden="true" />
					<span className="text-xs uppercase tracking-[0.18em] text-amber-200/70">
						Unlocks in
					</span>
					<span
						className="font-mono text-sm font-bold text-white tabular-nums"
						data-testid="vesting-card-countdown-value"
					>
						{formatted}
					</span>
				</div>
			)}

			<p className="mt-3 text-sm text-white/60" data-testid="vesting-card-phase">
				{describeVestingPhase(schedule)}
			</p>

			{/* Linear progress bar post-cliff: vested vs total (#1018) */}
			<div className="mt-3 space-y-2">
				<div
					className="h-2 w-full rounded-full bg-white/10"
					role="progressbar"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={Math.round(schedule.vestedPercent)}
					aria-label="Percentage of allocation vested"
					data-testid="vesting-card-progress-track"
				>
					<div
						className={cn(
							'h-full rounded-full transition-all duration-500',
							schedule.isFullyVested ? 'bg-emerald-400' : 'bg-amber-400'
						)}
						style={{ width: `${schedule.vestedPercent}%` }}
						data-testid="vesting-card-progress-bar"
					/>
				</div>
				<div className="flex items-center justify-between text-xs">
					<span className="font-mono text-white/70" data-testid="vesting-card-vested">
						{formatXlmPrice(schedule.vestedAmount)} vested
					</span>
					<span
						className="font-mono font-semibold text-white"
						data-testid="vesting-card-percent"
					>
						{formatPercent(schedule.vestedPercent, {
							maximumFractionDigits: 1,
						})}
					</span>
				</div>
			</div>

			{/* Totals */}
			<dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
				<div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
					<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
						Total
					</dt>
					<dd
						className="mt-1 font-mono font-bold text-white"
						data-testid="vesting-card-total"
					>
						{formatXlmPrice(schedule.totalAllocation)}
					</dd>
				</div>
				<div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
					<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
						Claimable
					</dt>
					<dd
						className="mt-1 font-mono font-bold text-white"
						data-testid="vesting-card-claimable"
					>
						{formatXlmPrice(schedule.claimableAmount)}
					</dd>
				</div>
				<div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
					<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
						Claimed
					</dt>
					<dd
						className="mt-1 font-mono font-bold text-white"
						data-testid="vesting-card-claimed"
					>
						{formatXlmPrice(schedule.claimedAmount)}
					</dd>
				</div>
			</dl>

			{/* Claim action */}
			<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				{disabledReason ? (
					<p
						className="flex items-center gap-1.5 text-xs text-white/60"
						data-testid="vesting-card-claim-disabled-reason"
					>
						<Lock className="size-3.5 shrink-0" aria-hidden="true" />
						{disabledReason}
					</p>
				) : (
					<span className="text-xs text-white/40">
						Cliff {formatVestingDate(cliffAt)} · Fully vested{' '}
						{formatVestingDate(endAt)}
					</span>
				)}
				<AsyncButton
					type="button"
					className="rounded-xl"
					data-testid="vesting-card-claim-button"
					disabled={!canClaim}
					isPending={isClaiming}
					pendingText="Claiming…"
					onClick={() => onClaim?.()}
				>
					Claim vested
				</AsyncButton>
			</div>

			{/* Claim history */}
			{claims.length > 0 && (
				<div className="mt-4">
					<h4 className="flex items-center gap-2 text-sm font-bold text-white">
						Claim history
						<Tooltip content="Successful claims are withdrawn to the beneficiary wallet.">
							<span
								className="inline-flex cursor-help text-white/50 hover:text-white/80"
								aria-label="How do vesting claims work?"
							>
								<HelpCircle className="size-3.5" aria-hidden="true" />
							</span>
						</Tooltip>
					</h4>
					<ClaimHistoryTable claims={claims} />
				</div>
			)}
		</div>
	);
};

export default VestingScheduleCard;
