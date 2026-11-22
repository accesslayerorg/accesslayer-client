import React from 'react';
import Skeleton from '@/components/ui/skeleton';
import { formatXlmPrice } from '@/utils/numberFormat.utils';
import { formatAbsoluteDateTime } from '@/utils/time.utils';
import {
	truncateWalletAddress,
	type ReferralEarningRow,
} from '@/utils/referral.utils';

export interface ReferralEarningsTableProps {
	/** Earning rows, already sorted by date descending. */
	rows: ReferralEarningRow[];
	/** Whether the referred-wallets list backing the rows is loading. */
	isLoading?: boolean;
	className?: string;
}

/**
 * Referral earnings ledger for the referral dashboard (#1119).
 *
 * One row per earned referral fee: the date it was credited, the source
 * wallet (truncated), the referral tier it was earned at, and the amount.
 */
export const ReferralEarningsTable: React.FC<ReferralEarningsTableProps> = ({
	rows,
	isLoading = false,
	className,
}) => {
	if (isLoading) {
		return (
			<section
				className={className}
				data-testid="referral-earnings-table-skeleton"
			>
				<Skeleton className="h-6 w-48" />
				<div className="mt-6 space-y-2">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			</section>
		);
	}

	return (
		<section
			className={className}
			data-testid="referral-earnings-table"
			aria-label="Referral earnings history"
		>
			<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
				Earnings
			</h2>

			{rows.length === 0 ? (
				<p
					className="mt-2 text-sm text-white/55"
					data-testid="referral-earnings-empty"
				>
					No referral earnings yet. Earnings appear here once a
					referred wallet completes its first trade.
				</p>
			) : (
				<div className="mt-4 overflow-x-auto" data-testid="referral-earnings-rows">
					<table className="w-full min-w-[36rem] text-left text-sm">
						<thead>
							<tr className="border-b border-white/10 text-[0.65rem] uppercase tracking-[0.18em] text-white/40">
								<th scope="col" className="py-2 pr-4 font-bold">
									Date
								</th>
								<th scope="col" className="py-2 pr-4 font-bold">
									Source wallet
								</th>
								<th scope="col" className="py-2 pr-4 font-bold">
									Tier
								</th>
								<th scope="col" className="py-2 font-bold">
									Amount
								</th>
							</tr>
						</thead>
						<tbody>
							{rows.map(row => (
								<tr
									key={row.id}
									className="border-b border-white/5"
									data-testid="referral-earning-row"
								>
									<td
										className="py-2 pr-4 text-xs text-white/60"
										title={formatAbsoluteDateTime(row.date) ?? undefined}
										data-testid="referral-earning-date"
									>
										{formatAbsoluteDateTime(row.date) ?? '—'}
									</td>
									<td
										className="py-2 pr-4 font-mono text-xs text-white/70"
										title={row.sourceWallet}
										data-testid="referral-earning-source"
									>
										{truncateWalletAddress(row.sourceWallet)}
									</td>
									<td
										className="py-2 pr-4 text-xs text-white/60"
										data-testid="referral-earning-tier"
									>
										Tier {row.tier}
									</td>
									<td
										className="py-2 font-mono text-xs font-semibold text-emerald-400"
										data-testid="referral-earning-amount"
									>
										{formatXlmPrice(row.amountXlm)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</section>
	);
};

export default ReferralEarningsTable;
