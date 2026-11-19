import React from 'react';
import { Coins, Sparkles, TrendingUp, Layers } from 'lucide-react';
import Skeleton from '@/components/ui/skeleton';
import { formatXlmPrice } from '@/utils/numberFormat.utils';
import type { CreatorRevenueSummary } from '@/types/creatorRevenue';

export interface CreatorRevenueCardsProps {
	summary?: CreatorRevenueSummary | null;
	isLoading?: boolean;
}

export const CreatorRevenueCards: React.FC<CreatorRevenueCardsProps> = ({
	summary,
	isLoading = false,
}) => {
	if (isLoading) {
		return (
			<div
				className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
				data-testid="revenue-cards-skeleton"
				aria-busy="true"
			>
				{Array.from({ length: 4 }).map((_, i) => (
					<div
						key={i}
						className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md"
					>
						<Skeleton className="h-4 w-24 mb-3" />
						<Skeleton className="h-8 w-32 mb-2" />
						<Skeleton className="h-3 w-40" />
					</div>
				))}
			</div>
		);
	}

	const royalties = summary?.royaltiesEarned ?? 0;
	const subscriptions = summary?.subscriptionFees ?? 0;
	const dividends = summary?.dividendDeposits ?? 0;
	const total =
		summary?.totalEarnings ?? royalties + subscriptions + dividends;

	const cards = [
		{
			id: 'royalties',
			label: 'Royalties Earned',
			amount: royalties,
			description: 'Key trading fees & secondary volume',
			testId: 'revenue-card-royalties',
			valueTestId: 'revenue-royalties-value',
			icon: TrendingUp,
			accentColor: 'text-emerald-400',
			bgColor: 'bg-emerald-400/10 border-emerald-400/20',
		},
		{
			id: 'subscriptions',
			label: 'Subscription Fees',
			amount: subscriptions,
			description: 'Keyholder recurring access fees',
			testId: 'revenue-card-subscriptions',
			valueTestId: 'revenue-subscriptions-value',
			icon: Sparkles,
			accentColor: 'text-indigo-400',
			bgColor: 'bg-indigo-400/10 border-indigo-400/20',
		},
		{
			id: 'dividends',
			label: 'Dividend Deposits',
			amount: dividends,
			description: 'Protocol revenue pool distributions',
			testId: 'revenue-card-dividends',
			valueTestId: 'revenue-dividends-value',
			icon: Coins,
			accentColor: 'text-amber-400',
			bgColor: 'bg-amber-400/10 border-amber-400/20',
		},
		{
			id: 'total',
			label: 'Total Revenue',
			amount: total,
			description: 'All-time creator revenue generated',
			testId: 'revenue-card-total',
			valueTestId: 'revenue-total-value',
			icon: Layers,
			accentColor: 'text-cyan-400',
			bgColor: 'bg-cyan-400/10 border-cyan-400/20',
		},
	];

	return (
		<div
			className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
			data-testid="creator-revenue-cards"
		>
			{cards.map(card => {
				const Icon = card.icon;
				return (
					<div
						key={card.id}
						className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-lg backdrop-blur-md transition-all duration-200 hover:border-white/20 hover:bg-white/[0.04]"
						data-testid={card.testId}
					>
						<div className="flex items-center justify-between gap-2">
							<span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-white/50">
								{card.label}
							</span>
							<div
								className={`flex size-8 items-center justify-center rounded-lg border ${card.bgColor} ${card.accentColor}`}
							>
								<Icon className="size-4" aria-hidden="true" />
							</div>
						</div>

						<div className="mt-3">
							<div
								className="font-mono text-2xl font-black tracking-tight text-white"
								data-testid={card.valueTestId}
							>
								{formatXlmPrice(card.amount)}
							</div>
							<p className="mt-1 text-xs text-white/45 truncate">
								{card.description}
							</p>
						</div>
					</div>
				);
			})}
		</div>
	);
};

export default CreatorRevenueCards;
