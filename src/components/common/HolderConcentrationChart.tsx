import type React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPercent } from '@/utils/numberFormat.utils';
import { rankKeyHolders, type KeyHolder } from '@/utils/keyHolderRanking.utils';

export interface HolderConcentrationChartProps {
	holders: KeyHolder[];
	totalSupply?: number | null;
	className?: string;
}

interface ConcentrationBar {
	id: string;
	label: string;
	percent: number;
	walletAddress?: string;
}

function truncateAddress(address: string): string {
	if (address.length <= 10) return address;
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function buildConcentrationBars(
	holders: KeyHolder[],
	totalSupply?: number | null
): ConcentrationBar[] {
	const ranked = rankKeyHolders(holders);
	const supply =
		totalSupply != null && Number.isFinite(totalSupply) && totalSupply > 0
			? totalSupply
			: null;
	const topHolders = ranked.slice(0, 10);
	const topBars: ConcentrationBar[] = topHolders.map(holder => ({
		id: holder.id,
		label: holder.walletAddress
			? truncateAddress(holder.walletAddress)
			: holder.displayName,
		percent: supply ? (holder.keyCount / supply) * 100 : holder.sharePercent,
		walletAddress: holder.walletAddress,
	}));
	const topPercent = topBars.reduce((sum, holder) => sum + holder.percent, 0);
	const othersPercent = Math.max(0, 100 - topPercent);

	if (othersPercent > 0) {
		topBars.push({
			id: 'others',
			label: 'Others',
			percent: othersPercent,
		});
	}

	return topBars;
}

const HolderConcentrationChart: React.FC<HolderConcentrationChartProps> = ({
	holders,
	totalSupply,
	className,
}) => {
	const bars = buildConcentrationBars(holders, totalSupply);
	const topThreePercent = bars
		.filter(bar => bar.id !== 'others')
		.slice(0, 3)
		.reduce((sum, holder) => sum + holder.percent, 0);
	const isHighlyConcentrated = topThreePercent > 50;

	if (bars.length === 0) {
		return (
			<p
				className="py-8 text-center text-sm text-white/50"
				data-testid="holder-concentration-empty"
			>
				No holder concentration data yet.
			</p>
		);
	}

	return (
		<div
			className={cn('space-y-4', className)}
			data-testid="holder-concentration-chart"
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-sm text-white/60">
					Top holders by share of circulating supply.
				</p>
				{isHighlyConcentrated && (
					<span
						className="inline-flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-400/10 px-2.5 py-1 text-xs font-bold text-red-200"
						data-testid="holder-concentration-warning"
					>
						<AlertTriangle className="size-3.5" aria-hidden="true" />
						Highly concentrated
					</span>
				)}
			</div>

			<div className="space-y-3">
				{bars.map(bar => (
					<div
						key={bar.id}
						className="grid gap-2 sm:grid-cols-[minmax(0,10rem)_1fr_4rem] sm:items-center"
						data-testid="holder-concentration-bar"
					>
						<span
							className={cn(
								'truncate text-sm font-semibold text-white/80',
								bar.walletAddress && 'font-mono'
							)}
							title={bar.walletAddress ?? bar.label}
							data-testid={
								bar.id === 'others'
									? 'holder-concentration-others-label'
									: 'holder-concentration-label'
							}
						>
							{bar.label}
						</span>
						<div
							className="h-3 overflow-hidden rounded-full bg-white/10"
							aria-hidden="true"
						>
							<div
								className={cn(
									'h-full rounded-full',
									bar.id === 'others' ? 'bg-white/35' : 'bg-amber-400'
								)}
								style={{ width: `${Math.min(100, bar.percent)}%` }}
							/>
						</div>
						<span
							className="text-right text-sm font-bold tabular-nums text-amber-300/90"
							data-testid={
								bar.id === 'others'
									? 'holder-concentration-others-percent'
									: 'holder-concentration-percent'
							}
						>
							{formatPercent(bar.percent, { maximumFractionDigits: 1 })}
						</span>
					</div>
				))}
			</div>
		</div>
	);
};

export default HolderConcentrationChart;
