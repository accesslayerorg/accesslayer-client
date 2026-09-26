import React from 'react';
import {
	ResponsiveContainer,
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ReferenceLine,
	ReferenceArea,
} from 'recharts';
import { cn } from '@/lib/utils';
import {
	generateBondingCurveData,
	generateChartDataPoints,
	findMilestoneRange,
	calculatePriceImpact,
	type BondingCurveMilestone,
} from '@/utils/bondingCurve.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { formatCompactNumber } from '@/utils/numberFormat.utils';

export interface BondingCurveDataPoint {
	supply: number;
	priceXLM: number;
	isCurrent?: boolean;
}

interface BondingCurveChartProps {
	currentSupply?: number;
	currentPriceStroops?: number;
	buyQuantity?: number;
	className?: string;
	customMilestones?: Omit<BondingCurveMilestone, 'priceXLM'>[];
	data?: BondingCurveDataPoint[];
	height?: number | `${number}%`;
	width?: number | `${number}%`;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { priceStroops: number; supply: number; label?: string } }> }) => {
	if (!active || !payload || !payload.length) return null;

	const data = payload[0].payload;
	const priceDisplay = formatDisplayKeyPrice(data.priceStroops);
	const supplyDisplay = formatCompactNumber(data.supply);

	return (
		<div className="rounded-lg bg-slate-900/95 border border-white/10 p-3 shadow-xl backdrop-blur-sm">
			<p className="text-xs text-white/60 mb-1">Supply: {supplyDisplay} keys</p>
			<p className="text-sm font-bold text-amber-400">{priceDisplay}</p>
			{data.label && (
				<p className="text-xs text-amber-400/60 mt-1">{data.label}</p>
			)}
		</div>
	);
};

const BondingCurveChart: React.FC<BondingCurveChartProps> = ({
	currentSupply,
	currentPriceStroops,
	buyQuantity = 0,
	className,
	customMilestones,
	data,
	height = 300,
	width = '100%',
}) => {
	// Use data array if provided, otherwise generate from supply/price
	let chartData: Array<{ supply: number; priceStroops: number; priceXLM: number; isMilestone?: boolean; label?: string; isCurrent?: boolean }>;
	let priceImpactData: { currentPrice: number; newPrice: number; priceIncrease: number; priceIncreasePercent: number } | null = null;
	let currentMilestoneRange: { current: BondingCurveMilestone; next?: BondingCurveMilestone } | null = null;
	let effectiveCurrentSupply = currentSupply;
	let effectiveCurrentPriceStroops = currentPriceStroops;

	if (data && data.length > 0) {
		// Use provided data array (from upstream/dev implementation)
		chartData = data.map(point => ({
			supply: point.supply,
			priceStroops: point.priceXLM * 10_000_000, // Convert XLM to stroops
			priceXLM: point.priceXLM,
			isCurrent: point.isCurrent,
		}));
		const currentPoint = data.find(d => d.isCurrent);
		if (currentPoint) {
			effectiveCurrentSupply = currentPoint.supply;
			effectiveCurrentPriceStroops = currentPoint.priceXLM * 10_000_000;
		}
	} else {
		// Use graduated curve implementation (from HEAD)
		if (currentSupply === undefined || currentPriceStroops === undefined) {
			return (
				<div className={cn('flex items-center justify-center p-8 text-sm text-neutral-400 bg-neutral-900/50 rounded-lg border border-neutral-800', className)}>
					No data
				</div>
			);
		}

		const bondingCurveData = generateBondingCurveData(
			currentSupply,
			currentPriceStroops,
			customMilestones
		);

		chartData = generateChartDataPoints(bondingCurveData.milestones, 15);

		// Mark milestone points in the chart data
		chartData = chartData.map(point => {
			const milestone = bondingCurveData.milestones.find(m => m.supply === point.supply);
			return {
				...point,
				isMilestone: !!milestone,
				label: milestone?.label,
			};
		});

		// Calculate price impact if buy quantity is provided
		priceImpactData = buyQuantity > 0
			? calculatePriceImpact(currentSupply, buyQuantity, customMilestones)
			: null;

		currentMilestoneRange = findMilestoneRange(currentSupply, bondingCurveData.milestones);
		effectiveCurrentSupply = currentSupply;
		effectiveCurrentPriceStroops = currentPriceStroops;
	}

	const displayHeight = typeof height === 'number' ? `${height}px` : height;
	const displayWidth = typeof width === 'number' ? `${width}px` : width;

	return (
		<div className={cn('w-full', className)}>
			<div style={{ height: displayHeight, width: displayWidth }}>
				<ResponsiveContainer width="100%" height="100%">
					<LineChart
						data={chartData}
						margin={{
							top: 20,
							right: 30,
							left: 20,
							bottom: 60,
						}}
					>
						<CartesianGrid
							strokeDasharray="3 3"
							stroke="rgba(255, 255, 255, 0.1)"
							vertical={false}
						/>
						<XAxis
							dataKey="supply"
							stroke="#94a3b8"
							tick={{ fill: '#94a3b8', fontSize: 12 }}
							tickLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
							axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
							tickFormatter={(value: number) => formatCompactNumber(value)}
							angle={-45}
							textAnchor="end"
							height={60}
						/>
						<YAxis
							stroke="#94a3b8"
							tick={{ fill: '#94a3b8', fontSize: 12 }}
							tickLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
							axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
							tickFormatter={(value: number) => formatDisplayKeyPrice(value)}
							width={80}
						/>
						<Tooltip content={<CustomTooltip />} />
						<Line
							type="monotone"
							dataKey="priceStroops"
							stroke="#f59e0b"
							strokeWidth={2}
							dot={false}
							activeDot={{ r: 6, fill: '#f59e0b', stroke: '#1e293b', strokeWidth: 2 }}
						/>
						{/* Current position marker */}
						{effectiveCurrentSupply !== undefined && (
							<ReferenceLine
								x={effectiveCurrentSupply}
								stroke="#10b981"
								strokeWidth={2}
								strokeDasharray="4 4"
								label={{
									value: 'Current',
									position: 'top',
									fill: '#10b981',
									fontSize: 12,
									fontWeight: 'bold',
								}}
							/>
						)}
						{/* Price impact preview - only for graduated curve */}
						{priceImpactData && effectiveCurrentSupply !== undefined && (
							<>
								<ReferenceArea
									x1={effectiveCurrentSupply}
									x2={effectiveCurrentSupply + buyQuantity}
									fill="#f59e0b"
									fillOpacity={0.1}
								/>
								<ReferenceLine
									x={effectiveCurrentSupply + buyQuantity}
									stroke="#f59e0b"
									strokeWidth={1}
									strokeDasharray="4 4"
									label={{
										value: `+${buyQuantity}`,
										position: 'top',
										fill: '#f59e0b',
										fontSize: 11,
									}}
								/>
							</>
						)}
						{/* Milestone markers - only for graduated curve */}
						{chartData.some(point => point.isMilestone) && (
							chartData.filter(point => point.isMilestone).map((milestone) => (
								<ReferenceLine
									key={milestone.supply}
									x={milestone.supply}
									stroke="#f59e0b"
									strokeWidth={1}
									strokeDasharray="2 2"
									opacity={0.3}
								/>
							))
						)}
					</LineChart>
				</ResponsiveContainer>
			</div>

			{/* Legend and current position info - only for graduated curve */}
			{!data && effectiveCurrentSupply !== undefined && effectiveCurrentPriceStroops !== undefined && (
				<div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="bg-white/5 rounded-lg p-3 border border-white/10">
						<p className="text-xs text-white/60 mb-1">Current Supply</p>
						<p className="text-lg font-bold text-white">
							{formatCompactNumber(effectiveCurrentSupply)} keys
						</p>
						{currentMilestoneRange && (
							<p className="text-xs text-white/40 mt-1">
								{currentMilestoneRange.next
									? `Next: ${currentMilestoneRange.next.label}`
									: 'At final milestone'}
							</p>
						)}
					</div>

					<div className="bg-white/5 rounded-lg p-3 border border-white/10">
						<p className="text-xs text-white/60 mb-1">Current Price</p>
						<p className="text-lg font-bold text-amber-400">
							{formatDisplayKeyPrice(effectiveCurrentPriceStroops)}
						</p>
					</div>

					{priceImpactData && (
						<div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/30">
							<p className="text-xs text-amber-400/80 mb-1">Price Impact</p>
							<p className="text-lg font-bold text-amber-400">
								{formatDisplayKeyPrice(priceImpactData.newPrice)}
							</p>
							<p className="text-xs text-amber-400/60 mt-1">
								+{priceImpactData.priceIncreasePercent.toFixed(1)}%
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default BondingCurveChart;
export { BondingCurveChart as BondingCurveChartNamed };
