import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, History, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RebalanceSwap {
	keyName: string;
	direction: 'buy' | 'sell';
	amountSwapped: string;
	price: string;
	resultingAllocation: number;
	txHash: string;
	explorerUrl: string;
}

export interface RebalanceExecution {
	id: string;
	date: string;
	totalSwaps: number;
	totalCost: string;
	swaps: RebalanceSwap[];
}

interface RebalanceHistoryProps {
	executions: RebalanceExecution[];
	className?: string;
}

/**
 * #1181 — Rebalance execution history tab on the portfolio page.
 * Lists past executions with expandable per-key breakdowns.
 */
export function RebalanceHistory({ executions, className }: RebalanceHistoryProps) {
	const [expandedId, setExpandedId] = useState<string | null>(null);

	if (executions.length === 0) {
		return (
			<div className={cn('rounded-xl border border-slate-700 bg-slate-800/50 p-8 text-center', className)}>
				<History className="mx-auto h-8 w-8 text-slate-600" />
				<p className="mt-2 text-sm text-slate-400">No rebalance executions yet.</p>
				<p className="mt-1 text-xs text-slate-500">
					Completed rebalances will appear here with full execution details.
				</p>
			</div>
		);
	}

	return (
		<div className={cn('space-y-2', className)}>
			{executions.map((execution) => {
				const isExpanded = expandedId === execution.id;
				return (
					<div
						key={execution.id}
						className="rounded-xl border border-slate-700 bg-slate-800/50"
					>
						<button
							onClick={() => setExpandedId(isExpanded ? null : execution.id)}
							className="flex w-full items-center justify-between p-4 text-left"
							aria-expanded={isExpanded}
						>
							<div className="flex items-center gap-3">
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
									<ArrowRightLeft className="h-4 w-4 text-blue-500" />
								</div>
								<div>
									<p className="text-sm font-medium text-white">
										{new Date(execution.date).toLocaleDateString()}
									</p>
									<p className="text-xs text-slate-400">
										{execution.totalSwaps} swap{execution.totalSwaps !== 1 ? 's' : ''}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<div className="text-right">
									<p className="text-sm font-medium text-white">{execution.totalCost}</p>
									<p className="text-xs text-slate-500">Total Cost</p>
								</div>
								{isExpanded ? (
									<ChevronUp className="h-4 w-4 text-slate-500" />
								) : (
									<ChevronDown className="h-4 w-4 text-slate-500" />
								)}
							</div>
						</button>

						{isExpanded && (
							<div className="border-t border-slate-700 p-4">
								<table className="w-full text-xs">
									<thead>
										<tr className="text-slate-500">
											<th className="pb-2 text-left font-medium">Key</th>
											<th className="pb-2 text-left font-medium">Direction</th>
											<th className="pb-2 text-right font-medium">Amount</th>
											<th className="pb-2 text-right font-medium">Price</th>
											<th className="pb-2 text-right font-medium">Allocation</th>
											<th className="pb-2 text-right font-medium">Tx</th>
										</tr>
									</thead>
									<tbody>
										{execution.swaps.map((swap, i) => (
											<tr key={i} className="border-t border-slate-700/50">
												<td className="py-1.5 text-white">{swap.keyName}</td>
												<td className="py-1.5">
													<span
														className={cn(
															'rounded px-1.5 py-0.5 text-[10px] font-medium',
															swap.direction === 'buy'
																? 'bg-green-500/10 text-green-400'
																: 'bg-red-500/10 text-red-400',
														)}
													>
														{swap.direction.toUpperCase()}
													</span>
												</td>
												<td className="py-1.5 text-right text-white">{swap.amountSwapped}</td>
												<td className="py-1.5 text-right text-slate-400">{swap.price}</td>
												<td className="py-1.5 text-right text-slate-400">
													{swap.resultingAllocation.toFixed(1)}%
												</td>
												<td className="py-1.5 text-right">
													<a
														href={swap.explorerUrl}
														target="_blank"
														rel="noopener noreferrer"
														className="text-blue-400 hover:text-blue-300"
														aria-label={`View transaction ${swap.txHash}`}
													>
														<ExternalLink className="inline h-3 w-3" />
													</a>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}
