import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import Skeleton from '@/components/ui/skeleton';
import { truncateAddress } from '@/utils/whitelist.utils';
import { formatNumber, formatPercent } from '@/utils/numberFormat.utils';
import { useHolderConcentration } from '@/hooks/useHolderConcentration';
import type {
	HolderTier,
	HolderTierBreakdown,
} from '@/services/holderConcentration.service';

export interface HolderConcentrationHeatmapProps {
	keyId: string;
	className?: string;
}

const TIER_LABELS: Record<HolderTier, string> = {
	whale: 'Whale',
	midTier: 'Mid-tier',
	retail: 'Retail',
};

const TIER_DESCRIPTIONS: Record<HolderTier, string> = {
	whale: '> 5% of supply',
	midTier: '1 – 5% of supply',
	retail: '< 1% of supply',
};

const TIER_COLORS: Record<HolderTier, string> = {
	whale: '#fbbf24', // amber-400
	midTier: '#38bdf8', // sky-400
	retail: '#a78bfa', // violet-400
};

const TIER_ORDER: HolderTier[] = ['whale', 'midTier', 'retail'];

function orderTiers(tiers: HolderTierBreakdown[]): HolderTierBreakdown[] {
	const byTier = new Map(tiers.map(tier => [tier.tier, tier]));
	return TIER_ORDER.map(
		tier =>
			byTier.get(tier) ?? { tier, sharePercent: 0, walletCount: 0 }
	);
}

interface DonutTooltipPayload {
	name: string;
	value: number;
	payload: HolderTierBreakdown;
}

const DonutTooltip: React.FC<{ active?: boolean; payload?: DonutTooltipPayload[] }> = ({
	active,
	payload,
}) => {
	if (!active || !payload?.length) return null;
	const entry = payload[0]!.payload;
	return (
		<div
			className="rounded-lg border border-white/10 bg-slate-900/95 px-3 py-2 text-xs shadow-xl"
			data-testid="holder-concentration-tooltip"
		>
			<p className="font-semibold text-white">{TIER_LABELS[entry.tier]}</p>
			<p className="text-white/60">
				{formatPercent(entry.sharePercent, { maximumFractionDigits: 1 })} ·{' '}
				{formatNumber(entry.walletCount)} wallet
				{entry.walletCount === 1 ? '' : 's'}
			</p>
		</div>
	);
};

export const HolderConcentrationHeatmap: React.FC<
	HolderConcentrationHeatmapProps
> = ({ keyId, className }) => {
	const { data, isLoading, isError } = useHolderConcentration(keyId);

	if (isLoading) {
		return (
			<div
				className={cn('space-y-4', className)}
				data-testid="holder-concentration-heatmap-loading"
			>
				<div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
					<Skeleton className="size-40 shrink-0 rounded-full" />
					<div className="w-full space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				</div>
			</div>
		);
	}

	if (isError || !data) {
		return (
			<p
				className="py-8 text-center text-sm text-white/50"
				data-testid="holder-concentration-heatmap-empty"
			>
				No holder concentration data yet.
			</p>
		);
	}

	const tiers = orderTiers(data.tiers);
	const hasAnyShare = tiers.some(tier => tier.sharePercent > 0);

	return (
		<div
			className={cn('space-y-6', className)}
			data-testid="holder-concentration-heatmap"
		>
			<div className="flex items-center justify-between gap-3">
				<p className="text-sm text-white/60">
					Distribution of circulating supply across wallet tiers.
				</p>
				<div
					className="shrink-0 text-right"
					data-testid="holder-concentration-unique-count"
				>
					<p className="text-xl font-bold tabular-nums text-white">
						{formatNumber(data.uniqueHolderCount)}
					</p>
					<p className="text-[0.65rem] font-semibold uppercase tracking-wider text-white/40">
						Unique holders
					</p>
				</div>
			</div>

			{!hasAnyShare ? (
				<p
					className="py-8 text-center text-sm text-white/50"
					data-testid="holder-concentration-heatmap-no-data"
				>
					No holder concentration data yet.
				</p>
			) : (
				<div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
					<div
						className="h-44 w-44 shrink-0 sm:h-48 sm:w-48"
						data-testid="holder-concentration-donut"
					>
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									data={tiers}
									dataKey="sharePercent"
									nameKey="tier"
									innerRadius="60%"
									outerRadius="100%"
									paddingAngle={2}
									isAnimationActive={false}
								>
									{tiers.map(tier => (
										<Cell
											key={tier.tier}
											fill={TIER_COLORS[tier.tier]}
											data-testid={`holder-concentration-segment-${tier.tier}`}
										/>
									))}
								</Pie>
								<Tooltip content={<DonutTooltip />} />
							</PieChart>
						</ResponsiveContainer>
					</div>

					<ul className="w-full space-y-2.5" data-testid="holder-concentration-legend">
						{tiers.map(tier => (
							<li
								key={tier.tier}
								className="flex items-center justify-between gap-3 text-sm"
								data-testid={`holder-concentration-legend-${tier.tier}`}
							>
								<span className="flex items-center gap-2 text-white/80">
									<span
										className="size-2.5 shrink-0 rounded-full"
										style={{ backgroundColor: TIER_COLORS[tier.tier] }}
										aria-hidden="true"
									/>
									<span>
										<span className="font-semibold">
											{TIER_LABELS[tier.tier]}
										</span>
										<span className="ml-1.5 text-xs text-white/40">
											{TIER_DESCRIPTIONS[tier.tier]}
										</span>
									</span>
								</span>
								<span className="shrink-0 text-right font-bold tabular-nums text-white">
									{formatPercent(tier.sharePercent, {
										maximumFractionDigits: 1,
									})}
								</span>
							</li>
						))}
					</ul>
				</div>
			)}

			<div data-testid="holder-concentration-top-holders">
				<h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
					Top 5 Holders
				</h4>
				{data.topHolders.length === 0 ? (
					<p className="text-sm text-white/50">No holders yet.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full min-w-[20rem] text-left text-sm">
							<thead>
								<tr className="border-b border-white/10 text-[0.65rem] font-semibold uppercase tracking-wider text-white/40">
									<th className="py-2 pr-3">Wallet</th>
									<th className="py-2 pr-3 text-right">Amount</th>
									<th className="py-2 text-right">% of Supply</th>
								</tr>
							</thead>
							<tbody>
								{data.topHolders.slice(0, 5).map(holder => (
									<tr
										key={holder.id}
										className="border-b border-white/5 last:border-0"
										data-testid="holder-concentration-top-holder-row"
									>
										<td
											className="py-2.5 pr-3 font-mono text-white/80"
											title={holder.walletAddress}
										>
											{truncateAddress(holder.walletAddress)}
										</td>
										<td className="py-2.5 pr-3 text-right tabular-nums text-white/80">
											{formatNumber(holder.keyCount)}
										</td>
										<td className="py-2.5 text-right font-bold tabular-nums text-amber-300/90">
											{formatPercent(holder.sharePercent, {
												maximumFractionDigits: 1,
											})}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
};

export default HolderConcentrationHeatmap;
