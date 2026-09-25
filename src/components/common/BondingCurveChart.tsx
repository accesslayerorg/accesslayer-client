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
	className?: string;
	width?: number | `${number}%`;
	height?: number | `${number}%`;
}

export function BondingCurveChart({
	data = [],
	currentSupply,
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

	const maxSupplyInData = Math.max(...data.map((d) => d.supply));
	const xAxisMax = currentSupply ?? maxSupplyInData;

	const currentPoint = data.find(
		(d) => d.isCurrent || (currentSupply !== undefined && d.supply === currentSupply)
	);

interface CustomDotProps {
	cx?: number;
	cy?: number;
	payload?: BondingCurveDataPoint;
}

	const CustomDot = (props: CustomDotProps) => {
		const { cx, cy, payload } = props;
		if (!cx || !cy || !payload) return null;

		const isHighlighted =
			payload.isCurrent || (currentSupply !== undefined && payload.supply === currentSupply);

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
				data-testid={isHighlighted ? 'current-price-highlight' : `data-point-${payload.supply}`}
				data-supply={payload.supply}
				data-price={payload.priceXLM}
			/>
		);
	};

	return (
		<div
			className={cn('w-full relative bonding-curve-chart-container', className)}
			data-testid="bonding-curve-chart"
			data-datapoints-count={data.length}
			data-xaxis-max={xAxisMax}
		>
			<ResponsiveContainer width={width} height={height}>
				<LineChart
					data={data}
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
