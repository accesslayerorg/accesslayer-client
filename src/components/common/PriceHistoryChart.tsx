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
import type {
	PriceHistoryInterval,
	PriceHistoryPoint,
} from '@/services/course.service';

interface PriceHistoryChartProps {
	data?: PriceHistoryPoint[];
	interval: PriceHistoryInterval;
	isLoading: boolean;
	onIntervalChange: (interval: PriceHistoryInterval) => void;
}

const intervals: Array<{ value: PriceHistoryInterval; label: string }> = [
	{ value: '1h', label: '1H' },
	{ value: '24h', label: '24H' },
	{ value: '7d', label: '7D' },
];

const formatTime = (value: ReactNode) =>
	new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	}).format(new Date(String(value)));

export function PriceHistoryChart({
	data = [],
	interval,
	isLoading,
	onIntervalChange,
}: PriceHistoryChartProps) {
	return (
		<section
			className="rounded-4xl border border-white/10 bg-white/2 p-6 shadow-2xl backdrop-blur-md md:p-8"
			aria-labelledby="price-history-heading"
			data-testid="price-history-chart"
		>
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h2
					id="price-history-heading"
					className="font-grotesque text-xl font-black tracking-tight text-white"
				>
					Price history
				</h2>
				<div
					className="flex w-fit rounded-lg border border-white/10 bg-black/20 p-1"
					role="group"
					aria-label="Price history interval"
				>
					{intervals.map(option => (
						<button
							key={option.value}
							type="button"
							className={cn(
								'rounded-md px-3 py-1.5 text-xs font-bold tracking-wider transition-colors',
								interval === option.value
									? 'bg-emerald-400 text-slate-950'
									: 'text-white/55 hover:bg-white/10 hover:text-white'
							)}
							aria-pressed={interval === option.value}
							data-testid={`price-history-interval-${option.value}`}
							onClick={() => onIntervalChange(option.value)}
						>
							{option.label}
						</button>
					))}
				</div>
			</div>

			{isLoading ? (
				<div
					className="h-65 w-full rounded-lg"
					role="status"
					aria-label="Loading price history"
					data-testid="price-history-skeleton"
				>
					<Skeleton className="h-full w-full" />
				</div>
			) : data.length === 0 ? (
				<div
					className="flex h-65 items-center justify-center text-sm text-white/45"
					data-testid="price-history-empty"
				>
					No price history yet
				</div>
			) : (
				<div className="h-65 w-full" data-testid="price-history-series">
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
		</section>
	);
}
