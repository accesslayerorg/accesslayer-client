import React from 'react';
import { AlertTriangle, HelpCircle, Lock } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import Skeleton from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AsyncButton } from '@/components/ui/async-button';
import { formatXlmPrice, formatPercent } from '@/utils/numberFormat.utils';
import { formatRelativeTime } from '@/utils/time.utils';
import { buildStellarExpertTxUrl, truncateTxHash } from '@/constants/stellar';
import { env } from '@/utils/env.utils';
import type { KeyVestingClaim } from '@/services/course.service';
import {
	describeVestingPhase,
	formatVestingDate,
	getVestingClaimDisabledReason,
	type VestingSchedule,
} from '@/utils/vestingSchedule.utils';

export const VESTING_PANEL_EXPLANATION =
	'Your creator allocation is released on a cliff-then-linear schedule. Nothing unlocks until the cliff date; after that, the vested amount ramps up evenly until the vesting end date, when the full allocation is available. Claimed tokens are withdrawn to your creator wallet.';

export interface VestingSchedulePanelProps {
	/** Resolved schedule (vested/claimable amounts, phase, progress). */
	schedule: VestingSchedule;
	/** ISO timestamp of the vesting cliff, rendered on the timeline. */
	cliffAt?: string | null;
	/** ISO timestamp at which the allocation is fully vested. */
	endAt?: string | null;
	/** Completed claims, newest first. */
	claims: KeyVestingClaim[];
	/** Whether either vesting query is still in flight. */
	isLoading?: boolean;
	/** Whether the vesting queries failed. */
	isError?: boolean;
	/** Whether a claim transaction is currently being submitted. */
	isClaiming?: boolean;
	/** Submits the claim for the current claimable amount. */
	onClaim?: () => void;
	className?: string;
}

const PROGRESS_TRACK_CLASS = 'h-2 w-full rounded-full bg-white/10';

/**
 * Vesting schedule panel for a creator's key allocation (#960).
 *
 * Renders the cliff-to-end timeline with a progress bar, the claimable
 * amount with its Claim action, and the history of completed claims. The
 * panel is only mounted for the key's registered creator — see
 * `CreatorDashboardPage`, which gates it on the connected wallet matching the
 * key's creator address.
 */
export const VestingSchedulePanel: React.FC<VestingSchedulePanelProps> = ({
	schedule,
	cliffAt,
	endAt,
	claims,
	isLoading = false,
	isError = false,
	isClaiming = false,
	onClaim,
	className,
}) => {
	if (isLoading) {
		return (
			<div
				className={cn('space-y-4', className)}
				data-testid="vesting-panel-loading"
			>
				<Skeleton className="h-5 w-56" />
				<Skeleton className="h-2 w-full" />
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
			</div>
		);
	}

	if (isError) {
		return (
			<div
				role="alert"
				className={cn(
					'flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200',
					className
				)}
				data-testid="vesting-panel-error"
			>
				<AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
				<p>
					We couldn&apos;t load your vesting schedule. Please refresh and
					try again.
				</p>
			</div>
		);
	}

	const disabledReason = getVestingClaimDisabledReason(schedule);
	const canClaim = disabledReason === null && !isClaiming;

	return (
		<div
			className={cn('space-y-6', className)}
			data-testid="vesting-schedule-panel"
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-sm text-white/60" data-testid="vesting-phase">
					{describeVestingPhase(schedule)}
				</p>
				<span
					className="font-mono text-sm font-semibold text-white"
					data-testid="vesting-progress-percent"
				>
					{formatPercent(schedule.vestedPercent, {
						maximumFractionDigits: 1,
					})}{' '}
					vested
				</span>
			</div>

			{/* Vesting timeline: cliff date -> vesting end date, with progress */}
			<div
				className="space-y-3"
				data-testid="vesting-timeline"
				aria-label="Vesting timeline"
			>
				<div className="flex items-center justify-between gap-3 text-xs">
					<div>
						<p className="font-bold uppercase tracking-[0.18em] text-white/40">
							Cliff
						</p>
						<p
							className="mt-0.5 font-mono text-white/90"
							data-testid="vesting-cliff-date"
						>
							{formatVestingDate(cliffAt)}
						</p>
					</div>
					<div className="text-right">
						<p className="font-bold uppercase tracking-[0.18em] text-white/40">
							Fully vested
						</p>
						<p
							className="mt-0.5 font-mono text-white/90"
							data-testid="vesting-end-date"
						>
							{formatVestingDate(endAt)}
						</p>
					</div>
				</div>

				<div
					className={PROGRESS_TRACK_CLASS}
					role="progressbar"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={Math.round(schedule.vestedPercent)}
					aria-label="Percentage of allocation vested"
				>
					<div
						className={cn(
							'h-full rounded-full transition-all duration-500',
							schedule.isFullyVested ? 'bg-emerald-400' : 'bg-amber-400'
						)}
						style={{ width: `${schedule.vestedPercent}%` }}
						data-testid="vesting-progress-bar"
					/>
				</div>
			</div>

			<dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
					<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
						Total allocation
					</dt>
					<dd
						className="mt-1 font-mono font-bold text-white"
						data-testid="vesting-total-allocation"
					>
						{formatXlmPrice(schedule.totalAllocation)}
					</dd>
				</div>
				<div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
					<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
						Vested
					</dt>
					<dd
						className="mt-1 font-mono font-bold text-white"
						data-testid="vesting-vested-amount"
					>
						{formatXlmPrice(schedule.vestedAmount)}
					</dd>
				</div>
				<div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
					<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
						Already claimed
					</dt>
					<dd
						className="mt-1 font-mono font-bold text-white"
						data-testid="vesting-claimed-amount"
					>
						{formatXlmPrice(schedule.claimedAmount)}
					</dd>
				</div>
			</dl>

			{/* Claimable amount + claim action */}
			<div className="flex flex-col gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-amber-200/70">
						Claimable now
					</p>
					<p
						className="mt-1 font-mono text-xl font-bold text-white"
						data-testid="vesting-claimable-amount"
					>
						{formatXlmPrice(schedule.claimableAmount)}
					</p>
					{disabledReason && (
						<p
							className="mt-1 flex items-center gap-1.5 text-xs text-white/60"
							data-testid="vesting-claim-disabled-reason"
						>
							<Lock className="size-3.5 shrink-0" aria-hidden="true" />
							{disabledReason}
						</p>
					)}
				</div>
				<AsyncButton
					type="button"
					className="rounded-xl"
					data-testid="vesting-claim-button"
					disabled={!canClaim}
					isPending={isClaiming}
					pendingText="Claiming…"
					onClick={() => onClaim?.()}
				>
					Claim vested tokens
				</AsyncButton>
			</div>

			{/* Claim history */}
			<div>
				<h3 className="flex items-center gap-2 font-grotesque text-lg font-bold text-white">
					Claim history
					<Tooltip content={VESTING_PANEL_EXPLANATION}>
						<span
							className="inline-flex cursor-help text-white/50 hover:text-white/80"
							data-testid="vesting-tooltip-trigger"
							aria-label="How does creator vesting work?"
						>
							<HelpCircle className="size-4" aria-hidden="true" />
						</span>
					</Tooltip>
				</h3>

				{claims.length === 0 ? (
					<p
						className="mt-2 text-sm text-white/55"
						data-testid="vesting-history-empty"
					>
						No claims yet. Successful claims will appear here with their
						transaction hash.
					</p>
				) : (
					<div
						className="mt-4 overflow-x-auto"
						data-testid="vesting-claim-history"
					>
						<table className="w-full min-w-[32rem] text-left text-sm">
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
										data-testid="vesting-history-row"
									>
										<td
											className="py-2 pr-4 font-mono text-xs text-white/70"
											title={new Date(claim.claimedAt).toLocaleString()}
											data-testid="vesting-history-date"
										>
											{formatRelativeTime(claim.claimedAt)}
										</td>
										<td
											className="py-2 pr-4 font-mono text-xs font-semibold text-emerald-400"
											data-testid="vesting-history-amount"
										>
											+{formatXlmPrice(claim.amountXlm)}
										</td>
										<td className="py-2">
											<a
												href={buildStellarExpertTxUrl(
													claim.transactionHash,
													env.VITE_STELLAR_NETWORK
												)}
												target="_blank"
												rel="noopener noreferrer"
												className="font-mono text-xs text-white/60 hover:text-white"
												data-testid="vesting-history-tx"
											>
												{truncateTxHash(claim.transactionHash)}
											</a>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
};

export default VestingSchedulePanel;
