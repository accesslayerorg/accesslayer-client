import React from 'react';
import type { AmbassadorPayout } from '@/types/ambassador.types';
import { getPayoutExplorerUrl } from '@/utils/ambassador.utils';
import { ExternalLink, CheckCircle2, Clock, Coins } from 'lucide-react';

export interface PayoutsTableProps {
	payouts: AmbassadorPayout[];
	network?: 'public' | 'testnet';
}

export const PayoutsTable: React.FC<PayoutsTableProps> = ({
	payouts,
	network = 'public',
}) => {
	if (payouts.length === 0) {
		return (
			<div className="py-8 text-center text-xs text-white/40" data-testid="payouts-empty">
				No payout records yet.
			</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full text-left text-xs" data-testid="payouts-table">
				<thead>
					<tr className="border-b border-white/10 text-white/50">
						<th className="py-2.5 px-3">Date</th>
						<th className="py-2.5 px-3">Tier</th>
						<th className="py-2.5 px-3">Amount</th>
						<th className="py-2.5 px-3">Status</th>
						<th className="py-2.5 px-3 text-right">Explorer</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-white/5">
					{payouts.map((payout) => {
						const explorerUrl = getPayoutExplorerUrl(payout.txHash, network);
						return (
							<tr key={payout.id} className="hover:bg-white/[0.01]" data-testid={`payout-row-${payout.id}`}>
								<td className="py-3 px-3 font-mono text-white/70">
									{new Date(payout.date).toLocaleDateString()}
								</td>
								<td className="py-3 px-3 font-medium text-white/90">
									{payout.tierName}
								</td>
								<td className="py-3 px-3 font-mono font-bold text-amber-300">
									{payout.amountXlm.toFixed(2)} XLM
								</td>
								<td className="py-3 px-3">
									<span
										className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
											payout.status === 'paid'
												? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
												: payout.status === 'pending'
												? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
												: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
										}`}
										data-testid={`payout-status-${payout.id}`}
									>
										{payout.status === 'paid' && <CheckCircle2 className="h-3 w-3" />}
										{payout.status === 'pending' && <Clock className="h-3 w-3" />}
										{payout.status === 'earned' && <Coins className="h-3 w-3" />}
										{payout.status}
									</span>
								</td>
								<td className="py-3 px-3 text-right">
									{explorerUrl ? (
										<a
											href={explorerUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1 text-amber-300 hover:underline font-mono"
											data-testid={`payout-explorer-link-${payout.id}`}
										>
											View Tx <ExternalLink className="h-3 w-3" />
										</a>
									) : (
										<span className="text-white/30">—</span>
									)}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};

export default PayoutsTable;
