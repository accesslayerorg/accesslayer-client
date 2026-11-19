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
import type {
	RevenueHistoryPoint,
	RevenueTimeRange,
} from '@/types/creatorRevenue';

export interface CreatorRevenueChartProps {
	data?: RevenueHistoryPoint[];
	interval: RevenueTimeRange;
	isLoading?: boolean;
	onIntervalChange: (interval: RevenueTimeRange) => void;
	className?: string;
}

const INTERVAL_OPTIONS: Array<{ value: RevenueTimeRange; label: string }> = [
	{ value: '24h', label: '24H' },
	{ value: '7d', label: '7D' },
	{ value: '30d', label: '30D' },
	{ value: 'all', label: 'ALL' },
];

const formatTimestamp = (val: unknown) => {
	if (!val) return '';
	const date = new Date(String(val));
	if (isNaN(date.getTime())) return String(val);
	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(date);
};

export const CreatorRevenueChart: React.FC<CreatorRevenueChartProps> = ({
	data = [],
	interval,
	isLoading = false,
	onIntervalChange,
	className,
}) => {
	return (
		<div
			className={cn(
				'rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-md',
				className
			)}
			data-testid="creator-revenue-chart"
		>
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h3 className="font-grotesque text-xl font-black tracking-tight text-white">
						Earnings Breakdown Over Time
					</h3>
					<p className="mt-1 text-xs text-white/50">
						Track incoming royalties, subscriptions, and dividend deposits
					</p>
				</div>

				<div
					className="flex w-fit rounded-xl border border-white/10 bg-black/30 p-1"
					role="group"
					aria-label="Revenue history interval"
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
							data-testid={`revenue-chart-interval-${opt.value}`}
							onClick={() => onIntervalChange(opt.value)}
						>
							{opt.label}
						</button>
					))}
				</div>
			</div>

			{/* Source Indicators / Legend */}
			<div className="mb-4 flex flex-wrap items-center gap-4 text-xs font-medium text-white/70">
				<div
					className="flex items-center gap-1.5"
					data-testid="legend-royalties"
				>
					<span className="size-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
					<span>Royalties</span>
				</div>
				<div
					className="flex items-center gap-1.5"
					data-testid="legend-subscriptions"
				>
					<span className="size-2.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]" />
					<span>Subscription Fees</span>
				</div>
				<div
					className="flex items-center gap-1.5"
					data-testid="legend-dividends"
				>
					<span className="size-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
					<span>Dividend Deposits</span>
				</div>
				<div
					className="flex items-center gap-1.5"
					data-testid="legend-total"
				>
					<span className="size-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
					<span>Total</span>
				</div>
			</div>

			{isLoading ? (
				<div
					className="h-72 w-full rounded-xl"
					role="status"
					aria-label="Loading revenue chart"
					data-testid="revenue-chart-skeleton"
				>
					<Skeleton className="h-full w-full rounded-xl" />
				</div>
			) : data.length === 0 ? (
				<div
					className="flex h-72 items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-white/45"
					data-testid="revenue-chart-empty"
				>
					No revenue data recorded for this time range yet
				</div>
			) : (
				<div className="h-72 w-full" data-testid="revenue-chart-container">
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart
							data={data}
							margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
						>
							<defs>
								<linearGradient
									id="colorRoyalties"
									x1="0"
									y1="0"
									x2="0"
									y2="1"
								>
									<stop
										offset="5%"
										stopColor="#34d399"
										stopOpacity={0.4}
									/>
									<stop
										offset="95%"
										stopColor="#34d399"
										stopOpacity={0.0}
									/>
								</linearGradient>
								<linearGradient
									id="colorSubscriptions"
									x1="0"
									y1="0"
									x2="0"
									y2="1"
								>
									<stop
										offset="5%"
										stopColor="#818cf8"
										stopOpacity={0.4}
									/>
									<stop
										offset="95%"
										stopColor="#818cf8"
										stopOpacity={0.0}
									/>
								</linearGradient>
								<linearGradient
									id="colorDividends"
									x1="0"
									y1="0"
									x2="0"
									y2="1"
								>
									<stop
										offset="5%"
										stopColor="#fbbf24"
										stopOpacity={0.4}
									/>
									<stop
										offset="95%"
										stopColor="#fbbf24"
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
								tickFormatter={val => `${val} XLM`}
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
								formatter={(value: unknown, name: unknown) => {
									const labelMap: Record<string, string> = {
										royalties: 'Royalties',
										subscriptionFees: 'Subscriptions',
										dividendDeposits: 'Dividends',
										total: 'Total',
									};
									const label = labelMap[String(name)] ?? String(name);
									return [`${Number(value).toFixed(2)} XLM`, label];
								}}
							/>
							<Area
								type="monotone"
								dataKey="royalties"
								stroke="#34d399"
								strokeWidth={2}
								fillOpacity={1}
								fill="url(#colorRoyalties)"
								name="royalties"
							/>
							<Area
								type="monotone"
								dataKey="subscriptionFees"
								stroke="#818cf8"
								strokeWidth={2}
								fillOpacity={1}
								fill="url(#colorSubscriptions)"
								name="subscriptionFees"
							/>
							<Area
								type="monotone"
								dataKey="dividendDeposits"
								stroke="#fbbf24"
								strokeWidth={2}
								fillOpacity={1}
								fill="url(#colorDividends)"
								name="dividendDeposits"
							/>
						</AreaChart>
					</ResponsiveContainer>
				</div>
			)}
		</div>
	);
};

export default CreatorRevenueChart;
