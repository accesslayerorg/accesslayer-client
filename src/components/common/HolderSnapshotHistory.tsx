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
import { useHolderSnapshots } from '@/hooks/useHolderSnapshots';
import type { HolderSnapshotRange } from '@/services/holderSnapshots.service';
import { formatNumber, formatPercent } from '@/utils/numberFormat.utils';
import {
	HOLDER_SNAPSHOT_RANGES,
	buildSnapshotPoints,
	formatGini,
	formatSnapshotDate,
	hasEnoughSnapshotsForTrend,
	latestSnapshot,
	type HolderSnapshotPoint,
} from '@/utils/holderSnapshots.utils';

export interface HolderSnapshotHistoryProps {
	keyId: string;
	className?: string;
	chartHeight?: number;
}

interface SnapshotChartProps {
	title: string;
	testId: string;
	points: HolderSnapshotPoint[];
	dataKey: 'holderCount' | 'top10SharePercent';
	valueFormatter: (value: number) => string;
	color: string;
	height: number;
}

const SnapshotChart: React.FC<SnapshotChartProps> = ({
	title,
	testId,
	points,
	dataKey,
	valueFormatter,
	color,
	height,
}) => (
	<div data-testid={testId} data-snapshot-count={points.length}>
		<h3 className="mb-2 text-sm font-semibold text-white/80">{title}</h3>
		<div
			role="img"
			aria-label={`${title}: ${points.length} snapshot${points.length !== 1 ? 's' : ''}`}
			style={{ height }}
		>
			<ResponsiveContainer width="100%" height="100%">
				<LineChart
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
						// One tick per snapshot so each snapshot date is marked.
						ticks={points.length <= 8 ? points.map(p => p.ts) : undefined}
						tickFormatter={formatSnapshotDate}
						stroke="rgba(255,255,255,0.4)"
						fontSize={11}
					/>
					<YAxis
						stroke="rgba(255,255,255,0.4)"
						fontSize={11}
						width={48}
						tickFormatter={valueFormatter}
						domain={[0, 'auto']}
					/>
					<ChartTooltip
						labelFormatter={label => formatSnapshotDate(Number(label))}
						formatter={value => [valueFormatter(Number(value)), title]}
					/>
					<Line
						type="monotone"
						dataKey={dataKey}
						stroke={color}
						strokeWidth={2}
						// Each dot is a snapshot marker at its real timestamp.
						dot={{ r: 3, fill: color }}
						activeDot={{ r: 5 }}
						isAnimationActive={false}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	</div>
);

/**
 * Holder snapshot history for the key detail analytics section (#1107):
 * holder count and top-10 concentration over time, with a current snapshot
 * stats card. Data is cached for 5 minutes by `useHolderSnapshots`.
 */
export const HolderSnapshotHistory: React.FC<HolderSnapshotHistoryProps> = ({
	keyId,
	className,
	chartHeight = 220,
}) => {
	const [range, setRange] = useState<HolderSnapshotRange>('30d');
	const { data, isLoading, isError } = useHolderSnapshots(keyId, range);

	const points = useMemo(
		() => buildSnapshotPoints(data, range),
		[data, range]
	);
	const latest = latestSnapshot(points);

	return (
		<div
			className={cn('space-y-6', className)}
			data-testid="holder-snapshot-history"
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div
					role="group"
					aria-label="Snapshot range"
					className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1"
				>
					{HOLDER_SNAPSHOT_RANGES.map(option => (
						<button
							key={option.value}
							type="button"
							onClick={() => setRange(option.value)}
							aria-pressed={range === option.value}
							data-testid={`snapshot-range-${option.value}`}
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
					className="space-y-4"
					data-testid="holder-snapshot-loading"
					role="status"
				>
					<Skeleton className="h-20 w-full" />
					<Skeleton className="h-[220px] w-full" />
				</div>
			) : isError ? (
				<p
					role="alert"
					className="text-sm text-red-300"
					data-testid="holder-snapshot-error"
				>
					Couldn&apos;t load holder snapshots. Please try again later.
				</p>
			) : points.length === 0 ? (
				<p
					className="text-sm text-white/60"
					data-testid="holder-snapshot-empty"
				>
					No holder snapshots have been taken for this range yet.
				</p>
			) : (
				<>
					{latest && (
						<dl
							className="grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
							data-testid="holder-snapshot-stats"
						>
							<div>
								<dt className="text-xs text-white/50">Total holders</dt>
								<dd
									className="text-lg font-bold tabular-nums text-white"
									data-testid="stat-total-holders"
								>
									{formatNumber(latest.holderCount)}
								</dd>
							</div>
							<div>
								<dt className="text-xs text-white/50">Top holder</dt>
								<dd
									className="text-lg font-bold tabular-nums text-white"
									data-testid="stat-top-holder"
								>
									{formatPercent(latest.topHolderPercent)}
								</dd>
							</div>
							<div>
								<dt className="text-xs text-white/50">
									Gini coefficient
								</dt>
								<dd
									className="text-lg font-bold tabular-nums text-white"
									data-testid="stat-gini"
								>
									{formatGini(latest.giniCoefficient)}
								</dd>
							</div>
						</dl>
					)}

					{!hasEnoughSnapshotsForTrend(points) && (
						<p
							className="text-xs text-white/50"
							data-testid="holder-snapshot-sparse"
						>
							Only {points.length} snapshot
							{points.length !== 1 ? 's' : ''} so far — trends will fill
							in as more are taken.
						</p>
					)}

					<SnapshotChart
						title="Holder count"
						testId="holder-count-chart"
						points={points}
						dataKey="holderCount"
						valueFormatter={value => formatNumber(value)}
						color="#fbbf24"
						height={chartHeight}
					/>
					<SnapshotChart
						title="Top 10 holders' share of supply"
						testId="top10-concentration-chart"
						points={points}
						dataKey="top10SharePercent"
						valueFormatter={value => formatPercent(value)}
						color="#60a5fa"
						height={chartHeight}
					/>
				</>
			)}
		</div>
	);
};

export default HolderSnapshotHistory;
