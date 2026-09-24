import {
	ResponsiveContainer,
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip,
	CartesianGrid,
	ReferenceDot,
} from 'recharts';
import { cn } from '@/lib/utils';

export interface BondingCurveDataPoint {
	supply: number;
	priceXLM: number;
	isCurrent?: boolean;
}

export interface BondingCurveChartProps {
	data?: BondingCurveDataPoint[];
	currentSupply?: number;
	twapPriceXLM?: number | null;
	twapLabel?: string;
	className?: string;
	width?: number | `${number}%`;
	height?: number | `${number}%`;
}

export function BondingCurveChart({
	data = [],
	currentSupply,
	twapPriceXLM,
	twapLabel = 'TWAP',
	className,
	width = '100%',
	height = 300,
}: BondingCurveChartProps) {
	if (!data || data.length === 0) {
		return (
			<div
				className={cn(
					'flex items-center justify-center p-8 text-sm text-neutral-400 bg-neutral-900/50 rounded-lg border border-neutral-800',
					className
				)}
				data-testid="no-data-message"
			>
				No data
			</div>
		);
	}

	const isTwapAvailable =
		twapPriceXLM != null && Number.isFinite(twapPriceXLM) && twapPriceXLM > 0;
	const chartData = isTwapAvailable
		? data.map(point => ({ ...point, twapPriceXLM }))
		: data;
	const maxSupplyInData = Math.max(...data.map(d => d.supply));
	const xAxisMax = currentSupply ?? maxSupplyInData;

	const currentPoint = data.find(
		d =>
			d.isCurrent ||
			(currentSupply !== undefined && d.supply === currentSupply)
	);

	interface CustomDotProps {
		cx?: number;
		cy?: number;
		payload?: BondingCurveDataPoint & { twapPriceXLM?: number };
	}

	const CustomDot = (props: CustomDotProps) => {
		const { cx, cy, payload } = props;
		if (!cx || !cy || !payload) return null;

		const isHighlighted =
			payload.isCurrent ||
			(currentSupply !== undefined && payload.supply === currentSupply);

		return (
			<circle
				key={`dot-${payload.supply}`}
				cx={cx}
				cy={cy}
				r={isHighlighted ? 6 : 3}
				className={cn(
					'transition-all duration-200',
					isHighlighted
						? 'current-price-highlight highlight fill-emerald-400 stroke-emerald-200 stroke-2'
						: 'fill-emerald-600 stroke-emerald-800 opacity-60'
				)}
				data-testid={
					isHighlighted
						? 'current-price-highlight'
						: `data-point-${payload.supply}`
				}
				data-supply={payload.supply}
				data-price={payload.priceXLM}
			/>
		);
	};

	const renderTwapTooltip = ({
		active,
		payload,
		label,
	}: {
		active?: boolean;
		payload?: Array<{
			dataKey?: string;
			value?: number | string;
			color?: string;
		}>;
		label?: string | number;
	}) => {
		if (!active || !payload || payload.length === 0) return null;

		const spotEntry = payload.find(entry => entry.dataKey === 'priceXLM');
		const twapEntry = payload.find(entry => entry.dataKey === 'twapPriceXLM');
		const spotValue = Number(spotEntry?.value ?? 0);
		const twapValue = Number(twapEntry?.value ?? 0);
		const deviation =
			spotValue > 0 ? ((twapValue - spotValue) / spotValue) * 100 : 0;

		return (
			<div className="rounded-lg border border-white/10 bg-[#171717] p-3 text-sm text-white shadow-lg">
				<div className="mb-1 text-xs uppercase tracking-[0.2em] text-white/55">
					{twapLabel}
				</div>
				<div className="space-y-1">
					<div>Spot: {spotValue.toFixed(4)} XLM</div>
					<div>TWAP: {twapValue.toFixed(4)} XLM</div>
					<div
						className={
							deviation >= 0 ? 'text-amber-300' : 'text-emerald-300'
						}
					>
						Deviation: {deviation >= 0 ? '+' : ''}
						{deviation.toFixed(2)}%
					</div>
					{label !== undefined && (
						<div className="text-white/55">Supply: {label}</div>
					)}
				</div>
			</div>
		);
	};

	return (
		<div
			className={cn(
				'w-full relative bonding-curve-chart-container',
				className
			)}
			data-testid="bonding-curve-chart"
			data-datapoints-count={data.length}
			data-xaxis-max={xAxisMax}
		>
			<ResponsiveContainer width={width} height={height}>
				<LineChart
					data={chartData}
					margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
					data-testid="line-chart"
				>
					<CartesianGrid strokeDasharray="3 3" stroke="#262626" />
					<XAxis
						dataKey="supply"
						domain={[0, xAxisMax]}
						type="number"
						stroke="#737373"
						tickLine={false}
						data-testid="x-axis"
					/>
					<YAxis
						dataKey="priceXLM"
						stroke="#737373"
						tickLine={false}
						unit=" XLM"
						data-testid="y-axis"
					/>
					<Tooltip
						content={renderTwapTooltip}
						contentStyle={{
							backgroundColor: '#171717',
							borderColor: '#404040',
							borderRadius: '0.5rem',
							color: '#f5f5f5',
						}}
						formatter={(value: unknown) => [`${value} XLM`, 'Price']}
						labelFormatter={(label: unknown) => `Key Supply: ${label}`}
					/>
					<Line
						type="monotone"
						dataKey="priceXLM"
						stroke="#10b981"
						strokeWidth={2}
						dot={<CustomDot />}
						activeDot={{ r: 8, className: 'highlight-active-dot' }}
					/>
					{isTwapAvailable && (
						<Line
							type="monotone"
							dataKey="twapPriceXLM"
							stroke="#f59e0b"
							strokeWidth={2}
							strokeDasharray="8 6"
							dot={false}
							activeDot={{ r: 6, stroke: '#f59e0b', fill: '#f59e0b' }}
							isAnimationActive={false}
						/>
					)}
					{currentPoint && (
						<ReferenceDot
							x={currentPoint.supply}
							y={currentPoint.priceXLM}
							r={6}
							className="current-price-highlight highlight"
							data-testid="reference-current-dot"
						/>
					)}
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
