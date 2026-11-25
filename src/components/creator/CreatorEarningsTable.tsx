import React from 'react';
import Skeleton from '@/components/ui/skeleton';
import { formatXlmPrice } from '@/utils/numberFormat.utils';
import { EARNINGS_STREAM_LABELS } from '@/utils/creatorEarnings.utils';
import type { CreatorEarningsRecord } from '@/types/creatorEarnings';

export interface CreatorEarningsTableProps {
	records?: CreatorEarningsRecord[];
	isLoading?: boolean;
	className?: string;
}

const formatRecordDate = (value: string) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return date.toLocaleDateString();
};

/**
 * Per-stream earnings breakdown: one row per earning with its date, source
 * stream, amount, and claim status (#1258).
 */
export const CreatorEarningsTable: React.FC<CreatorEarningsTableProps> = ({
	records = [],
	isLoading = false,
	className,
}) => {
	return (
		<section
			className={`rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8 ${className ?? ''}`}
			data-testid="earnings-table-section"
		>
			<div className="mb-6">
				<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
					Per-stream breakdown
				</h2>
				<p className="mt-1 text-xs text-white/50">
					Every earning across all four revenue streams
				</p>
			</div>

			{isLoading ? (
				<div className="space-y-3" data-testid="earnings-table-skeleton">
					{Array.from({ length: 4 }).map((_, index) => (
						<Skeleton key={index} className="h-10 w-full" />
					))}
				</div>
			) : records.length === 0 ? (
				<p
					className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-white/45"
					data-testid="earnings-table-empty"
				>
					No earnings recorded yet.
				</p>
			) : (
				<div className="overflow-x-auto">
					<table
						className="w-full text-left text-sm"
						data-testid="earnings-table"
					>
						<thead>
							<tr className="text-[0.65rem] uppercase tracking-[0.22em] text-white/40">
								<th className="pb-3 pr-4">Date</th>
								<th className="pb-3 pr-4">Source</th>
								<th className="pb-3 pr-4">Amount</th>
								<th className="pb-3">Status</th>
							</tr>
						</thead>
						<tbody>
							{records.map(record => (
								<tr
									key={record.id}
									className="border-t border-white/5"
									data-testid={`earnings-record-${record.id}`}
								>
									<td className="py-3 pr-4 text-white/60">
										{formatRecordDate(record.earnedAt)}
									</td>
									<td className="py-3 pr-4 font-semibold text-white/85">
										{EARNINGS_STREAM_LABELS[record.stream]}
									</td>
									<td className="py-3 pr-4 font-mono font-bold text-emerald-400">
										+{formatXlmPrice(record.amountXlm)}
									</td>
									<td className="py-3">
										<span
											className={`rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider ${
												record.status === 'claimed'
													? 'bg-white/5 text-white/45'
													: 'bg-amber-400/10 text-amber-300'
											}`}
										>
											{record.status}
										</span>
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

export default CreatorEarningsTable;
