import React from 'react';
import { ExternalLink, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import EmptyState from '@/components/common/EmptyState';
import Skeleton from '@/components/ui/skeleton';
import {
	useClaimableRevenue,
	useClaimAllRevenueMutation,
	useClaimHistory,
	useClaimRevenueMutation,
} from '@/hooks/useProtocolRevenue';
import { hasClaimableRevenue } from '@/utils/protocolRevenue.utils';
import { formatXlmPrice } from '@/utils/numberFormat.utils';
import { formatRelativeTime } from '@/utils/time.utils';
import {
	buildStellarExpertTxUrl,
	truncateTxHash,
} from '@/constants/stellar';
import { env } from '@/utils/env.utils';

export interface ProtocolRevenueClaimProps {
	walletAddress: string;
}

const CARD_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8';

const REVENUE_SHARE_EXPLANATION =
	'Your share = your staked keys / total staked keys × trading-fee revenue pool. Claimable amounts accrue per stake position under the claim-based dividend model.';

/**
 * Protocol revenue claim interface for stakers (#920).
 *
 * Shows the claimable amount per stake position, a batch Claim All action,
 * and a persisted claim history (date, amount, transaction hash).
 */
const ProtocolRevenueClaim: React.FC<ProtocolRevenueClaimProps> = ({
	walletAddress,
}) => {
	const {
		claimableByPosition,
		totalClaimable,
		isLoading,
		isError,
	} = useClaimableRevenue(walletAddress);
	const { history, appendHistory } = useClaimHistory(walletAddress);
	const claimOneMutation = useClaimRevenueMutation(walletAddress, {
		onAppended: appendHistory,
	});
	const claimAllMutation = useClaimAllRevenueMutation(walletAddress, {
		onAppended: appendHistory,
	});

	const isClaiming =
		claimOneMutation.isPending || claimAllMutation.isPending;
	const canClaimAll = hasClaimableRevenue(totalClaimable) && !isClaiming;

	const handleClaimOne = (creatorId: string, amount: number) => {
		if (amount <= 0 || claimOneMutation.isPending) return;
		claimAllMutation.reset?.();
		claimOneMutation.mutate({ creatorId, amount });
	};

	const handleClaimAll = () => {
		if (!canClaimAll) return;
		claimOneMutation.reset?.();
		claimAllMutation.mutate({
			claims: claimableByPosition
				.filter(entry => entry.claimable > 0)
				.map(entry => ({
					creatorId: entry.position.creatorId,
					amount: entry.claimable,
				})),
		});
	};

	if (isLoading) {
		return (
			<section
				className={CARD_CLASS}
				data-testid="protocol-revenue-skeleton"
				aria-busy="true"
			>
				<Skeleton className="h-6 w-48" />
				<div className="mt-6 space-y-2">
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
			</section>
		);
	}

	if (isError) {
		return (
			<section className={CARD_CLASS} data-testid="protocol-revenue-claim">
				<EmptyState
					title="Couldn't load revenue"
					description="There was a problem fetching your claimable revenue. Please try again shortly."
				/>
			</section>
		);
	}

	return (
		<section className={CARD_CLASS} data-testid="protocol-revenue-claim">
			<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
				<div>
					<h2 className="flex items-center gap-2 font-grotesque text-xl font-black tracking-tight text-white">
						Protocol Revenue
						<Tooltip content={REVENUE_SHARE_EXPLANATION}>
							<span
								className="inline-flex cursor-help text-white/50 hover:text-white/80"
								data-testid="revenue-share-tooltip"
								aria-label="Revenue share calculation info"
							>
								<HelpCircle className="size-4" aria-hidden="true" />
							</span>
						</Tooltip>
					</h2>
					<p className="mt-1 text-sm text-white/60">
						Total claimable:{' '}
						<span
							className="font-mono font-bold text-white"
							data-testid="revenue-total-claimable"
						>
							{formatXlmPrice(totalClaimable)}
						</span>
					</p>
				</div>
				<Button
					onClick={handleClaimAll}
					disabled={!canClaimAll}
					data-testid="revenue-claim-all"
				>
					{claimAllMutation.isPending ? 'Claiming…' : 'Claim all'}
				</Button>
			</div>

			{!hasClaimableRevenue(totalClaimable) ? (
				<EmptyState
					title="No revenue to claim"
					description="Your share of trading-fee revenue will appear here once your staked positions accrue rewards."
				/>
			) : (
				<div className="space-y-2" data-testid="revenue-position-list">
					{claimableByPosition
						.filter(entry => entry.claimable > 0)
						.map(entry => (
							<div
								key={entry.position.creatorId}
								className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"
								data-testid="revenue-position-row"
							>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-bold text-white">
										{entry.position.creatorId}
									</p>
									<p
										className="mt-1 font-mono text-xs text-white/70"
										data-testid="revenue-claimable-amount"
									>
										{formatXlmPrice(entry.claimable)} claimable
									</p>
								</div>
								<Button
									size="sm"
									variant="outline"
									className="rounded-xl"
									disabled={isClaiming}
									onClick={() =>
										handleClaimOne(
											entry.position.creatorId,
											entry.claimable
										)
									}
									data-testid="revenue-claim-one"
								>
									{claimOneMutation.isPending ? 'Claiming…' : 'Claim'}
								</Button>
							</div>
						))}
				</div>
			)}

			<div className="mt-8">
				<h3 className="font-grotesque text-lg font-bold text-white">
					Claim history
				</h3>
				{history.length === 0 ? (
					<p
						className="mt-2 text-sm text-white/55"
						data-testid="revenue-history-empty"
					>
						No claims yet. Successful claims will appear here with their
						transaction hash.
					</p>
				) : (
					<div className="mt-4 space-y-2" data-testid="revenue-claim-history">
						{history.map(record => (
							<div
								key={record.id}
								className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between"
								data-testid="revenue-history-row"
							>
								<div className="flex items-center gap-4 text-xs text-white/60">
									<span
										className="font-mono text-white/80"
										title={new Date(record.timestamp).toLocaleString()}
										data-testid="revenue-history-date"
									>
										{formatRelativeTime(record.timestamp)}
									</span>
									<span
										className="font-mono font-semibold text-emerald-400"
										data-testid="revenue-history-amount"
									>
										+{record.amount.toFixed(4)} XLM
									</span>
								</div>
								<a
									href={buildStellarExpertTxUrl(
										record.transactionHash,
										env.VITE_STELLAR_NETWORK
									)}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 font-mono text-xs text-white/60 hover:text-white"
									data-testid="revenue-history-tx"
								>
									{truncateTxHash(record.transactionHash)}
									<ExternalLink className="size-3.5" aria-hidden="true" />
								</a>
							</div>
						))}
					</div>
				)}
			</div>
		</section>
	);
};

export default ProtocolRevenueClaim;
