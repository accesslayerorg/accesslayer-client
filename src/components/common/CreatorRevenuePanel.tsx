import React from 'react';
import { RefreshCw, ArrowDownToLine, Wallet } from 'lucide-react';
import { AsyncButton } from '@/components/ui/async-button';
import {
	useCreatorRevenueSummary,
	useCreatorRevenueHistory,
	useCreatorWithdrawalHistory,
	useWithdrawCreatorRevenueMutation,
	useRevenueTimeRange,
	REVENUE_REFETCH_INTERVAL_MS,
} from '@/hooks/useCreatorRevenue';
import { formatXlmPrice } from '@/utils/numberFormat.utils';
import { hasClaimableProceeds } from '@/utils/creatorRevenue.utils';
import CreatorRevenueCards from '@/components/common/CreatorRevenueCards';
import CreatorRevenueChart from '@/components/common/CreatorRevenueChart';
import CreatorWithdrawalHistoryTable from '@/components/common/CreatorWithdrawalHistoryTable';

export interface CreatorRevenuePanelProps {
	creatorId: string;
	wallet?: string;
	className?: string;
}

export const CreatorRevenuePanel: React.FC<CreatorRevenuePanelProps> = ({
	creatorId,
	wallet,
	className,
}) => {
	const { interval, selectInterval } = useRevenueTimeRange('24h');

	// Summaries and history auto-refresh every 60 seconds
	const {
		data: summary,
		isLoading: isSummaryLoading,
		isRefetching: isSummaryRefetching,
		refetch: refetchSummary,
	} = useCreatorRevenueSummary(creatorId, {
		refetchInterval: REVENUE_REFETCH_INTERVAL_MS,
	});

	const {
		data: historyPoints = [],
		isLoading: isHistoryLoading,
		isRefetching: isHistoryRefetching,
		refetch: refetchHistory,
	} = useCreatorRevenueHistory(creatorId, interval, {
		refetchInterval: REVENUE_REFETCH_INTERVAL_MS,
	});

	const {
		data: withdrawals = [],
		isLoading: isWithdrawalsLoading,
		refetch: refetchWithdrawals,
	} = useCreatorWithdrawalHistory(creatorId);

	const withdrawMutation = useWithdrawCreatorRevenueMutation(
		creatorId,
		wallet
	);

	const claimableProceeds = summary?.claimableProceeds ?? 0;
	const canWithdraw =
		hasClaimableProceeds(claimableProceeds) && !withdrawMutation.isPending;

	const handleWithdraw = () => {
		if (!canWithdraw) return;
		withdrawMutation.mutate(claimableProceeds);
	};

	const handleManualRefresh = () => {
		void refetchSummary();
		void refetchHistory();
		void refetchWithdrawals();
	};

	const isRefreshing = isSummaryRefetching || isHistoryRefetching;

	return (
		<div
			className={`space-y-8 ${className ?? ''}`}
			data-testid="creator-revenue-panel"
		>
			{/* Top Bar: Claimable Net Proceeds & Withdrawal Action */}
			<section
				className="flex flex-col gap-6 rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8 lg:flex-row lg:items-center lg:justify-between"
				data-testid="revenue-withdrawal-action-section"
			>
				<div>
					<div className="flex items-center gap-3">
						<span className="flex size-9 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
							<Wallet className="size-5" aria-hidden="true" />
						</span>
						<div>
							<span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-white/50">
								Withdrawable Proceeds
							</span>
							<div
								className="mt-0.5 font-mono text-3xl font-black text-white"
								data-testid="claimable-proceeds-amount"
							>
								{formatXlmPrice(claimableProceeds)}
							</div>
						</div>
					</div>
					<p className="mt-2 text-xs text-white/50">
						Net revenue available to claim across trading royalties,
						subscriptions, and dividend pool shares.
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<div
						className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/60"
						data-testid="auto-refresh-indicator"
					>
						<span
							className="size-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
							aria-hidden="true"
						/>
						<span>Refreshed every 60s</span>
						<button
							type="button"
							onClick={handleManualRefresh}
							disabled={isRefreshing}
							className="ml-1 text-white/40 hover:text-white transition-colors"
							aria-label="Refresh revenue data"
							data-testid="manual-refresh-button"
						>
							<RefreshCw
								className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
							/>
						</button>
					</div>

					<AsyncButton
						type="button"
						className="rounded-xl bg-emerald-400 text-slate-950 font-bold hover:bg-emerald-300 shadow-lg shadow-emerald-500/20 px-5 py-2.5"
						disabled={!canWithdraw}
						isPending={withdrawMutation.isPending}
						pendingText="Submitting claim…"
						onClick={handleWithdraw}
						data-testid="withdraw-earnings-button"
					>
						<ArrowDownToLine className="mr-2 size-4" aria-hidden="true" />
						Withdraw earnings
					</AsyncButton>
				</div>
			</section>

			{/* Revenue Summary Cards */}
			<section data-testid="revenue-cards-section">
				<CreatorRevenueCards
					summary={summary}
					isLoading={isSummaryLoading}
				/>
			</section>

			{/* Per-source Earnings Chart Over Time */}
			<section data-testid="revenue-chart-section">
				<CreatorRevenueChart
					data={historyPoints}
					interval={interval}
					isLoading={isHistoryLoading}
					onIntervalChange={selectInterval}
				/>
			</section>

			{/* Withdrawal History */}
			<section
				className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8"
				data-testid="revenue-withdrawal-history-section"
			>
				<CreatorWithdrawalHistoryTable
					withdrawals={withdrawals}
					isLoading={isWithdrawalsLoading}
				/>
			</section>
		</div>
	);
};

export default CreatorRevenuePanel;
