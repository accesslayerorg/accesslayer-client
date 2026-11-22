import { useMemo } from 'react';
import {
	Area,
	AreaChart,
	CartesianGrid,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import Skeleton from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useKeyDepth } from '@/hooks/useKeyDepth';
import { KEY_DEPTH_LEVELS } from '@/services/keyDepth.service';
import {
	buildDepthChartModel,
	formatDepthPrice,
	formatDepthPriceTick,
	type DepthChartPoint,
} from '@/utils/keyDepthChart.utils';
import { formatCompactNumber, formatNumber } from '@/utils/numberFormat.utils';

export interface KeyDepthChartProps {
	/** Key whose order book is charted. */
	keyId: string;
	/** Number of price levels requested per side of the book. */
	levels?: number;
	className?: string;
}

const BID_COLOR = '#34d399';
const ASK_COLOR = '#f87171';

/**
 * Market depth chart for a key (#1220).
 *
 * Renders the open buy orders (bids, green) and sell listings (asks, red) as
 * two cumulative step areas mirrored around the mid price: the bid ladder
 * climbs to the left of the mid marker, the ask ladder climbs to the right,
 * and the x-axis shows the price levels. The snapshot is polled every five
 * seconds and updated in place, so the chart never re-renders from scratch.
 */
export function KeyDepthChart({
	keyId,
	levels = KEY_DEPTH_LEVELS,
	className,
}: KeyDepthChartProps) {
	const isMobile = useIsMobile();
	const { data, isLoading, isError, isFetching } = useKeyDepth(keyId, levels);

	const model = useMemo(() => buildDepthChartModel(data), [data]);

	// The mid marker is centred on the plot area, so the overlay that carries
	// the spread badge has to use the very same insets as the chart itself.
	const yAxisWidth = isMobile ? 40 : 48;
	const chartMargin = { top: 44, right: 12, left: 0, bottom: 0 };
	const plotCentreStyle = {
		left: `calc(${yAxisWidth}px + (100% - ${yAxisWidth + chartMargin.right}px) / 2)`,
	};

	const hasData = model.points.length > 0;
	const showSkeleton = isLoading && !data;
	const showError = isError && !data && !isLoading;
	const showEmpty = !showSkeleton && !showError && !hasData;

	const spreadAmount = formatDepthPrice(model.spread);
	const spreadPercentLabel =
		model.spreadPercent == null ? '' : ` (${model.spreadPercent.toFixed(2)}%)`;
	const spreadLabel =
		model.spread == null ? '—' : `${spreadAmount}${spreadPercentLabel}`;

	return (
		<section
			className={cn(
				'rounded-4xl border border-white/10 bg-white/2 p-6 shadow-2xl backdrop-blur-md md:p-8',
				className
			)}
			aria-labelledby="key-depth-chart-heading"
			aria-busy={showSkeleton}
			data-testid="key-depth-chart"
		>
			<div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3">
					<h2
						id="key-depth-chart-heading"
						className="font-grotesque text-xl font-black tracking-tight text-white"
					>
						Market depth
					</h2>
					{isFetching && !isLoading && (
						<span
							className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-white/50"
							data-testid="key-depth-chart-refreshing"
						>
							<span
								className="size-1.5 animate-pulse rounded-full bg-white/50"
								aria-hidden="true"
							/>
							Updating
						</span>
					)}
				</div>

				<div
					className="flex flex-wrap items-center gap-4 text-[0.7rem] font-semibold uppercase tracking-wider text-white/50"
					data-testid="key-depth-chart-legend"
				>
					<span className="flex items-center gap-1.5">
						<span
							className="size-2.5 rounded-sm"
							style={{ backgroundColor: BID_COLOR }}
							aria-hidden="true"
						/>
						Bids
					</span>
					<span className="flex items-center gap-1.5">
						<span
							className="size-2.5 rounded-sm"
							style={{ backgroundColor: ASK_COLOR }}
							aria-hidden="true"
						/>
						Asks
					</span>
				</div>
			</div>

			{/* Book summary above the chart (#1220) */}
			<div
				className="mb-6 flex flex-wrap gap-2"
				data-testid="key-depth-chart-stats"
				aria-label="Order book summary"
			>
				<div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1">
					<span className="shrink-0 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-white/42">
						Best bid
					</span>
					<span
						className="font-jakarta text-xs font-semibold text-emerald-300"
						data-testid="key-depth-best-bid"
					>
						{hasData ? formatDepthPrice(model.bestBid) : '—'}
					</span>
				</div>

				<div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1">
					<span className="shrink-0 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-white/42">
						Best ask
					</span>
					<span
						className="font-jakarta text-xs font-semibold text-red-300"
						data-testid="key-depth-best-ask"
					>
						{hasData ? formatDepthPrice(model.bestAsk) : '—'}
					</span>
				</div>

				<div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1">
					<span className="shrink-0 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-white/42">
						Mid price
					</span>
					<span
						className="font-jakarta text-xs font-semibold text-white"
						data-testid="key-depth-mid-price"
					>
						{hasData ? formatDepthPrice(model.midPrice) : '—'}
					</span>
				</div>

				<div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1">
					<span className="shrink-0 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-white/42">
						Spread
					</span>
					<span
						className="font-jakarta text-xs font-semibold text-white"
						data-testid="key-depth-spread"
					>
						{hasData ? spreadLabel : '—'}
					</span>
				</div>
			</div>

			{showSkeleton ? (
				<div
					className="h-60 w-full rounded-lg sm:h-72 lg:h-80"
					role="status"
					aria-label="Loading market depth chart"
					data-testid="key-depth-chart-skeleton"
				>
					<Skeleton className="h-full w-full" />
				</div>
			) : showError ? (
				<div
					className="flex h-60 w-full items-center justify-center text-sm text-white/45 sm:h-72 lg:h-80"
					role="alert"
					data-testid="key-depth-chart-error"
				>
					Market depth is temporarily unavailable.
				</div>
			) : showEmpty ? (
				<div
					className="flex h-60 w-full items-center justify-center text-sm text-white/45 sm:h-72 lg:h-80"
					data-testid="key-depth-chart-empty"
				>
					No open orders for this key yet
				</div>
			) : (
				<div
					className="relative h-60 w-full sm:h-72 lg:h-80"
					data-testid="key-depth-chart-series"
				>
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart
							data={model.points}
							margin={chartMargin}
						>
							<defs>
								<linearGradient
									id="key-depth-bid-fill"
									x1="0"
									y1="0"
									x2="0"
									y2="1"
								>
									<stop
										offset="0%"
										stopColor={BID_COLOR}
										stopOpacity={0.45}
									/>
									<stop
										offset="100%"
										stopColor={BID_COLOR}
										stopOpacity={0.04}
									/>
								</linearGradient>
								<linearGradient
									id="key-depth-ask-fill"
									x1="0"
									y1="0"
									x2="0"
									y2="1"
								>
									<stop
										offset="0%"
										stopColor={ASK_COLOR}
										stopOpacity={0.45}
									/>
									<stop
										offset="100%"
										stopColor={ASK_COLOR}
										stopOpacity={0.04}
									/>
								</linearGradient>
							</defs>

							<CartesianGrid stroke="#ffffff12" vertical={false} />
							<XAxis
								type="number"
								dataKey="price"
								domain={model.domain}
								stroke="#ffffff55"
								tickLine={false}
								axisLine={false}
								tickCount={isMobile ? 4 : 6}
								tickFormatter={formatDepthPriceTick}
								allowDecimals
							/>
							<YAxis
								stroke="#ffffff55"
								tickLine={false}
								axisLine={false}
								width={yAxisWidth}
								tickFormatter={(value: number) =>
									formatCompactNumber(value)
								}
							/>
							<Tooltip
								contentStyle={{
									backgroundColor: '#0b1728',
									borderColor: '#ffffff22',
									borderRadius: '0.5rem',
									color: '#fff',
								}}
								labelFormatter={(label: unknown) =>
									formatDepthPrice(Number(label))
								}
								formatter={(
									value: unknown,
									name: unknown,
									item: unknown
								): [string, string] | null => {
									if (value == null) return null;

									const point = (item as { payload?: DepthChartPoint })
										?.payload;
									const isBid = name === 'bidVolume';
									const levelVolume = point
										? isBid
											? point.bidAmount
											: point.askAmount
										: 0;
									const cumulative =
										typeof value === 'number'
											? value
											: Number(value);

									return [
										`${formatNumber(levelVolume)} keys · ${formatNumber(cumulative)} cumulative`,
										isBid ? 'Bids' : 'Asks',
									];
								}}
							/>

							{model.midPrice != null && (
								<ReferenceLine
									x={model.midPrice}
									stroke="#ffffff66"
									strokeDasharray="4 4"
								/>
							)}

							<Area
								type="stepAfter"
								dataKey="bidVolume"
								stroke={BID_COLOR}
								strokeWidth={2}
								fill="url(#key-depth-bid-fill)"
								isAnimationActive={false}
								connectNulls={false}
							/>
							<Area
								type="stepAfter"
								dataKey="askVolume"
								stroke={ASK_COLOR}
								strokeWidth={2}
								fill="url(#key-depth-ask-fill)"
								isAnimationActive={false}
								connectNulls={false}
							/>
						</AreaChart>
					</ResponsiveContainer>

					{/* Mid-price marker and spread badge, centred on the plot (#1220) */}
					{model.midPrice != null && (
						<div
							className="pointer-events-none absolute inset-0"
							aria-hidden="true"
						>
							<div
								className="absolute top-1 -translate-x-1/2 rounded-lg border border-white/15 bg-slate-950/90 px-2.5 py-1 text-center shadow-lg"
								style={plotCentreStyle}
								data-testid="key-depth-chart-mid-marker"
								data-mid-price={model.midPrice}
								data-best-bid={model.bestBid ?? ''}
								data-best-ask={model.bestAsk ?? ''}
							>
								<span className="block whitespace-nowrap font-mono text-[0.65rem] font-semibold text-white">
									Mid {formatDepthPrice(model.midPrice)}
								</span>
								<span
									className="block whitespace-nowrap font-mono text-[0.6rem] text-amber-300/90"
									data-testid="key-depth-chart-spread-marker"
								>
									Spread {formatDepthPrice(model.spread)}
								</span>
							</div>
						</div>
					)}
				</div>
			)}

			<p className="mt-3 text-xs text-white/35" data-testid="key-depth-chart-caption">
				Price per fraction (XLM) · Cumulative volume (keys) · refreshed every 5s
			</p>
		</section>
	);
}

export default KeyDepthChart;
