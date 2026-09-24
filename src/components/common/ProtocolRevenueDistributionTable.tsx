import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/common/EmptyState';
import Skeleton from '@/components/ui/skeleton';
import { useStakerProtocolRevenue } from '@/hooks/useProtocolRevenue';
import type { ProtocolRevenueDistribution } from '@/services/stakerRevenue.service';

export interface ProtocolRevenueDistributionTableProps {
	walletAddress: string;
}

const CARD_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8';

function formatDistributionDate(dateInput: string | number): string {
	const date = new Date(dateInput);
	if (isNaN(date.getTime())) return String(dateInput);
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

function SkeletonRow() {
	return (
		<div
			className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
			aria-hidden="true"
			data-testid="protocol-revenue-skeleton-row"
		>
			<Skeleton className="h-4 w-1/4" />
			<Skeleton className="h-4 w-20" />
			<Skeleton className="h-4 w-16" />
			<Skeleton className="ml-auto h-4 w-24" />
		</div>
	);
}

const ProtocolRevenueDistributionTable: React.FC<
	ProtocolRevenueDistributionTableProps
> = ({ walletAddress }) => {
	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isError,
	} = useStakerProtocolRevenue(walletAddress);

	// Flatten pages and deduplicate by id/key, then sort by distributionDate descending
	const distributions = useMemo(() => {
		const seen = new Set<string>();
		const result: ProtocolRevenueDistribution[] = [];
		for (const page of data?.pages ?? []) {
			for (const item of page.distributions ?? []) {
				const key =
					item.id || `${item.distributionDate}-${item.amountReceived}`;
				if (seen.has(key)) continue;
				seen.add(key);
				result.push(item);
			}
		}
		// Sort by distributionDate descending per requirement
		return result.sort((a, b) => {
			const timeA = new Date(a.distributionDate).getTime();
			const timeB = new Date(b.distributionDate).getTime();
			return timeB - timeA;
		});
	}, [data]);

	if (isLoading) {
		return (
			<section
				className={CARD_CLASS}
				data-testid="protocol-revenue-history-skeleton"
				aria-busy="true"
			>
				<div className="mb-6">
					<Skeleton className="h-6 w-56" />
					<Skeleton className="mt-2 h-4 w-72" />
				</div>
				<div className="space-y-2">
					{Array.from({ length: 4 }).map((_, i) => (
						<SkeletonRow key={i} />
					))}
				</div>
			</section>
		);
	}

	if (isError) {
		return (
			<section
				className={CARD_CLASS}
				data-testid="protocol-revenue-history-error"
			>
				<EmptyState
					title="Couldn't load revenue distributions"
					description="There was a problem fetching past protocol revenue distributions. Please try again shortly."
				/>
			</section>
		);
	}

	if (distributions.length === 0) {
		return (
			<section
				className={CARD_CLASS}
				data-testid="protocol-revenue-history-empty"
			>
				<EmptyState
					title="No protocol revenue distributions yet"
					description="Past distributions and your earned share of protocol revenue will appear here once distributions occur."
				/>
			</section>
		);
	}

	return (
		<section
			className={CARD_CLASS}
			data-testid="protocol-revenue-history-table"
			aria-label="Protocol revenue distribution history"
		>
			<div className="mb-6">
				<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
					Protocol Revenue Distributions
				</h2>
				<p className="mt-1 text-sm text-white/60">
					A history of past protocol revenue distributions and your
					received share
				</p>
			</div>

			{/* Table column headers for desktop */}
			<div className="mb-2 hidden items-center justify-between px-5 text-[10px] font-bold uppercase tracking-widest text-white/30 sm:flex">
				<span className="w-1/4">Distribution Date</span>
				<div className="flex items-center gap-6">
					<span className="w-28 text-right">Total Distributed</span>
					<span className="w-20 text-right">Stakers</span>
					<span className="w-32 text-right">Amount Received</span>
				</div>
			</div>

			{/* Rows list */}
			<div className="space-y-2" data-testid="protocol-revenue-list">
				{distributions.map((dist, idx) => (
					<div
						key={dist.id || `dist-${idx}`}
						data-testid="protocol-revenue-row"
						className="flex flex-col gap-3 rounded-xl border border-l-4 border-l-amber-400 border-white/10 bg-white/[0.02] p-4 pl-5 transition-colors hover:border-white/20 hover:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between"
					>
						{/* Distribution Date */}
						<div className="flex flex-col">
							<span className="text-[10px] font-bold uppercase tracking-widest text-white/30 sm:hidden">
								Distribution Date
							</span>
							<span
								className="text-sm font-semibold text-white"
								data-testid="distribution-date"
							>
								{formatDistributionDate(dist.distributionDate)}
							</span>
						</div>

						{/* Numeric stats */}
						<div className="flex items-center gap-4 text-xs text-white/60 sm:gap-6">
							<div className="flex flex-col items-end">
								<span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
									Total Distributed
								</span>
								<span
									className="font-mono text-white/80"
									data-testid="total-distributed"
								>
									{dist.totalDistributed.toLocaleString()} XLM
								</span>
							</div>

							<div className="flex flex-col items-end">
								<span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
									Stakers
								</span>
								<span
									className="font-mono text-white/80"
									data-testid="staker-count"
								>
									{dist.stakerCount.toLocaleString()}
								</span>
							</div>

							<div className="flex flex-col items-end">
								<span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
									Amount Received
								</span>
								<span
									className="font-mono font-semibold text-emerald-400"
									data-testid="amount-received"
								>
									+{dist.amountReceived.toFixed(4)} XLM
								</span>
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Load More button for cursor pagination */}
			{hasNextPage && (
				<div className="mt-6 flex justify-center">
					<Button
						variant="outline"
						onClick={() => void fetchNextPage()}
						disabled={isFetchingNextPage}
						data-testid="protocol-revenue-load-more"
						className="rounded-xl border-white/15 bg-white/5 px-8 text-white/80 hover:bg-white/10 hover:text-white"
					>
						{isFetchingNextPage ? 'Loading…' : 'Load More'}
					</Button>
				</div>
			)}
		</section>
	);
};

export default ProtocolRevenueDistributionTable;
