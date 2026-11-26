import React from 'react';
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import Skeleton from '@/components/ui/skeleton';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { DailyEarningsPoint } from '@/types/creatorEarnings';

export interface CreatorEarningsChartProps {
	points?: DailyEarningsPoint[];
	isLoading?: boolean;
	className?: string;
}

const formatDay = (value: unknown) => {
	if (!value) return '';
	const date = new Date(`${String(value)}T00:00:00Z`);
	if (Number.isNaN(date.getTime())) return String(value);
	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		timeZone: 'UTC',
	}).format(date);
};

/**
 * Combined daily earnings line chart for the trailing 30 days (#1258).
 */
export const CreatorEarningsChart: React.FC<CreatorEarningsChartProps> = ({
	points = [],
	isLoading = false,
	className,
}) => {
	const reducedMotion = useReducedMotion();

	return (
		<section
			className={`rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8 ${className ?? ''}`}
			data-testid="earnings-chart-section"
		>
			<div className="mb-6">
				<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
					Combined earnings — last 30 days
				</h2>
				<p className="mt-1 text-xs text-white/50">
					Daily total across royalties, tips, subscriptions, and spotlight
				</p>
			</div>

			{isLoading ? (
				<div
					className="h-72 w-full rounded-xl"
					role="status"
					aria-label="Loading earnings chart"
					data-testid="earnings-chart-skeleton"
				>
					<Skeleton className="h-full w-full rounded-xl" />
				</div>
			) : points.length === 0 ? (
				<div
					className="flex h-72 items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-white/45"
					data-testid="earnings-chart-empty"
				>
					No earnings recorded in the last 30 days
				</div>
			) : (
				<div className="h-72 w-full" data-testid="earnings-chart">
					<ResponsiveContainer width="100%" height="100%">
						<LineChart
							data={points}
							margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
						>
							<CartesianGrid stroke="#ffffff0d" vertical={false} />
							<XAxis
								dataKey="date"
								stroke="#ffffff44"
								tickLine={false}
								axisLine={false}
								tickFormatter={formatDay}
								minTickGap={28}
								tick={{ fontSize: 11 }}
							/>
							<YAxis
								stroke="#ffffff44"
								tickLine={false}
								axisLine={false}
								width={58}
								tickFormatter={value => `${value} XLM`}
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
								labelFormatter={formatDay}
								formatter={(value: unknown) => [
									`${Number(value).toFixed(2)} XLM`,
									'Combined earnings',
								]}
							/>
							<Line
								type="monotone"
								dataKey="totalXlm"
								name="Combined earnings"
								stroke="#34d399"
								strokeWidth={2}
								dot={false}
								isAnimationActive={!reducedMotion}
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>
			)}
		</section>
	);
};

export default CreatorEarningsChart;
