import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Plus, Pause, Play, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { useDcaPlans } from '@/hooks/useDcaPlans';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { DcaPlanModal } from '@/components/common/DcaPlanModal';
import { formatNumber } from '@/utils/numberFormat.utils';
import { Link } from 'react-router';

export default function DcaPlansPage() {
	useDocumentTitle('DCA Recurring Plans — AccessLayer');
	const { address } = useAccount();
	const wallet = address ?? 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI';

	const {
		plans,
		isLoading,
		createPlan,
		pausePlan,
		resumePlan,
		cancelPlan,
	} = useDcaPlans(wallet);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [selectedPlanForHistory, setSelectedPlanForHistory] = useState<string | null>(null);

	const activeSelectedPlan = plans.find((p) => p.id === selectedPlanForHistory) || plans[0] || null;

	const handlePause = (planId: string) => {
		pausePlan(planId);
	};

	const handleResume = (planId: string) => {
		resumePlan(planId);
	};

	const handleCancel = (planId: string) => {
		if (window.confirm('Are you sure you want to cancel this recurring purchase plan?')) {
			cancelPlan(planId);
		}
	};

	return (
		<div className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12" data-testid="dca-plans-page">
			<div className="mx-auto max-w-6xl space-y-8">
				{/* Header */}
				<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<div className="flex items-center gap-2">
							<Link
								to="/portfolio"
								className="text-xs font-semibold text-white/50 hover:text-white transition-colors"
							>
								Portfolio
							</Link>
							<span className="text-white/30">/</span>
							<span className="text-xs font-semibold text-amber-400">DCA Plans</span>
						</div>
						<h1 className="mt-1 font-grotesque text-3xl font-black tracking-tight">
							Dollar-Cost Averaging Plans
						</h1>
						<p className="mt-1 text-sm text-white/60">
							Accumulate creator keys on an automated schedule with keeper execution and built-in slippage guards.
						</p>
					</div>

					<button
						type="button"
						onClick={() => setIsModalOpen(true)}
						className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition-all hover:bg-amber-300"
						data-testid="create-dca-plan-btn"
					>
						<Plus className="h-4 w-4" />
						Create DCA Plan
					</button>
				</header>

				{/* Plans List */}
				{isLoading ? (
					<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-white/50">
						Loading recurring plans…
					</div>
				) : plans.length === 0 ? (
					<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center" data-testid="dca-empty-state">
						<Clock className="mx-auto h-10 w-10 text-white/30" />
						<h3 className="mt-3 font-semibold text-lg text-white">No active DCA plans</h3>
						<p className="mt-1 text-sm text-white/50 max-w-md mx-auto">
							Set up automatic daily, weekly, or monthly recurring purchases to build key positions without timing the market.
						</p>
						<button
							type="button"
							onClick={() => setIsModalOpen(true)}
							className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300"
						>
							<Plus className="h-4 w-4" /> Start your first DCA plan
						</button>
					</div>
				) : (
					<div className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="dca-plans-list">
							{plans.map((plan) => {
								const isAutoPaused = plan.status === 'paused' && plan.consecutiveFailures >= 3;
								const isSelected = activeSelectedPlan?.id === plan.id;

								return (
									<div
										key={plan.id}
										onClick={() => setSelectedPlanForHistory(plan.id)}
										className={`cursor-pointer rounded-2xl border p-5 transition-all ${
											isSelected
												? 'border-amber-400/60 bg-amber-500/[0.04] shadow-lg shadow-amber-500/5'
												: 'border-white/10 bg-white/[0.02] hover:border-white/20'
										}`}
										data-testid={`dca-plan-card-${plan.id}`}
									>
										{/* Auto-pause notice banner (#1470) */}
										{isAutoPaused && (
											<div
												className="mb-3 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300"
												data-testid="dca-auto-paused-banner"
											>
												<AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
												<span>Paused automatically after 3 consecutive failures. Check your wallet balance.</span>
											</div>
										)}

										<div className="flex items-start justify-between">
											<div className="flex items-center gap-3">
												{plan.creatorAvatar ? (
													<img
														src={plan.creatorAvatar}
														alt={plan.creatorName}
														className="h-10 w-10 rounded-full object-cover border border-white/10"
													/>
												) : (
													<div className="h-10 w-10 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center font-bold text-amber-400">
														{plan.creatorName.slice(0, 1)}
													</div>
												)}
												<div>
													<h3 className="font-semibold text-white">{plan.creatorName}</h3>
													<span className="text-xs uppercase tracking-wider text-amber-400/80 font-mono font-medium">
														{plan.frequency} • {plan.amountPerPurchaseXlm} XLM
													</span>
												</div>
											</div>

											{/* Status Badge */}
											<span
												className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
													plan.status === 'active'
														? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
														: plan.status === 'paused'
														? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
														: 'bg-white/10 text-white/50 border border-white/10'
												}`}
												data-testid={`dca-status-badge-${plan.id}`}
											>
												{plan.status}
											</span>
										</div>

										{/* Metrics Grid */}
										<div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/5 pt-3 text-xs">
											<div>
												<span className="text-white/50 block">Next Run Time</span>
												<span className="font-mono font-semibold text-white/90" data-testid={`dca-next-run-${plan.id}`}>
													{new Date(plan.nextRunTime).toLocaleString(undefined, {
														month: 'short',
														day: 'numeric',
														hour: '2-digit',
														minute: '2-digit',
													})}
												</span>
											</div>

											<div>
												<span className="text-white/50 block">Total Invested</span>
												<span className="font-mono font-semibold text-white/90" data-testid={`dca-total-invested-${plan.id}`}>
													{formatNumber(plan.totalInvestedXlm)} XLM
												</span>
											</div>

											<div>
												<span className="text-white/50 block">Keys Accumulated</span>
												<span className="font-mono font-semibold text-white/90" data-testid={`dca-keys-accumulated-${plan.id}`}>
													{formatNumber(plan.totalQuantityBought)}
												</span>
											</div>

											<div>
												<span className="text-white/50 block">Average Price</span>
												<span className="font-mono font-bold text-amber-300" data-testid={`dca-avg-price-${plan.id}`}>
													{plan.averagePriceXlm > 0 ? `${plan.averagePriceXlm.toFixed(2)} XLM` : '—'}
												</span>
											</div>
										</div>

										{/* Actions */}
										<div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
											<span className="text-[11px] text-white/40">
												Max Slippage: {plan.maxSlippagePercent}%
											</span>

											<div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
												{plan.status === 'active' ? (
													<button
														type="button"
														onClick={() => handlePause(plan.id)}
														className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/20"
														data-testid={`pause-plan-btn-${plan.id}`}
													>
														<Pause className="inline h-3 w-3 mr-1" /> Pause
													</button>
												) : plan.status === 'paused' ? (
													<button
														type="button"
														onClick={() => handleResume(plan.id)}
														className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20"
														data-testid={`resume-plan-btn-${plan.id}`}
													>
														<Play className="inline h-3 w-3 mr-1" /> Resume
													</button>
												) : null}

												{plan.status !== 'cancelled' && (
													<button
														type="button"
														onClick={() => handleCancel(plan.id)}
														className="rounded-lg border border-white/10 px-2 py-1 text-xs text-white/40 hover:text-rose-400 hover:border-rose-500/30"
														title="Cancel plan"
														data-testid={`cancel-plan-btn-${plan.id}`}
													>
														<XCircle className="h-3.5 w-3.5" />
													</button>
												)}
											</div>
										</div>
									</div>
								);
							})}
						</div>

						{/* Per-Run History Section (#1470) */}
						{activeSelectedPlan && (
							<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4" data-testid="dca-history-panel">
								<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/5 pb-4">
									<div>
										<h2 className="text-lg font-bold text-white flex items-center gap-2">
											<Clock className="h-5 w-5 text-amber-400" />
											Execution History — {activeSelectedPlan.creatorName}
										</h2>
										<p className="text-xs text-white/50">
											Detailed record of successful and skipped keeper purchase executions.
										</p>
									</div>
									<div className="text-right text-xs">
										<span className="text-white/40">Approved Budget: </span>
										<span className="font-mono font-bold text-amber-300">
											{activeSelectedPlan.approvedBudgetXlm} XLM
										</span>
									</div>
								</div>

								{activeSelectedPlan.runs.length === 0 ? (
									<div className="py-8 text-center text-sm text-white/40" data-testid="no-runs-message">
										No runs recorded yet. The next purchase is scheduled for{' '}
										{new Date(activeSelectedPlan.nextRunTime).toLocaleString()}.
									</div>
								) : (
									<div className="overflow-x-auto">
										<table className="w-full text-left text-xs" data-testid="dca-history-table">
											<thead>
												<tr className="border-b border-white/10 text-white/50">
													<th className="py-2.5 px-3">Date</th>
													<th className="py-2.5 px-3">Status</th>
													<th className="py-2.5 px-3">Quantity</th>
													<th className="py-2.5 px-3">Unit Price</th>
													<th className="py-2.5 px-3">Total Spent</th>
													<th className="py-2.5 px-3">Details / Skip Reason</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-white/5">
												{activeSelectedPlan.runs.map((run) => (
													<tr key={run.id} className="hover:bg-white/[0.01]" data-testid={`dca-run-row-${run.id}`}>
														<td className="py-3 px-3 font-mono text-white/70">
															{new Date(run.timestamp).toLocaleString()}
														</td>
														<td className="py-3 px-3">
															<span
																className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
																	run.status === 'success'
																		? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
																		: run.status === 'skipped'
																		? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
																		: 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
																}`}
																data-testid={`run-status-${run.id}`}
															>
																{run.status}
															</span>
														</td>
														<td className="py-3 px-3 font-mono text-white/90">
															{run.quantity != null ? `${run.quantity} keys` : '—'}
														</td>
														<td className="py-3 px-3 font-mono text-white/90">
															{run.priceXlm != null ? `${run.priceXlm.toFixed(2)} XLM` : '—'}
														</td>
														<td className="py-3 px-3 font-mono text-amber-300 font-semibold">
															{run.spentXlm != null ? `${run.spentXlm.toFixed(2)} XLM` : '—'}
														</td>
														<td className="py-3 px-3 text-white/60">
															{run.skipReason ? (
																<span className="text-amber-300/90 font-medium" data-testid={`run-skip-reason-${run.id}`}>
																	{run.skipReason}
																</span>
															) : run.txHash ? (
																<span className="font-mono text-white/40">
																	Tx: {run.txHash.slice(0, 10)}…
																</span>
															) : (
																'Executed on schedule'
															)}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
							</div>
						)}
					</div>
				)}
			</div>

			<DcaPlanModal
				open={isModalOpen}
				onOpenChange={setIsModalOpen}
				userWallet={wallet}
				onCreatePlan={createPlan}
			/>
		</div>
	);
}
