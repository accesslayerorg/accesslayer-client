import React from 'react';
import Skeleton from '@/components/ui/skeleton';
import { formatXlmPrice } from '@/utils/numberFormat.utils';
import { truncateWalletAddress } from '@/utils/referral.utils';
import {
	REFERRAL_HOLD_REASON_LABELS,
	REFERRAL_HOLD_STATUS_LABELS,
} from '@/utils/referralHolds.utils';
import type {
	ReferralHold,
	ReferralHoldStatus,
} from '@/services/adminReferralHolds.service';

export interface ReferralHoldsTableProps {
	holds: ReferralHold[];
	isLoading?: boolean;
	isError?: boolean;
	isFetchingNextPage?: boolean;
	hasNextPage?: boolean;
	onLoadMore?: () => void;
	onSelect?: (hold: ReferralHold) => void;
	selectedId?: string | null;
	className?: string;
}

const STATUS_BADGE_CLASS: Record<ReferralHoldStatus, string> = {
	held: 'border-amber-400/30 bg-amber-400/15 text-amber-200',
	released: 'border-emerald-400/30 bg-emerald-400/15 text-emerald-200',
	rejected: 'border-rose-400/30 bg-rose-400/15 text-rose-200',
};

export const ReferralHoldsTable: React.FC<ReferralHoldsTableProps> = ({
	holds,
	isLoading = false,
	isError = false,
	isFetchingNextPage = false,
	hasNextPage = false,
	onLoadMore,
	onSelect,
	selectedId,
	className,
}) => {
	if (isLoading) {
		return (
			<section className={className} data-testid="referral-holds-skeleton">
				<Skeleton className="h-6 w-48" />
				<div className="mt-6 space-y-2">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			</section>
		);
	}

	if (isError) {
		return (
			<section className={className} data-testid="referral-holds-error">
				<p role="alert" className="text-sm text-amber-300">
					We couldn&apos;t load the referral hold queue. Please refresh
					and try again.
				</p>
			</section>
		);
	}

	return (
		<section className={className} data-testid="referral-holds-table-panel">
			<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
				Review queue
			</h2>

			{holds.length === 0 ? (
				<p
					className="mt-2 text-sm text-white/55"
					data-testid="referral-holds-empty"
				>
					No referral holds match the current filters.
				</p>
			) : (
				<>
					<div className="mt-4 overflow-x-auto" data-testid="referral-holds-table">
						<table className="w-full min-w-[52rem] text-left text-sm">
							<thead>
								<tr className="border-b border-white/10 text-[0.65rem] uppercase tracking-[0.18em] text-white/40">
									<th scope="col" className="py-2 pr-4 font-bold">
										Referrer
									</th>
									<th scope="col" className="py-2 pr-4 font-bold">
										Referee
									</th>
									<th scope="col" className="py-2 pr-4 font-bold">
										Reason
									</th>
									<th scope="col" className="py-2 pr-4 font-bold">
										Cluster size
									</th>
									<th scope="col" className="py-2 pr-4 font-bold">
										Amount held
									</th>
									<th scope="col" className="py-2 pr-4 font-bold">
										Status
									</th>
									<th scope="col" className="py-2 font-bold">
										<span className="sr-only">Actions</span>
									</th>
								</tr>
							</thead>
							<tbody>
								{holds.map(hold => (
									<tr
										key={hold.id}
										className={`border-b border-white/5 ${selectedId === hold.id ? 'bg-white/[0.06]' : ''}`}
										data-testid="referral-hold-row"
									>
										<td className="py-2 pr-4">
											<span
												className="font-mono text-xs text-white/70"
												title={hold.referrer}
												data-testid="referral-hold-referrer"
											>
												{truncateWalletAddress(hold.referrer)}
											</span>
										</td>
										<td className="py-2 pr-4">
											<span
												className="font-mono text-xs text-white/70"
												title={hold.referee}
												data-testid="referral-hold-referee"
											>
												{truncateWalletAddress(hold.referee)}
											</span>
										</td>
										<td
											className="py-2 pr-4 text-xs text-white/60"
											data-testid="referral-hold-reason"
										>
											{REFERRAL_HOLD_REASON_LABELS[hold.reason] ?? hold.reason}
										</td>
										<td
											className="py-2 pr-4 font-mono text-xs text-white/70"
											data-testid="referral-hold-cluster-size"
										>
											{hold.clusterSize}
										</td>
										<td
											className="py-2 pr-4 font-mono text-xs font-semibold text-emerald-400"
											data-testid="referral-hold-amount"
										>
											{formatXlmPrice(hold.amountXlm)}
										</td>
										<td className="py-2 pr-4">
											<span
												className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[hold.status] ?? STATUS_BADGE_CLASS.held}`}
												data-testid="referral-hold-status"
											>
												{REFERRAL_HOLD_STATUS_LABELS[hold.status] ?? hold.status}
											</span>
										</td>
										<td className="py-2">
											<button
												type="button"
												onClick={() => onSelect?.(hold)}
												className="text-sm font-semibold text-amber-300 hover:text-amber-200"
												data-testid="referral-hold-review"
												aria-label={`Review hold ${hold.id}`}
											>
												Review
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{hasNextPage && (
						<button
							type="button"
							onClick={onLoadMore}
							disabled={isFetchingNextPage}
							className="mt-4 text-sm font-semibold text-amber-300 hover:text-amber-200 disabled:opacity-50"
							data-testid="referral-holds-load-more"
						>
							{isFetchingNextPage ? 'Loading…' : 'Load more'}
						</button>
					)}
				</>
			)}
		</section>
	);
};

export default ReferralHoldsTable;
