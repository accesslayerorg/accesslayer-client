import { useState } from 'react';
import {
	CartesianGrid,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip as RechartsTooltip,
	XAxis,
	YAxis,
	LineChart,
	Line,
} from 'recharts';
import Skeleton from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useKeyFeeHistory, type FeeHistoryRange } from '@/hooks/useKeyFeeHistory';

interface KeyFeeHistoryChartProps {
	keyId: string;
	className?: string;
}

const RANGE_OPTIONS: Array<{ value: FeeHistoryRange; label: string }> = [
	{ value: '7d', label: '7D' },
	{ value: '30d', label: '30D' },
	{ value: 'all', label: 'All' },
];

function formatTimestamp(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatBps(bps: number): string {
	return `${(bps / 100).toFixed(2)}%`;
}

interface TooltipPayload {
	payload?: { timestamp: string; feeBps: number; bracketLabel?: string };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
	if (!active || !payload?.length) return null;
	const point = payload[0]?.payload;
	if (!point) return null;
	return (
		<div className="rounded-lg border border-white/15 bg-[#0a1929] px-3 py-2 text-xs shadow-xl">
			<p className="text-white/60">{formatTimestamp(point.timestamp)}</p>
			<p className="mt-1 font-semibold text-amber-300">
				Fee: {formatBps(point.feeBps)}
			</p>
			{point.bracketLabel && (
				<p className="text-white/50">{point.bracketLabel}</p>
			)}
		</div>
	);
}

export default function KeyFeeHistoryChart({ keyId, className }: KeyFeeHistoryChartProps) {
	const [range, setRange] = useState<FeeHistoryRange>('30d');
	const { data, isLoading, isError, refetch } = useKeyFeeHistory(keyId, range);

	const hasData = (data?.points?.length ?? 0) > 0;

	return (
		<section
			className={cn(
				'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8',
				className
			)}
			aria-labelledby="fee-history-heading"
		>
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400/80">
						Dynamic Fees
					</p>
					<h2
						id="fee-history-heading"
						className="mt-1 font-grotesque text-xl font-black tracking-tight text-white"
					>
						Fee History
					</h2>
				</div>

				<div className="flex items-center gap-1">
					{data && (
						<span
							className="mr-3 inline-flex items-center rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300"
							aria-label={`Current fee: ${formatBps(data.currentFeeBps)}${data.currentBracketLabel ? ` — ${data.currentBracketLabel}` : ''}`}
						>
							{formatBps(data.currentFeeBps)}
							{data.currentBracketLabel && (
								<span className="ml-1 text-amber-400/60">
									· {data.currentBracketLabel}
								</span>
							)}
						</span>
					)}

					<div
						role="group"
						aria-label="Time range selector"
						className="flex rounded-xl border border-white/10 bg-white/[0.03] p-0.5"
					>
						{RANGE_OPTIONS.map(opt => (
							<button
								key={opt.value}
								type="button"
								onClick={() => setRange(opt.value)}
								aria-pressed={range === opt.value}
								className={cn(
									'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
									range === opt.value
										? 'bg-amber-500/20 text-amber-300'
										: 'text-white/45 hover:text-white/75'
								)}
							>
								{opt.label}
							</button>
						))}
					</div>
				</div>
			</div>

			<div className="mt-6">
				{isLoading && (
					<div aria-busy="true" aria-label="Loading fee history">
						<Skeleton className="h-[220px] w-full rounded-xl" />
					</div>
				)}

				{isError && (
					<div className="flex h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10">
						<p className="text-sm text-white/50">Failed to load fee history.</p>
						<button
							type="button"
							onClick={() => void refetch()}
							className="rounded-lg border border-white/15 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-white/70 transition-colors hover:bg-white/[0.09]"
						>
							Retry
						</button>
					</div>
				)}

				{!isLoading && !isError && !hasData && (
					<div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-white/10">
						<p className="text-sm text-white/40">No fee history for this period.</p>
					</div>
				)}

				{!isLoading && !isError && hasData && (
					<ResponsiveContainer width="100%" height={220}>
						<LineChart
							data={data!.points}
							margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
						>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke="rgba(255,255,255,0.06)"
								vertical={false}
							/>
							<XAxis
								dataKey="timestamp"
								tickFormatter={formatTimestamp}
								tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
								axisLine={false}
								tickLine={false}
								minTickGap={40}
							/>
							<YAxis
								tickFormatter={formatBps}
								tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
								axisLine={false}
								tickLine={false}
								width={48}
							/>
							<RechartsTooltip
								content={<CustomTooltip />}
								cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}
							/>
							{/* Bracket threshold markers */}
							{data!.bracketThresholds?.map(threshold => (
								<ReferenceLine
									key={threshold.feeBps}
									y={threshold.feeBps}
									stroke="rgba(251,191,36,0.3)"
									strokeDasharray="4 4"
									label={{
										value: threshold.label,
										fill: 'rgba(251,191,36,0.5)',
										fontSize: 10,
										position: 'right',
									}}
								/>
							))}
							<Line
								type="step"
								dataKey="feeBps"
								stroke="#f59e0b"
								strokeWidth={2}
								dot={false}
								activeDot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
								isAnimationActive={false}
							/>
						</LineChart>
					</ResponsiveContainer>
				)}
			</div>
		</section>
	);
}
