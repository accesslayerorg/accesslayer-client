import React from 'react';
import { Link } from 'react-router';
import { Lock, LockOpen, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	formatLockCountdown,
	formatLpAmount,
	formatPoolShare,
	resolveLpLockState,
	type LpLockState,
} from '@/utils/lpPositions.utils';
import type { LpPosition } from '@/services/lpPositions.service';
import { cn } from '@/lib/utils';

export interface LpPositionsListProps {
	positions: LpPosition[];
	/** Shared clock (see `useNowMs`) so every countdown ticks together. */
	nowMs: number;
	/** Whether the viewer can sign for these positions; hides actions if not. */
	canTransact: boolean;
	/** `lpId` of a claim in flight, if any. */
	claimingLpId?: string | null;
	/** `lpId` of a removal in flight, if any. */
	removingLpId?: string | null;
	/** Disables all actions while any LP transaction is in flight. */
	isBusy?: boolean;
	onAddLiquidity?: (position: LpPosition) => void;
	onClaim?: (position: LpPosition) => void;
	onRemove?: (position: LpPosition) => void;
	className?: string;
}

function LockBadge({ lpId, lock }: { lpId: string; lock: LpLockState }) {
	if (lock.status === 'locked') {
		return (
			<span
				data-testid={`lp-lock-status-${lpId}`}
				className="inline-flex max-w-full items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300"
			>
				<Lock className="size-3 shrink-0" aria-hidden="true" />
				<span className="truncate">
					Locked · {formatLockCountdown(lock.remainingSeconds)} remaining
				</span>
			</span>
		);
	}
	if (lock.status === 'invalid') {
		return (
			<span
				data-testid={`lp-lock-status-${lpId}`}
				className="inline-flex items-center gap-1 rounded-full bg-rose-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-300"
			>
				<AlertTriangle className="size-3" aria-hidden="true" />
				Lock unknown
			</span>
		);
	}
	return (
		<span
			data-testid={`lp-lock-status-${lpId}`}
			className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300"
		>
			<LockOpen className="size-3" aria-hidden="true" />
			{lock.status === 'unlocked' ? 'Unlocked' : 'No lock'}
		</span>
	);
}

function Field({
	label,
	children,
	testId,
	className,
}: {
	label: string;
	children: React.ReactNode;
	testId: string;
	className?: string;
}) {
	return (
		<div className={cn('min-w-0', className)}>
			<dt className="text-[10px] font-bold uppercase tracking-widest text-white/30">
				{label}
			</dt>
			<dd
				data-testid={testId}
				className="mt-1 break-all font-mono text-sm text-white/85"
			>
				{children}
			</dd>
		</div>
	);
}

/**
 * Active LP positions for the portfolio Liquidity tab (#1030).
 *
 * Purely presentational: the caller supplies positions, the clock, and
 * action handlers, so lock transitions and button states are deterministic
 * in tests. A locked position's Remove button stays disabled with a live
 * countdown until the lock expires.
 */
const LpPositionsList: React.FC<LpPositionsListProps> = ({
	positions,
	nowMs,
	canTransact,
	claimingLpId = null,
	removingLpId = null,
	isBusy = false,
	onAddLiquidity,
	onClaim,
	onRemove,
	className,
}) => (
	<ul
		aria-label="Liquidity positions"
		data-testid="lp-positions-list"
		className={cn('space-y-3', className)}
	>
		{positions.map(position => {
			const lock = resolveLpLockState(position.lock, nowMs);
			const pending = position.pendingRewardsStroops;
			const canClaim = pending != null && pending > 0n;
			const isClaiming = claimingLpId === position.lpId;
			const isRemoving = removingLpId === position.lpId;
			const removeHintId = `lp-remove-hint-${position.lpId}`;

			return (
				<li
					key={position.lpId}
					data-testid={`lp-position-${position.lpId}`}
					className="rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/20"
				>
					<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
						<div className="min-w-0 lg:w-56">
							{position.creatorId ? (
								<Link
									to={`/creator/${position.creatorId}`}
									className="block truncate text-sm font-semibold text-white transition-colors hover:text-amber-300"
									title={position.keyName}
								>
									{position.keyName}
								</Link>
							) : (
								<p
									className="truncate text-sm font-semibold text-white"
									title={position.keyName}
								>
									{position.keyName}
								</p>
							)}
							<div className="mt-1 flex flex-wrap items-center gap-2">
								<span className="text-[11px] text-white/40">
									Position #{position.lpId}
								</span>
								<LockBadge lpId={position.lpId} lock={lock} />
							</div>
						</div>

						<dl className="grid flex-1 grid-cols-1 gap-3 min-[420px]:grid-cols-3 lg:max-w-2xl">
							<Field
								label="Contributed"
								testId={`lp-contribution-${position.lpId}`}
							>
								{formatLpAmount(position.contributionStroops)}
							</Field>
							<Field
								label="Pool share"
								testId={`lp-share-${position.lpId}`}
							>
								{formatPoolShare(position)}
							</Field>
							<Field
								label="Accrued rewards"
								testId={`lp-rewards-${position.lpId}`}
							>
								<span
									className={
										pending == null
											? 'text-white/45'
											: 'text-emerald-300'
									}
								>
									{pending == null
										? 'Unavailable'
										: formatLpAmount(pending)}
								</span>
							</Field>
						</dl>

						{canTransact && (
							<div className="flex flex-wrap gap-2 lg:flex-nowrap lg:justify-end">
								<Button
									type="button"
									size="xs"
									variant="outline"
									className="rounded-lg"
									disabled={isBusy}
									onClick={() => onAddLiquidity?.(position)}
									data-testid={`lp-add-${position.lpId}`}
								>
									Add liquidity
								</Button>
								<Button
									type="button"
									size="xs"
									className="rounded-lg"
									disabled={isBusy || !canClaim}
									onClick={() => onClaim?.(position)}
									title={
										canClaim ? undefined : 'No rewards to claim yet'
									}
									data-testid={`lp-claim-${position.lpId}`}
								>
									{isClaiming ? 'Claiming…' : 'Claim rewards'}
								</Button>
								<Button
									type="button"
									size="xs"
									variant="outline"
									className="rounded-lg"
									disabled={isBusy || !lock.canRemove}
									aria-describedby={
										lock.canRemove ? undefined : removeHintId
									}
									onClick={() => onRemove?.(position)}
									data-testid={`lp-remove-${position.lpId}`}
								>
									{isRemoving ? 'Removing…' : 'Remove liquidity'}
								</Button>
								{!lock.canRemove && (
									<span id={removeHintId} className="sr-only">
										{lock.status === 'locked'
											? `Removal unlocks in ${formatLockCountdown(lock.remainingSeconds)}.`
											: 'Removal is disabled because the lock period could not be verified.'}
									</span>
								)}
							</div>
						)}
					</div>
				</li>
			);
		})}
	</ul>
);

export default LpPositionsList;
