import { useMemo, useState } from 'react';
import { AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import {
	PORTFOLIO_HISTORY_RANGES,
	buildPortfolioChartSeries,
	computeBenchmarkReturnPercent,
	computePortfolioReturnPercent,
	filterHistoryByRange,
	formatPortfolioHistoryDate,
	formatPortfolioReturnPercent,
	formatPortfolioValueXlm,
	type PortfolioHistoryPoint,
	type PortfolioHistoryRange,
} from '@/utils/portfolioHistory.utils';
import {
	getPnLTone,
	getPnLToneChipClassName,
} from '@/utils/portfolioValue.utils';

const PORTFOLIO_LINE_COLOR = '#34d399';
const BENCHMARK_LINE_COLOR = '#60a5fa';

export interface PortfolioPerformanceChartProps {
	/** Portfolio value samples, oldest to newest (unsorted input is normalized). */
	data?: PortfolioHistoryPoint[];
	isLoading?: boolean;
	/** Error message to surface in place of the chart; `null` when healthy. */
	error?: string | null;
	onRetry?: () => void;
	/** Range selected on first render. Defaults to 30 days. */
	defaultRange?: PortfolioHistoryRange;
	className?: string;
}

/**
 * Portfolio performance chart (#1052).
 *
 * Plots the total value of every held creator key over time with 7d/30d/90d/all
 * range selectors, an optional benchmark comparison line, a value+date tooltip,
 * and the percentage return from the first to the last visible data point. The
 * component is presentational: the caller owns fetching (see
 * `usePortfolioHistory`) so tests can drive it with fixtures.
 */
export function PortfolioPerformanceChart({
	data = [],
	isLoading = false,
	error = null,
	onRetry,
	defaultRange = '30d',
	className,
}: PortfolioPerformanceChartProps) {
	const [range, setRange] = useState<PortfolioHistoryRange>(defaultRange);
	const [showBenchmark, setShowBenchmark] = useState(false);

	const rangedPoints = useMemo(
		() => filterHistoryByRange(data, range),
		[data, range]
	);
	const series = useMemo(
		() => buildPortfolioChartSeries(rangedPoints, { showBenchmark }),
		[rangedPoints, showBenchmark]
	);
	const returnPercent = useMemo(
		() => computePortfolioReturnPercent(rangedPoints),
		[rangedPoints]
	);
	const benchmarkReturnPercent = useMemo(
		() => computeBenchmarkReturnPercent(rangedPoints),
		[rangedPoints]
	);
	const hasBenchmark = useMemo(
		() =>
			rangedPoints.some(
				point => point.benchmark != null && Number.isFinite(point.benchmark)
			),
		[rangedPoints]
	);

	const tone = getPnLTone(returnPercent);
	const showReturn = returnPercent != null && !isLoading && !error;

	return (
		<section
			data-testid="portfolio-performance-chart"
			aria-labelledby="portfolio-performance-heading"
			className={cn(
				'rounded-4xl border border-white/10 bg-white/2 p-6 shadow-2xl backdrop-blur-md md:p-8',
				className
			)}
		>
			<div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div>
					<h2
						id="portfolio-performance-heading"
						className="font-grotesque text-xl font-black tracking-tight text-white"
					>
						Portfolio performance
					</h2>
					<p className="mt-1 text-xs text-white/50">
						Total value of every held creator key over time.
					</p>
					{showReturn && (
						<div
							data-testid="portfolio-performance-return"
							className={cn(
								'mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-grotesque text-xs font-bold',
								getPnLToneChipClassName(returnPercent)
							)}
						>
							{tone === 'positive' ? (
								<TrendingUp
									className="size-3.5"
									aria-hidden="true"
								/>
							) : tone === 'negative' ? (
								<TrendingDown
									className="size-3.5"
									aria-hidden="true"
								/>
							) : null}
							<span>
								{formatPortfolioReturnPercent(returnPercent)} return
							</span>
							{showBenchmark && benchmarkReturnPercent != null && (
								<span
									data-testid="portfolio-performance-benchmark-return"
									className="text-white/60"
								>
									vs{' '}
									{formatPortfolioReturnPercent(
										benchmarkReturnPercent
									)}{' '}
									benchmark
								</span>
							)}
						</div>
					)}
				</div>

				<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
					<div
						role="group"
						aria-label="Portfolio history range"
						className="flex w-fit rounded-lg border border-white/10 bg-black/20 p-1"
					>
						{PORTFOLIO_HISTORY_RANGES.map(option => (
							<button
								key={option.value}
								type="button"
								aria-pressed={range === option.value}
								data-testid={`portfolio-range-${option.value}`}
								onClick={() => setRange(option.value)}
								className={cn(
									'rounded-md px-3 py-1.5 text-xs font-bold tracking-wider transition-colors',
									range === option.value
										? 'bg-emerald-400 text-slate-950'
										: 'text-white/55 hover:bg-white/10 hover:text-white'
								)}
							>
								{option.label}
							</button>
						))}
					</div>

					<button
						type="button"
						aria-pressed={showBenchmark}
						disabled={!hasBenchmark}
						data-testid="portfolio-benchmark-toggle"
						onClick={() => setShowBenchmark(value => !value)}
						title={
							hasBenchmark
								? 'Compare against the market index'
								: 'No benchmark data for this range'
						}
						className={cn(
							'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold tracking-wide transition-colors',
							showBenchmark
								? 'border-blue-400/40 bg-blue-400/15 text-blue-200'
								: 'border-white/10 bg-black/20 text-white/55 hover:bg-white/10 hover:text-white',
							!hasBenchmark && 'cursor-not-allowed opacity-40'
						)}
					>
						<span
							className="size-2 rounded-full"
							style={{ backgroundColor: BENCHMARK_LINE_COLOR }}
							aria-hidden="true"
						/>
						Benchmark
					</button>
				</div>
			</div>

			{isLoading ? (
				<div
					className="h-65 w-full rounded-lg"
					role="status"
					aria-label="Loading portfolio performance"
					data-testid="portfolio-performance-skeleton"
				>
					<Skeleton className="h-full w-full" />
				</div>
			) : error ? (
				<div
					role="alert"
					data-testid="portfolio-performance-error"
					className="flex h-65 flex-col items-center justify-center gap-3 text-sm text-white/55"
				>
					<AlertCircle className="size-6 text-red-400" aria-hidden="true" />
					<span>{error}</span>
					{onRetry && (
						<button
							type="button"
							data-testid="portfolio-performance-retry"
							onClick={onRetry}
							className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10"
						>
							Try again
						</button>
					)}
				</div>
			) : series.length === 0 ? (
				<div
					data-testid="portfolio-performance-empty"
					className="flex h-65 items-center justify-center text-sm text-white/45"
				>
					No portfolio history yet
				</div>
			) : (
				<div
					className="h-65 w-full"
					data-testid="portfolio-performance-series"
				>
					<ResponsiveContainer width="100%" height="100%">
						<LineChart
							data={series}
							margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
						>
							<CartesianGrid stroke="#ffffff12" vertical={false} />
							<XAxis
								dataKey="timestamp"
								stroke="#ffffff55"
								tickLine={false}
								axisLine={false}
								tickFormatter={value =>
									formatPortfolioHistoryDate(String(value))
								}
								minTickGap={32}
							/>
							<YAxis
								stroke="#ffffff55"
								tickLine={false}
								axisLine={false}
								width={64}
								tickFormatter={value =>
									formatPortfolioValueXlm(Number(value))
								}
							/>
							<Tooltip
								contentStyle={{
									backgroundColor: '#0b1728',
									borderColor: '#ffffff22',
									borderRadius: '0.5rem',
									color: '#fff',
								}}
								labelFormatter={value =>
									formatPortfolioHistoryDate(String(value))
								}
								formatter={(value: unknown, name: unknown) => [
									formatPortfolioValueXlm(Number(value)),
									name === 'benchmark' ? 'Benchmark' : 'Portfolio',
								]}
							/>
							<Line
								type="monotone"
								dataKey="portfolio"
								name="portfolio"
								stroke={PORTFOLIO_LINE_COLOR}
								strokeWidth={2}
								dot={false}
								activeDot={{ r: 5 }}
							/>
							{showBenchmark && (
								<Line
									type="monotone"
									dataKey="benchmark"
									name="benchmark"
									stroke={BENCHMARK_LINE_COLOR}
									strokeWidth={2}
									strokeDasharray="5 4"
									dot={false}
									activeDot={{ r: 5 }}
									connectNulls
								/>
							)}
						</LineChart>
					</ResponsiveContainer>
				</div>
			)}
		</section>
	);
}

export default PortfolioPerformanceChart;
