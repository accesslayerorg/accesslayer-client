import { useMemo, useState } from 'react';
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import type { ReactNode } from 'react';
import Skeleton from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCreatorDetail, usePriceHistory } from '@/hooks/useCreators';
import { useKeyStats } from '@/hooks/useKeyStats';
import { useRealtimeKeyPrice } from '@/hooks/useRealtimeKeyPrice';
import type { PriceHistoryInterval } from '@/services/course.service';
import {
	formatCreatorKeyPriceDisplay,
	formatDisplayKeyPrice,
	resolveCreatorKeyPriceStroops,
} from '@/utils/keyPriceDisplay.utils';
import { formatPercent } from '@/utils/numberFormat.utils';

export interface BondingCurvePriceChartProps {
	/** Creator key whose bonding-curve price is charted. */
	creatorId: string;
	className?: string;
}

const CHART_RANGES: Array<{ value: PriceHistoryInterval; label: string }> = [
	{ value: '1h', label: '1H' },
	{ value: '4h', label: '4H' },
	{ value: '24h', label: '24H' },
	{ value: '7d', label: '7D' },
];

const DEFAULT_RANGE: PriceHistoryInterval = '24h';

const formatTime = (value: ReactNode) =>
	new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	}).format(new Date(String(value)));

function changeToneClass(change: number | null | undefined): string {
	if (change == null || !Number.isFinite(change) || change === 0) {
		return 'text-white';
	}
	return change > 0 ? 'text-emerald-400' : 'text-red-400';
}

/**
 * Bonding-curve price chart with live updates (#1115).
 *
 * Renders the key's price history as a Recharts line chart across a
 * 1h/4h/24h/7d range selector, with stat chips for the current price, 24h
 * change and 24h volume above the series. While mounted, the component
 * subscribes to the real-time price feed; incoming ticks are written into the
 * query cache so the chart and chips update in place without a page reload.
 * With the feed disabled (no `VITE_WEBSOCKET_URL`), the chart falls back to
 * the polled price-history endpoint exactly like before.
 */
export function BondingCurvePriceChart({
	creatorId,
	className,
}: BondingCurvePriceChartProps) {
	const [range, setRange] = useState<PriceHistoryInterval>(DEFAULT_RANGE);

	const { data: points, isLoading: isHistoryLoading } = usePriceHistory(
		creatorId,
		range
	);
	const { data: keyStats, isLoading: isStatsLoading } = useKeyStats(creatorId);
	const { data: creator, isLoading: isCreatorLoading } =
		useCreatorDetail(creatorId);
	const { isLive, lastUpdatedAt } = useRealtimeKeyPrice(creatorId, range);

	const data = useMemo(() => points ?? [], [points]);

	const currentPriceStroops = useMemo(
		() => (creator ? resolveCreatorKeyPriceStroops(creator) : null),
		[creator]
	);
	const change24h = creator?.change24h ?? null;
	const volume24hStroops = keyStats?.volume24h ?? null;

	const isChipLoading = isCreatorLoading || isStatsLoading;

	return (
		<section
			className={cn(
				'rounded-4xl border border-white/10 bg-white/2 p-6 shadow-2xl backdrop-blur-md md:p-8',
				className
			)}
			aria-labelledby="bonding-curve-price-chart-heading"
			data-testid="bonding-curve-price-chart"
		>
			<div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3">
					<h2
						id="bonding-curve-price-chart-heading"
						className="font-grotesque text-xl font-black tracking-tight text-white"
					>
						Bonding curve price
					</h2>
					{isLive && (
						<span
							className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-emerald-300"
							data-testid="bonding-curve-chart-live-badge"
							aria-label="Live price updates connected"
						>
							<span
								className="size-1.5 animate-pulse rounded-full bg-emerald-400"
								aria-hidden="true"
							/>
							Live
						</span>
					)}
					{lastUpdatedAt && (
						<span className="sr-only" aria-live="polite">
							Price updated at {new Date(lastUpdatedAt).toLocaleTimeString()}
						</span>
					)}
				</div>

				<div
					className="flex w-fit rounded-lg border border-white/10 bg-black/20 p-1"
					role="group"
					aria-label="Price chart time range"
				>
					{CHART_RANGES.map(option => (
						<button
							key={option.value}
							type="button"
							className={cn(
								'rounded-md px-3 py-1.5 text-xs font-bold tracking-wider transition-colors',
								range === option.value
									? 'bg-emerald-400 text-slate-950'
									: 'text-white/55 hover:bg-white/10 hover:text-white'
							)}
							aria-pressed={range === option.value}
							data-testid={`bonding-curve-chart-range-${option.value}`}
							onClick={() => setRange(option.value)}
						>
							{option.label}
						</button>
					))}
				</div>
			</div>

			{/* Stat chips above the chart (#1115) */}
			<div
				className="mb-6 flex flex-wrap gap-2"
				data-testid="bonding-curve-chart-stats"
				aria-label="Key price statistics"
			>
				<div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1">
					<span className="shrink-0 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-white/42">
						Current price
					</span>
					<span
						className="font-jakarta text-xs font-semibold text-white"
						data-testid="bonding-curve-chart-current-price"
					>
						{isChipLoading && currentPriceStroops == null
							? '—'
							: formatCreatorKeyPriceDisplay(creator ?? {})}
					</span>
				</div>

				<div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1">
					<span className="shrink-0 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-white/42">
						24h change
					</span>
					<span
						className={cn(
							'font-jakarta text-xs font-semibold',
							changeToneClass(change24h)
						)}
						data-testid="bonding-curve-chart-24h-change"
					>
						{isChipLoading && change24h == null
							? '—'
							: formatPercent(change24h, {
									signed: true,
									maximumFractionDigits: 1,
								})}
					</span>
				</div>

				<div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1">
					<span className="shrink-0 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-white/42">
						24h volume
					</span>
					<span
						className="font-jakarta text-xs font-semibold text-white"
						data-testid="bonding-curve-chart-24h-volume"
					>
						{isStatsLoading && volume24hStroops == null
							? '—'
							: formatDisplayKeyPrice(volume24hStroops)}
					</span>
				</div>
			</div>

			{isHistoryLoading ? (
				<div
					className="h-65 w-full rounded-lg"
					role="status"
					aria-label="Loading bonding curve price chart"
					data-testid="bonding-curve-price-chart-skeleton"
				>
					<Skeleton className="h-full w-full" />
				</div>
			) : data.length === 0 ? (
				<div
					className="flex h-65 items-center justify-center text-sm text-white/45"
					data-testid="bonding-curve-price-chart-empty"
				>
					No price data yet for this range
				</div>
			) : (
				<div
					className="h-65 w-full"
					data-testid="bonding-curve-price-chart-series"
				>
					<ResponsiveContainer width="100%" height="100%">
						<LineChart
							data={data}
							margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
						>
							<CartesianGrid stroke="#ffffff12" vertical={false} />
							<XAxis
								dataKey="timestamp"
								stroke="#ffffff55"
								tickLine={false}
								axisLine={false}
								tickFormatter={formatTime}
								minTickGap={32}
							/>
							<YAxis
								dataKey="price"
								stroke="#ffffff55"
								tickLine={false}
								axisLine={false}
								width={52}
								tickFormatter={value => `${value} XLM`}
							/>
							<Tooltip
								contentStyle={{
									backgroundColor: '#0b1728',
									borderColor: '#ffffff22',
									borderRadius: '0.5rem',
									color: '#fff',
								}}
								labelFormatter={formatTime}
								formatter={(value: unknown) => [
									`${String(value)} XLM`,
									'Price',
								]}
							/>
							<Line
								type="monotone"
								dataKey="price"
								stroke="#34d399"
								strokeWidth={2}
								dot={{ fill: '#34d399', r: 3, strokeWidth: 0 }}
								activeDot={{ r: 5 }}
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>
			)}

			<p
				className="mt-3 text-xs text-white/35"
				data-testid="bonding-curve-chart-range-label"
			>
				Showing the last {CHART_RANGES.find(r => r.value === range)?.label}
				{isLive ? ' · updating live' : ''}
			</p>
		</section>
	);
}

export default BondingCurvePriceChart;
