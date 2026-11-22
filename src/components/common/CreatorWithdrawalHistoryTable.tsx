import React from 'react';
import { ExternalLink, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import Skeleton from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/utils/time.utils';
import { formatXlmPrice } from '@/utils/numberFormat.utils';
import { buildStellarExpertTxUrl, truncateTxHash } from '@/constants/stellar';
import { env } from '@/utils/env.utils';
import type { CreatorWithdrawalRecord } from '@/types/creatorRevenue';

export interface CreatorWithdrawalHistoryTableProps {
	withdrawals?: CreatorWithdrawalRecord[];
	isLoading?: boolean;
	className?: string;
}

export const CreatorWithdrawalHistoryTable: React.FC<
	CreatorWithdrawalHistoryTableProps
> = ({ withdrawals = [], isLoading = false, className }) => {
	if (isLoading) {
		return (
			<div
				className={className}
				data-testid="withdrawal-history-skeleton"
				aria-busy="true"
			>
				<Skeleton className="h-6 w-48 mb-4" />
				<div className="space-y-3">
					<Skeleton className="h-14 w-full rounded-xl" />
					<Skeleton className="h-14 w-full rounded-xl" />
					<Skeleton className="h-14 w-full rounded-xl" />
				</div>
			</div>
		);
	}

	return (
		<div className={className} data-testid="creator-withdrawal-history">
			<div className="mb-4 flex items-center justify-between">
				<div>
					<h3 className="font-grotesque text-xl font-black tracking-tight text-white">
						Withdrawal History
					</h3>
					<p className="mt-1 text-xs text-white/50">
						Past claims and transaction confirmations
					</p>
				</div>
				{withdrawals.length > 0 && (
					<span
						className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-mono text-white/60"
						data-testid="withdrawal-count-badge"
					>
						{withdrawals.length} withdrawal
						{withdrawals.length === 1 ? '' : 's'}
					</span>
				)}
			</div>

			{withdrawals.length === 0 ? (
				<div
					className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 p-8 text-center"
					data-testid="withdrawal-history-empty"
				>
					<p className="font-semibold text-white/80">No withdrawals yet</p>
					<p className="mt-1 text-xs text-white/45 max-w-sm">
						When you claim your creator revenue proceeds, your transaction
						details and explorer links will appear here.
					</p>
				</div>
			) : (
				<div className="overflow-x-auto">
					<table
						className="w-full text-left border-collapse"
						data-testid="withdrawal-history-table"
					>
						<thead>
							<tr className="border-b border-white/10 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-white/40">
								<th className="pb-3 pl-2">Date / Time</th>
								<th className="pb-3 px-4">Amount</th>
								<th className="pb-3 px-4">Transaction Hash</th>
								<th className="pb-3 pr-2 text-right">Status</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-white/[0.05] text-sm">
							{withdrawals.map(record => {
								const network = env.VITE_STELLAR_NETWORK;
								const txUrl = buildStellarExpertTxUrl(
									record.transactionHash,
									network
								);
								const truncatedHash = truncateTxHash(
									record.transactionHash
								);

								return (
									<tr
										key={record.id}
										className="group transition-colors hover:bg-white/[0.02]"
										data-testid="withdrawal-history-row"
									>
										<td className="py-3.5 pl-2">
											<div className="flex flex-col">
												<span
													className="font-medium text-white/90"
													data-testid="withdrawal-history-date"
													title={new Date(
														record.timestamp
													).toLocaleString()}
												>
													{formatRelativeTime(record.timestamp)}
												</span>
												<span className="text-[0.7rem] text-white/40 font-mono">
													{new Date(
														record.timestamp
													).toLocaleDateString(undefined, {
														year: 'numeric',
														month: 'short',
														day: 'numeric',
													})}
												</span>
											</div>
										</td>

										<td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
											<span data-testid="withdrawal-history-amount">
												+{formatXlmPrice(record.amount)}
											</span>
										</td>

										<td className="py-3.5 px-4">
											<a
												href={txUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex items-center gap-1.5 font-mono text-xs text-white/70 transition-colors hover:text-emerald-300"
												data-testid="withdrawal-history-tx-link"
											>
												<span>{truncatedHash}</span>
												<ExternalLink
													className="size-3.5 text-white/40 group-hover:text-emerald-300"
													aria-hidden="true"
												/>
											</a>
										</td>

										<td className="py-3.5 pr-2 text-right">
											{record.status === 'confirmed' ? (
												<span
													className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-400/20"
													data-testid="withdrawal-status-confirmed"
												>
													<CheckCircle2
														className="size-3"
														aria-hidden="true"
													/>
													Confirmed
												</span>
											) : record.status === 'pending' ? (
												<span
													className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-400/20"
													data-testid="withdrawal-status-pending"
												>
													<Clock
														className="size-3 animate-spin"
														aria-hidden="true"
													/>
													Pending
												</span>
											) : (
												<span
													className="inline-flex items-center gap-1 rounded-full bg-red-400/10 px-2.5 py-0.5 text-xs font-semibold text-red-400 border border-red-400/20"
													data-testid="withdrawal-status-failed"
												>
													<AlertCircle
														className="size-3"
														aria-hidden="true"
													/>
													Failed
												</span>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
};

export default CreatorWithdrawalHistoryTable;
