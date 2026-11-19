import { useState } from 'react';
import {
	Bar,
	CartesianGrid,
	ComposedChart,
	Line,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import type { ReactNode } from 'react';
import Skeleton from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type {
	SecondaryPricePoint,
	SecondaryPriceRange,
} from '@/services/secondaryPrices.service';

interface SecondaryMarketPriceChartProps {
	data?: SecondaryPricePoint[];
	isLoading: boolean;
	onRangeChange: (range: SecondaryPriceRange) => void;
}

const ranges: Array<{ value: SecondaryPriceRange; label: string }> = [
	{ value: '7d', label: '7D' },
	{ value: '30d', label: '30D' },
	{ value: 'all', label: 'All Time' },
];

const formatTime = (value: ReactNode) =>
	new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
	}).format(new Date(String(value)));

/**
 * Secondary market price history chart (#1234).
 *
 * Plots trade price per fraction over time with volume bars underneath,
 * plus a 7d / 30d / All Time range selector and an empty state for keys
 * with no secondary market trades.
 */
export function SecondaryMarketPriceChart({
	data = [],
	isLoading,
	onRangeChange,
}: SecondaryMarketPriceChartProps) {
	const [range, setRange] = useState<SecondaryPriceRange>('7d');

	const handleRangeChange = (next: SecondaryPriceRange) => {
		setRange(next);
		onRangeChange(next);
	};

	return (
		<section
			className="rounded-4xl border border-white/10 bg-white/2 p-6 shadow-2xl backdrop-blur-md md:p-8"
			aria-labelledby="secondary-market-price-heading"
			data-testid="secondary-market-price-chart"
		>
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<h2
					id="secondary-market-price-heading"
					className="font-grotesque text-xl font-black tracking-tight text-white"
				>
					Secondary market price
				</h2>
				<div
					className="flex w-fit rounded-lg border border-white/10 bg-black/20 p-1"
					role="group"
					aria-label="Secondary market price range"
				>
					{ranges.map(option => (
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
							data-testid={`secondary-market-range-${option.value}`}
							onClick={() => handleRangeChange(option.value)}
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
					aria-label="Loading secondary market price history"
					data-testid="secondary-market-skeleton"
				>
					<Skeleton className="h-full w-full" />
				</div>
			) : data.length === 0 ? (
				<div
					className="flex h-65 items-center justify-center text-sm text-white/45"
					data-testid="secondary-market-empty"
				>
					No secondary market trades yet
				</div>
			) : (
				<div className="h-65 w-full" data-testid="secondary-market-series">
					<ResponsiveContainer width="100%" height="100%">
						<ComposedChart
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
								yAxisId="price"
								dataKey="price"
								stroke="#ffffff55"
								tickLine={false}
								axisLine={false}
								width={52}
								tickFormatter={value => `${value} XLM`}
							/>
							<YAxis
								yAxisId="volume"
								orientation="right"
								dataKey="volume"
								stroke="#ffffff33"
								tickLine={false}
								axisLine={false}
								width={40}
							/>
							<Tooltip
								contentStyle={{
									backgroundColor: '#0b1728',
									borderColor: '#ffffff22',
									borderRadius: '0.5rem',
									color: '#fff',
								}}
								labelFormatter={formatTime}
								formatter={(value: unknown, name: unknown) => [
									name === 'price'
										? `${String(value)} XLM`
										: String(value),
									name === 'price' ? 'Price' : 'Volume',
								]}
							/>
							<Bar
								yAxisId="volume"
								dataKey="volume"
								fill="#34d39933"
								barSize={8}
							/>
							<Line
								yAxisId="price"
								type="monotone"
								dataKey="price"
								stroke="#34d399"
								strokeWidth={2}
								dot={{ fill: '#34d399', r: 3, strokeWidth: 0 }}
								activeDot={{ r: 5 }}
							/>
						</ComposedChart>
					</ResponsiveContainer>
				</div>
			)}
		</section>
	);
}

export default SecondaryMarketPriceChart;
