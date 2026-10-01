import { useEffect, useState } from 'react';
import { Clock3, FileSearch, History, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { useTimelockActions } from '@/hooks/useTimelockActions';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import type { TimelockAction } from '@/services/admin.service';

const PANEL_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8';

function timestamp(value?: string): string {
	if (!value) return '—';
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? value
		: date.toLocaleString(undefined, {
				dateStyle: 'medium',
				timeStyle: 'short',
			});
}

function remainingTime(eta: string, now: number): string {
	const etaMs = new Date(eta).getTime();
	if (Number.isNaN(etaMs)) return 'Unavailable';
	const seconds = Math.max(0, Math.floor((etaMs - now) / 1000));
	if (seconds === 0) return 'Ready';
	const days = Math.floor(seconds / 86_400);
	const hours = Math.floor((seconds % 86_400) / 3_600);
	const minutes = Math.floor((seconds % 3_600) / 60);
	const remainder = seconds % 60;
	const clock = [hours, minutes, remainder]
		.map(part => String(part).padStart(2, '0'))
		.join(':');
	return days > 0 ? `${days}d ${clock}` : clock;
}

function paramsSummary(params: unknown): string {
	if (params === null || typeof params !== 'object')
		return String(params ?? 'No parameters');
	const entries = Object.entries(params as Record<string, unknown>);
	if (entries.length === 0) return 'No parameters';
	const summary = entries
		.slice(0, 2)
		.map(
			([key, value]) =>
				`${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`
		)
		.join(' · ');
	return entries.length > 2
		? `${summary} · +${entries.length - 2} more`
		: summary;
}

function isInsideCancellationWindow(
	action: TimelockAction,
	now: number
): boolean {
	if (!action.cancellable || action.status !== 'pending') return false;
	if (!action.cancellationDeadline) return true;
	const deadline = new Date(action.cancellationDeadline).getTime();
	return !Number.isNaN(deadline) && now <= deadline;
}

function ActionStatus({ status }: { status: TimelockAction['status'] }) {
	const styles = {
		pending: 'border-amber-300/25 bg-amber-300/10 text-amber-200',
		executed: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200',
		cancelled: 'border-red-300/25 bg-red-300/10 text-red-200',
	};
	return (
		<span
			className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${styles[status]}`}
		>
			{status}
		</span>
	);
}

function JsonParams({ params }: { params: unknown }) {
	return (
		<pre className="max-h-[50vh] overflow-auto rounded-lg border border-white/10 bg-black/20 p-4 text-left font-mono text-xs leading-5 text-white/80">
			{JSON.stringify(params, null, 2)}
		</pre>
	);
}

export default function TimelockQueuePanel({ isAdmin }: { isAdmin: boolean }) {
	const { address, isConnected } = useStellarWallet();
	const { pending, history, cancel, enabled } = useTimelockActions(
		isAdmin,
		address,
		isConnected
	);
	const [selectedAction, setSelectedAction] = useState<TimelockAction | null>(
		null
	);
	const [now, setNow] = useState(Date.now());

	useEffect(() => {
		if (!pending.data?.length) return;
		const interval = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(interval);
	}, [pending.data?.length]);

	if (!enabled) return null;

	return (
		<section className={PANEL_CLASS} data-testid="timelock-queue-panel">
			<div className="flex items-start justify-between gap-4">
				<div>
					<div className="flex items-center gap-2 text-amber-300">
						<Clock3 className="size-5" aria-hidden="true" />
						<span className="text-xs font-bold uppercase tracking-[0.22em]">
							Protocol safety
						</span>
					</div>
					<h2 className="mt-2 font-grotesque text-2xl font-black">
						Timelock queue
					</h2>
					<p className="mt-2 text-sm leading-6 text-white/55">
						Review scheduled protocol actions and their execution status.
					</p>
				</div>
			</div>

			<div className="mt-7">
				<h3 className="mb-3 font-grotesque text-lg font-bold">
					Pending actions
				</h3>
				{pending.isLoading && (
					<p role="status" className="text-sm text-white/50">
						Loading queued actions…
					</p>
				)}
				{pending.isError && (
					<p
						role="alert"
						className="rounded-lg border border-red-300/20 bg-red-300/5 p-4 text-sm text-red-100"
					>
						The timelock queue could not be loaded. Retry from the
						dashboard refresh.
					</p>
				)}
				{!pending.isLoading &&
					!pending.isError &&
					(pending.data?.length ?? 0) === 0 && (
						<p className="rounded-lg border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/40">
							No protocol actions are waiting in the queue.
						</p>
					)}
				{!pending.isLoading &&
					!pending.isError &&
					(pending.data?.length ?? 0) > 0 && (
						<div className="overflow-x-auto rounded-lg border border-white/10">
							<table className="w-full min-w-[760px] border-collapse text-left text-sm">
								<thead className="bg-white/[0.04] text-xs uppercase text-white/45">
									<tr>
										<th className="px-4 py-3 font-semibold">
											Action
										</th>
										<th className="px-4 py-3 font-semibold">
											Parameters
										</th>
										<th className="px-4 py-3 font-semibold">ETA</th>
										<th className="px-4 py-3 font-semibold">
											Status
										</th>
										<th className="px-4 py-3 text-right font-semibold">
											Manage
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-white/10">
									{pending.data?.map(action => {
										const canCancel =
											isAdmin &&
											isInsideCancellationWindow(action, now);
										return (
											<tr
												key={action.id}
												data-testid={`timelock-action-${action.id}`}
											>
												<td className="px-4 py-4 font-semibold text-white/85">
													{action.type}
												</td>
												<td
													className="max-w-sm truncate px-4 py-4 text-white/55"
													title={paramsSummary(action.params)}
												>
													{paramsSummary(action.params)}
												</td>
												<td
													className="whitespace-nowrap px-4 py-4 font-mono text-amber-200"
													data-testid={`timelock-eta-${action.id}`}
												>
													{remainingTime(action.eta, now)}
												</td>
												<td className="px-4 py-4">
													<ActionStatus
														status={
															new Date(action.eta).getTime() <=
															now
																? 'pending'
																: action.status
														}
													/>
												</td>
												<td className="px-4 py-4">
													<div className="flex justify-end gap-2">
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={() =>
																setSelectedAction(action)
															}
															aria-label={`View ${action.type} details`}
															className="border-white/15 bg-white/5 text-white hover:bg-white/10"
														>
															<FileSearch aria-hidden="true" />
														</Button>
														<Button
															type="button"
															variant="outline"
															size="sm"
															disabled={
																!canCancel || cancel.isPending
															}
															onClick={() =>
																setSelectedAction(action)
															}
															data-testid={`timelock-cancel-${action.id}`}
															className="border-red-300/20 bg-red-300/5 text-red-200 hover:bg-red-300/10"
														>
															{cancel.isPending &&
															cancel.variables === action.id ? (
																<Loader2
																	className="animate-spin"
																	aria-hidden="true"
																/>
															) : (
																<XCircle aria-hidden="true" />
															)}
															Cancel
														</Button>
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
			</div>

			<div className="mt-9 border-t border-white/10 pt-7">
				<div className="mb-3 flex items-center gap-2">
					<History className="size-4 text-white/40" aria-hidden="true" />
					<h3 className="font-grotesque text-lg font-bold">
						Action history
					</h3>
				</div>
				{history.isLoading && (
					<p role="status" className="text-sm text-white/45">
						Loading action history…
					</p>
				)}
				{history.isError && (
					<p role="alert" className="text-sm text-red-200">
						Action history could not be loaded.
					</p>
				)}
				{!history.isLoading &&
					!history.isError &&
					(history.data?.length ?? 0) === 0 && (
						<p className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/35">
							Executed and cancelled actions will appear here.
						</p>
					)}
				{!history.isLoading &&
					!history.isError &&
					(history.data?.length ?? 0) > 0 && (
						<ul
							className="divide-y divide-white/10 rounded-lg border border-white/10"
							aria-label="Timelock action history"
						>
							{history.data?.map(action => (
								<li
									key={action.id}
									className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
								>
									<div className="min-w-0">
										<p className="font-semibold text-white/85">
											{action.type}
										</p>
										<p className="truncate text-xs text-white/40">
											{paramsSummary(action.params)}
										</p>
									</div>
									<div className="flex items-center gap-3">
										<ActionStatus status={action.status} />
										<time
											className="text-xs text-white/45"
											dateTime={
												action.executedAt ??
												action.cancelledAt ??
												action.eta
											}
										>
											{timestamp(
												action.executedAt ??
													action.cancelledAt ??
													action.eta
											)}
										</time>
									</div>
								</li>
							))}
						</ul>
					)}
			</div>

			<Dialog
				open={selectedAction !== null}
				onOpenChange={open => !open && setSelectedAction(null)}
			>
				<DialogContent className="border-white/10 bg-[#091728] text-white sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle className="font-grotesque text-xl font-bold">
							{selectedAction?.type ?? 'Action details'}
						</DialogTitle>
						<DialogDescription className="text-white/50">
							Full queued action parameters and timing.
						</DialogDescription>
					</DialogHeader>
					{selectedAction && (
						<div className="space-y-4">
							<div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/55">
								<span>Queued {timestamp(selectedAction.queuedAt)}</span>
								<span>ETA {timestamp(selectedAction.eta)}</span>
							</div>
							<JsonParams params={selectedAction.params} />
						</div>
					)}
					<DialogFooter>
						{selectedAction &&
							isAdmin &&
							isInsideCancellationWindow(selectedAction, now) && (
								<Button
									type="button"
									variant="outline"
									disabled={cancel.isPending}
									onClick={() =>
										cancel.mutate(selectedAction.id, {
											onSuccess: () => setSelectedAction(null),
										})
									}
									className="border-red-300/20 bg-red-300/5 text-red-200 hover:bg-red-300/10"
								>
									{cancel.isPending ? (
										<Loader2
											className="animate-spin"
											aria-hidden="true"
										/>
									) : (
										<XCircle aria-hidden="true" />
									)}
									{cancel.isPending
										? 'Cancelling…'
										: 'Cancel queued action'}
								</Button>
							)}
						<Button
							type="button"
							variant="outline"
							onClick={() => setSelectedAction(null)}
							className="border-white/15 bg-white/5 text-white"
						>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</section>
	);
}
