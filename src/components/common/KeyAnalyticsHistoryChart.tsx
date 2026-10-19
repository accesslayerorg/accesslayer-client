import React, { useMemo, useState } from 'react';
import {
	ResponsiveContainer,
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip as ChartTooltip,
	CartesianGrid,
} from 'recharts';
import { cn } from '@/lib/utils';
import Skeleton from '@/components/ui/skeleton';
import { useKeySnapshotHistory } from '@/hooks/useKeySnapshotHistory';
import type { SnapshotMetric } from '@/services/keySnapshotHistory.service';
import type { SnapshotHistoryRange } from '@/services/keySnapshotHistory.service';
import {
	SNAPSHOT_HISTORY_RANGES,
	SNAPSHOT_METRICS,
	buildSnapshotHistoryPoints,
	formatMetricValue,
	formatSnapshotAxisDate,
	hasSnapshotHistoryData,
	metricDataKey,
	metricLabel,
} from '@/utils/keySnapshotHistory.utils';

export interface KeyAnalyticsHistoryChartProps {
	keyId: string;
	className?: string;
	chartHeight?: number;
}

const METRIC_COLOR: Record<SnapshotMetric, string> = {
	price: '#fbbf24',
	volume: '#60a5fa',
	holders: '#34d399',
	marketCap: '#f472b6',
};

/**
 * Historical performance chart for the key detail page (#1142): daily
 * price, volume, holder count, and market cap from on-chain snapshots, with
 * a metric tab selector and a date range picker. Data is fetched from
 * `GET /keys/:key_id/snapshots?range=X` and cached for 5 minutes.
 */
export const KeyAnalyticsHistoryChart: React.FC<
	KeyAnalyticsHistoryChartProps
> = ({ keyId, className, chartHeight = 260 }) => {
	const [metric, setMetric] = useState<SnapshotMetric>('price');
	const [range, setRange] = useState<SnapshotHistoryRange>('30d');

	const { data, isLoading, isError } = useKeySnapshotHistory(keyId, range);

	const points = useMemo(
		() => buildSnapshotHistoryPoints(data, range),
		[data, range]
	);
	const dataKey = metricDataKey(metric);
	const color = METRIC_COLOR[metric];

	return (
		<div
			className={cn('space-y-4', className)}
			data-testid="key-analytics-history-chart"
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div
					role="tablist"
					aria-label="Analytics metric"
					className="inline-flex flex-wrap rounded-xl border border-white/10 bg-white/[0.03] p-1"
				>
					{SNAPSHOT_METRICS.map(option => (
						<button
							key={option.value}
							type="button"
							role="tab"
							aria-selected={metric === option.value}
							onClick={() => setMetric(option.value)}
							data-testid={`analytics-metric-${option.value}`}
							className={cn(
								'rounded-lg px-3 py-1 text-xs font-semibold transition-colors',
								metric === option.value
									? 'bg-amber-400/20 text-amber-200'
									: 'text-white/55 hover:text-white'
							)}
						>
							{option.label}
						</button>
					))}
				</div>

				<div
					role="group"
					aria-label="Date range"
					className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1"
				>
					{SNAPSHOT_HISTORY_RANGES.map(option => (
						<button
							key={option.value}
							type="button"
							onClick={() => setRange(option.value)}
							aria-pressed={range === option.value}
							data-testid={`analytics-range-${option.value}`}
							className={cn(
								'rounded-lg px-3 py-1 text-xs font-semibold transition-colors',
								range === option.value
									? 'bg-amber-400/20 text-amber-200'
									: 'text-white/55 hover:text-white'
							)}
						>
							{option.label}
						</button>
					))}
				</div>
			</div>

			{isLoading ? (
				<div
					data-testid="key-analytics-history-loading"
					role="status"
					style={{ height: chartHeight }}
				>
					<Skeleton className="h-full w-full" />
				</div>
			) : isError ? (
				<p
					role="alert"
					className="text-sm text-red-300"
					data-testid="key-analytics-history-error"
				>
					Couldn&apos;t load analytics history. Please try again later.
				</p>
			) : !hasSnapshotHistoryData(points) ? (
				<p
					className="text-sm text-white/60"
					data-testid="key-analytics-history-empty"
				>
					No snapshots available for this range yet.
				</p>
			) : (
				<div
					role="img"
					aria-label={`${metricLabel(metric)} history: ${points.length} snapshot${points.length !== 1 ? 's' : ''}`}
					style={{ height: chartHeight }}
					data-testid="key-analytics-history-plot"
				>
					<ResponsiveContainer width="100%" height="100%">
						<LineChart
							key={metric}
							data={points}
							margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
						>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke="rgba(255,255,255,0.08)"
							/>
							<XAxis
								dataKey="ts"
								type="number"
								scale="time"
								domain={['dataMin', 'dataMax']}
								tickFormatter={formatSnapshotAxisDate}
								stroke="rgba(255,255,255,0.4)"
								fontSize={11}
							/>
							<YAxis
								stroke="rgba(255,255,255,0.4)"
								fontSize={11}
								width={56}
								tickFormatter={value =>
									formatMetricValue(metric, Number(value))
								}
								domain={[0, 'auto']}
							/>
							<ChartTooltip
								labelFormatter={label =>
									formatSnapshotAxisDate(Number(label))
								}
								formatter={value => [
									formatMetricValue(metric, Number(value)),
									metricLabel(metric),
								]}
							/>
							<Line
								type="monotone"
								dataKey={dataKey}
								stroke={color}
								strokeWidth={2}
								dot={points.length <= 30}
								activeDot={{ r: 5 }}
								// Sparse data (gaps in snapshot days) should not be
								// bridged by a straight line across the missing days.
								connectNulls={false}
								isAnimationActive={false}
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>
			)}
		</div>
	);
};

export default KeyAnalyticsHistoryChart;
