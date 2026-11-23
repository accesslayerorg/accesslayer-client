import React from 'react';
import { ExternalLink, History } from 'lucide-react';
import type { StreamWithdrawal } from '@/types/stream';
import { shortenAddress } from '@/lib/web3/format';

export interface StreamHistoryTableProps {
	withdrawals: StreamWithdrawal[];
}

export const StreamHistoryTable: React.FC<StreamHistoryTableProps> = ({
	withdrawals,
}) => {
	if (!withdrawals || withdrawals.length === 0) {
		return (
			<div
				className="rounded-xl border border-white/5 bg-white/[0.01] p-6 text-center text-xs text-white/40"
				data-testid="withdrawals-empty-state"
			>
				No past withdrawals recorded for this stream.
			</div>
		);
	}

	return (
		<div
			className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden"
			data-testid="stream-history-table"
		>
			<div className="flex items-center gap-2 p-3.5 border-b border-white/10 text-xs font-semibold text-white/80">
				<History className="size-3.5 text-cyan-400" />
				Withdrawal History
			</div>

			<div className="overflow-x-auto">
				<table className="w-full text-left text-xs">
					<thead className="bg-white/[0.03] text-white/50 border-b border-white/5 font-mono">
						<tr>
							<th className="py-2.5 px-4 font-normal">Date & Time</th>
							<th className="py-2.5 px-4 font-normal">Amount</th>
							<th className="py-2.5 px-4 font-normal">Fee</th>
							<th className="py-2.5 px-4 font-normal">Net Payout</th>
							<th className="py-2.5 px-4 font-normal text-right">Transaction</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-white/5 font-mono">
						{withdrawals.map(tx => (
							<tr
								key={tx.id}
								className="hover:bg-white/[0.02] transition-colors"
								data-testid={`withdrawal-row-${tx.id}`}
							>
								<td className="py-2.5 px-4 text-white/70">
									{new Date(tx.timestamp).toLocaleDateString()} ·{' '}
									{new Date(tx.timestamp).toLocaleTimeString([], {
										hour: '2-digit',
										minute: '2-digit',
									})}
								</td>
								<td className="py-2.5 px-4 text-white font-semibold tabular-nums">
									{tx.amountXlm.toFixed(2)} XLM
								</td>
								<td className="py-2.5 px-4 text-white/50 tabular-nums">
									{tx.feeXlm.toFixed(4)} XLM
								</td>
								<td className="py-2.5 px-4 text-emerald-400 font-semibold tabular-nums">
									{tx.netAmountXlm.toFixed(2)} XLM
								</td>
								<td className="py-2.5 px-4 text-right">
									{/* History rows link to correct transactions (#acceptance criteria) */}
									<a
										href={tx.explorerUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
										data-testid={`tx-link-${tx.id}`}
									>
										<span>{shortenAddress(tx.txHash, 6)}</span>
										<ExternalLink className="size-3" />
									</a>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default StreamHistoryTable;
