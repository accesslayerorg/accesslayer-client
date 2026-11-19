import React from 'react';
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import Skeleton from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCompactNumber } from '@/utils/numberFormat.utils';
import type {
	ProtocolHistoryPoint,
	ProtocolTimeRange,
} from '@/services/analytics.service';

export interface ProtocolAnalyticsChartProps {
	title: string;
	description?: string;
	data?: ProtocolHistoryPoint[];
	/** Which series to plot from each history point. */
	dataKey: 'tvl' | 'volume';
	/** Stroke / gradient color for the plotted series. */
	color: string;
	/** Unique id for the gradient fill definition. */
	gradientId: string;
	interval: ProtocolTimeRange;
	onIntervalChange: (interval: ProtocolTimeRange) => void;
	isLoading?: boolean;
	className?: string;
	testId: string;
}

const INTERVAL_OPTIONS: Array<{ value: ProtocolTimeRange; label: string }> = [
	{ value: '7d', label: '7D' },
	{ value: '30d', label: '30D' },
	{ value: '90d', label: '90D' },
];

const formatTimestamp = (val: unknown) => {
	if (!val) return '';
	const date = new Date(String(val));
	if (isNaN(date.getTime())) return String(val);
	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
	}).format(date);
};

export const ProtocolAnalyticsChart: React.FC<ProtocolAnalyticsChartProps> = ({
	title,
	description,
	data = [],
	dataKey,
	color,
	gradientId,
	interval,
	onIntervalChange,
	isLoading = false,
	className,
	testId,
}) => {
	return (
		<div
			className={cn(
				'rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-md',
				className
			)}
			data-testid={testId}
		>
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h3 className="font-grotesque text-xl font-black tracking-tight text-white">
						{title}
					</h3>
					{description && (
						<p className="mt-1 text-xs text-white/50">{description}</p>
					)}
				</div>

				<div
					className="flex w-fit rounded-xl border border-white/10 bg-black/30 p-1"
					role="group"
					aria-label={`${title} time range`}
				>
					{INTERVAL_OPTIONS.map(opt => (
						<button
							key={opt.value}
							type="button"
							className={cn(
								'rounded-lg px-3 py-1.5 text-xs font-bold tracking-wider transition-colors',
								interval === opt.value
									? 'bg-emerald-400 text-slate-950 shadow-sm'
									: 'text-white/55 hover:bg-white/10 hover:text-white'
							)}
							aria-pressed={interval === opt.value}
							data-testid={`${testId}-interval-${opt.value}`}
							onClick={() => onIntervalChange(opt.value)}
						>
							{opt.label}
						</button>
					))}
				</div>
			</div>

			{isLoading ? (
				<div
					className="h-72 w-full rounded-xl"
					role="status"
					aria-label={`Loading ${title}`}
					data-testid={`${testId}-skeleton`}
				>
					<Skeleton className="h-full w-full rounded-xl" />
				</div>
			) : data.length === 0 ? (
				<div
					className="flex h-72 items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-white/45"
					data-testid={`${testId}-empty`}
				>
					No data recorded for this time range yet
				</div>
			) : (
				<div className="h-72 w-full" data-testid={`${testId}-container`}>
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart
							data={data}
							margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
						>
							<defs>
								<linearGradient
									id={gradientId}
									x1="0"
									y1="0"
									x2="0"
									y2="1"
								>
									<stop
										offset="5%"
										stopColor={color}
										stopOpacity={0.4}
									/>
									<stop
										offset="95%"
										stopColor={color}
										stopOpacity={0.0}
									/>
								</linearGradient>
							</defs>
							<CartesianGrid stroke="#ffffff0d" vertical={false} />
							<XAxis
								dataKey="timestamp"
								stroke="#ffffff44"
								tickLine={false}
								axisLine={false}
								tickFormatter={formatTimestamp}
								minTickGap={28}
								tick={{ fontSize: 11 }}
							/>
							<YAxis
								stroke="#ffffff44"
								tickLine={false}
								axisLine={false}
								width={58}
								tickFormatter={val => formatCompactNumber(val)}
								tick={{ fontSize: 11 }}
							/>
							<Tooltip
								contentStyle={{
									backgroundColor: '#071221',
									borderColor: '#ffffff22',
									borderRadius: '0.75rem',
									color: '#fff',
									fontSize: '12px',
									boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
								}}
								labelFormatter={formatTimestamp}
								formatter={(value: unknown) => [
									`${formatCompactNumber(Number(value))} XLM`,
									dataKey === 'tvl' ? 'TVL' : 'Volume',
								]}
							/>
							<Area
								type="monotone"
								dataKey={dataKey}
								stroke={color}
								strokeWidth={2}
								fillOpacity={1}
								fill={`url(#${gradientId})`}
								name={dataKey}
							/>
						</AreaChart>
					</ResponsiveContainer>
				</div>
			)}
		</div>
	);
};

export default ProtocolAnalyticsChart;
