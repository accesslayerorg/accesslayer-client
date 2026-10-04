import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Lock } from 'lucide-react';
import Skeleton from '@/components/ui/skeleton';
import { AsyncButton } from '@/components/ui/async-button';
import { cn } from '@/lib/utils';
import { bpsToPercent, formatPercent } from '@/utils/numberFormat.utils';
import {
	canExecuteCurveMigration,
	formatCurveMigrationCountdown,
	formatCurveMigrationDate,
	getCurveMigrationApprovalPercent,
	getCurveMigrationExecuteDisabledReason,
	getCurveMigrationParticipationPercent,
	getCurveMigrationTimelockRemainingMs,
	getCurveParamChanges,
	isCurveMigrationVoteApproved,
	type CurveParamChange,
} from '@/utils/curveMigration.utils';
import type {
	CurveMigration,
	CurveMigrationParams,
} from '@/types/curveMigration';

/** Countdown refresh rate — a second is the resolution the label shows. */
const COUNTDOWN_TICK_MS = 1_000;

export interface CurveMigrationPanelProps {
	/** Pending and executed migrations for the key, in any order. */
	migrations: CurveMigration[];
	/** Whether the migrations query is still in flight. */
	isLoading?: boolean;
	/** Whether the migrations query failed. */
	isError?: boolean;
	/** Id of the migration currently being executed, for its pending state. */
	executingMigrationId?: string | null;
	/** Submits the `execute_curve_migration` call for a migration id. */
	onExecute: (migrationId: string) => void;
	className?: string;
}

/**
 * Renders the `from → to` diff between the live curve and the proposed one.
 * Unchanged parameters are dimmed so the creator sees what actually moves.
 */
const CurveParamDiffList: React.FC<{
	migrationId: string;
	current: CurveMigrationParams | null | undefined;
	proposed: CurveMigrationParams | null | undefined;
	testId: string;
}> = ({ migrationId, current, proposed, testId }) => (
	<dl className="mt-3 space-y-2" data-testid={testId}>
		{getCurveParamChanges(current, proposed).map((change: CurveParamChange) => (
			<div
				key={change.field}
				className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
				data-testid={`curve-migration-param-${migrationId}-${change.field}`}
				data-changed={change.changed ? 'true' : 'false'}
			>
				<dt className="text-white/50">{change.label}</dt>
				<dd
					className={cn(
						'font-mono',
						change.changed ? 'text-amber-300' : 'text-white/35'
					)}
				>
					{change.from}
					{change.changed && (
						<span aria-hidden="true" className="mx-1.5">
							→
						</span>
					)}
					<span>{change.to}</span>
				</dd>
			</div>
		))}
	</dl>
);

/**
 * Curve migration management for the creator dashboard.
 *
 * Pending migrations show the proposed parameter diff, the live timelock
 * countdown, and the governance vote tally; the Execute action is enabled only
 * once the vote carried the migration *and* the timelock has elapsed. Executed
 * migrations are listed underneath with the params they applied and the date
 * they were applied.
 *
 * The panel is creator-only — see `CreatorDashboardPage`, which gates it on the
 * connected wallet matching the key's creator address.
 */
export const CurveMigrationPanel: React.FC<CurveMigrationPanelProps> = ({
	migrations,
	isLoading = false,
	isError = false,
	executingMigrationId = null,
	onExecute,
	className,
}) => {
	const [now, setNow] = useState(() => Date.now());
	const list = Array.isArray(migrations) ? migrations : [];
	const pending = list.filter(migration => migration.status === 'pending');
	const hasCountdown = pending.some(
		migration => getCurveMigrationTimelockRemainingMs(migration, now) > 0
	);

	// Tick only while a timelock is actually running so the countdown stays
	// live without re-rendering the panel for the whole page session.
	useEffect(() => {
		if (!hasCountdown) return;
		const id = window.setInterval(
			() => setNow(Date.now()),
			COUNTDOWN_TICK_MS
		);
		return () => window.clearInterval(id);
	}, [hasCountdown]);

	if (isLoading) {
		return (
			<div
				className={cn('space-y-4', className)}
				data-testid="curve-migration-panel-loading"
			>
				<Skeleton className="h-5 w-56" />
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
				<Skeleton className="h-28 w-full" />
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
				data-testid="curve-migration-panel-error"
			>
				<AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
				<p>
					We couldn&apos;t load your curve migrations. Please refresh and try
					again.
				</p>
			</div>
		);
	}

	if (list.length === 0) {
		return (
			<div
				className={cn(
					'rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/55',
					className
				)}
				data-testid="curve-migration-panel-empty"
			>
				No curve migrations yet. A migration proposal will appear here with
				its proposed pricing, vote status, and timelock.
			</div>
		);
	}

	return (
		<div className={cn('space-y-8', className)} data-testid="curve-migration-panel">
			{pending.length > 0 && (
				<section
					className="space-y-4"
					data-testid="curve-migration-pending-section"
				>
					<h3 className="font-grotesque text-lg font-bold text-white">
						Pending migrations
					</h3>

					{pending.map(migration => {
						const remainingMs = getCurveMigrationTimelockRemainingMs(
							migration,
							now
						);
						const canExecute = canExecuteCurveMigration(migration, now);
						const disabledReason = getCurveMigrationExecuteDisabledReason(
							migration,
							now
						);
						const isExecuting = executingMigrationId === migration.id;

						return (
							<article
								key={migration.id}
								className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-5"
								data-testid={`curve-migration-pending-${migration.id}`}
							>
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div>
										<h4 className="font-grotesque text-base font-bold text-white">
											{migration.title}
										</h4>
										{migration.description && (
											<p className="mt-1 text-xs text-white/55">
												{migration.description}
											</p>
										)}
									</div>
									<span
										className={cn(
											'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold',
											canExecute
												? 'bg-emerald-400/15 text-emerald-300'
												: 'bg-white/[0.08] text-white/60'
										)}
										data-testid={`curve-migration-status-${migration.id}`}
									>
										{canExecute ? (
											<CheckCircle2
												className="size-3.5"
												aria-hidden="true"
											/>
										) : (
											<Clock className="size-3.5" aria-hidden="true" />
										)}
										{canExecute ? 'Ready to execute' : 'Pending'}
									</span>
								</div>

								<CurveParamDiffList
									migrationId={migration.id}
									current={migration.currentParams}
									proposed={migration.proposedParams}
									testId={`curve-migration-params-${migration.id}`}
								/>

								{/* Timelock + governance vote status */}
								<dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
									<div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
										<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
											Timelock
										</dt>
										<dd
											className="mt-1 font-mono font-bold text-white"
											role="status"
											aria-live="polite"
											data-testid={`curve-migration-timelock-${migration.id}`}
										>
											{formatCurveMigrationCountdown(remainingMs)}
										</dd>
									</div>
									<div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
										<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
											Vote approval
										</dt>
										<dd
											className="mt-1 font-mono font-bold text-white"
											data-testid={`curve-migration-vote-approval-${migration.id}`}
										>
											{formatPercent(
												getCurveMigrationApprovalPercent(migration),
												{ maximumFractionDigits: 1 }
											)}
										</dd>
									</div>
									<div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
										<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
											Vote status
										</dt>
										<dd
											className="mt-1 text-sm font-bold text-white"
											data-testid={`curve-migration-vote-status-${migration.id}`}
										>
											{isCurveMigrationVoteApproved(migration)
												? 'Approved'
												: 'Not approved'}
										</dd>
										<dd
											className="mt-0.5 text-xs text-white/45"
											data-testid={`curve-migration-vote-quorum-${migration.id}`}
										>
											Quorum {bpsToPercent(migration.quorumBps)} ·{' '}
											{formatPercent(
												getCurveMigrationParticipationPercent(migration),
												{ maximumFractionDigits: 1 }
											)}{' '}
											participation
										</dd>
									</div>
								</dl>

								<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
									{disabledReason ? (
										<p
											className="flex items-center gap-1.5 text-xs text-white/60"
											data-testid={`curve-migration-disabled-reason-${migration.id}`}
										>
											<Lock className="size-3.5 shrink-0" aria-hidden="true" />
											{disabledReason}
										</p>
									) : (
										<p className="text-xs text-emerald-300/80">
											Vote carried and timelock elapsed — this migration
											can be applied.
										</p>
									)}
									<AsyncButton
										type="button"
										className="rounded-xl"
										data-testid={`curve-migration-execute-${migration.id}`}
										disabled={!canExecute}
										isPending={isExecuting}
										pendingText="Executing…"
										onClick={() => onExecute(migration.id)}
									>
										Execute migration
									</AsyncButton>
								</div>
							</article>
						);
					})}
				</section>
			)}

			{/* Executed history — applied params and execution date */}
			{list.some(migration => migration.status === 'executed') && (
				<section className="space-y-4" data-testid="curve-migration-history-section">
					<h3 className="font-grotesque text-lg font-bold text-white">
						Executed migrations
					</h3>
					{list
						.filter(migration => migration.status === 'executed')
						.map(migration => (
							<article
								key={migration.id}
								className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
								data-testid={`curve-migration-history-${migration.id}`}
							>
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div>
										<h4 className="font-grotesque text-base font-bold text-white">
											{migration.title}
										</h4>
										<p
											className="mt-1 text-xs text-white/50"
											data-testid={`curve-migration-executed-at-${migration.id}`}
										>
											Executed {formatCurveMigrationDate(migration.executedAt)}
										</p>
									</div>
									<span
										className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300"
										data-testid={`curve-migration-history-status-${migration.id}`}
									>
										Executed
									</span>
								</div>
								<CurveParamDiffList
									migrationId={migration.id}
									current={migration.currentParams}
									proposed={migration.proposedParams}
									testId={`curve-migration-history-params-${migration.id}`}
								/>
							</article>
						))}
				</section>
			)}
		</div>
	);
};

export default CurveMigrationPanel;
