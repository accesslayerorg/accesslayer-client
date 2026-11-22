import React from 'react';
import { Coins, KeyRound, Landmark, Users } from 'lucide-react';
import Skeleton from '@/components/ui/skeleton';
import {
	formatNumber,
	formatXlmPrice,
} from '@/utils/numberFormat.utils';
import type { ProtocolAnalyticsSummary } from '@/services/analytics.service';

export interface ProtocolAnalyticsCardsProps {
	summary?: ProtocolAnalyticsSummary | null;
	isLoading?: boolean;
}

export const ProtocolAnalyticsCards: React.FC<ProtocolAnalyticsCardsProps> = ({
	summary,
	isLoading = false,
}) => {
	if (isLoading) {
		return (
			<div
				className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
				data-testid="protocol-analytics-cards-skeleton"
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

	const cards = [
		{
			id: 'tvl',
			label: 'Total TVL',
			value: formatXlmPrice(summary?.totalTvlXlm ?? 0),
			description: 'Value locked across all creator keys',
			testId: 'protocol-card-tvl',
			icon: Landmark,
			accentColor: 'text-emerald-400',
			bgColor: 'bg-emerald-400/10 border-emerald-400/20',
		},
		{
			id: 'volume',
			label: 'Cumulative Volume',
			value: formatXlmPrice(summary?.cumulativeVolumeXlm ?? 0),
			description: 'All-time trading volume across the protocol',
			testId: 'protocol-card-volume',
			icon: Coins,
			accentColor: 'text-cyan-400',
			bgColor: 'bg-cyan-400/10 border-cyan-400/20',
		},
		{
			id: 'active-keys',
			label: 'Active Keys',
			value: formatNumber(summary?.activeKeys ?? 0, { style: 'compact' }),
			description: 'Creator keys live on the protocol',
			testId: 'protocol-card-active-keys',
			icon: KeyRound,
			accentColor: 'text-amber-400',
			bgColor: 'bg-amber-400/10 border-amber-400/20',
		},
		{
			id: 'unique-traders',
			label: 'Unique Traders',
			value: formatNumber(summary?.uniqueTraders ?? 0, { style: 'compact' }),
			description: 'Wallets that have traded any key',
			testId: 'protocol-card-unique-traders',
			icon: Users,
			accentColor: 'text-indigo-400',
			bgColor: 'bg-indigo-400/10 border-indigo-400/20',
		},
	];

	return (
		<div
			className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
			data-testid="protocol-analytics-cards"
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
								data-testid={`${card.testId}-value`}
							>
								{card.value}
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

export default ProtocolAnalyticsCards;
