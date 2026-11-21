import React, { useState } from 'react';
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
import { useIsMobile } from '@/hooks/useIsMobile';
import type { TwapWindow } from '@/hooks/useKeyTwap';

export interface BondingCurveDataPoint {
	supply: number;
	priceXLM: number;
	isCurrent?: boolean;
}

export interface BondingCurveChartProps {
	currentSupply?: number;
	currentPriceStroops?: number;
	buyQuantity?: number;
	className?: string;
	customMilestones?: Omit<BondingCurveMilestone, 'priceXLM'>[];
	data?: BondingCurveDataPoint[];
	height?: number | `${number}%`;
	width?: number | `${number}%`;
	// TWAP price chart overlay props (#931)
	twapPriceStroops?: number | null;
	twapWindow?: TwapWindow;
	onTwapWindowChange?: (window: TwapWindow) => void;
	spotPriceStroops?: number | null;
	showTwapControls?: boolean;
	showTwapOverlay?: boolean;
	onToggleOverlay?: (show: boolean) => void;
	isTwapLoading?: boolean;
	/** Configured price floor in stroops (#1152). Overlays a dashed horizontal line when > 0. */
	priceFloorStroops?: number | null;
}

export interface CustomTooltipProps {
	active?: boolean;
	payload?: Array<{
		payload: {
			priceStroops: number;
			supply: number;
			label?: string;
			twapPriceStroops?: number | null;
		};
	}>;
	twapPriceStroops?: number | null;
	twapWindow?: TwapWindow;
	spotPriceStroops?: number | null;
	showTwapOverlay?: boolean;
	priceFloorStroops?: number | null;
}

export const CustomTooltip: React.FC<CustomTooltipProps> = ({
	active,
	payload,
	twapPriceStroops,
	twapWindow = '24h',
	spotPriceStroops,
	showTwapOverlay = true,
	priceFloorStroops,
}) => {
	if (!active || !payload || !payload.length) return null;

	const data = payload[0].payload;
	const priceDisplay = formatDisplayKeyPrice(data.priceStroops);
	const supplyDisplay = formatCompactNumber(data.supply);

	// TWAP price resolution: prioritize prop, fallback to chart data point payload
	const effectiveTwap =
		twapPriceStroops !== undefined ? twapPriceStroops : (data.twapPriceStroops ?? null);
	const hasTwap = showTwapOverlay && effectiveTwap != null && effectiveTwap > 0;

	// Reference spot price for deviation calculation: spotPriceStroops or current hovered point price
	const referenceSpot = spotPriceStroops ?? data.priceStroops;
	const twapDelta = hasTwap && referenceSpot ? effectiveTwap - referenceSpot : null;
	const twapDeltaPercent =
		twapDelta != null && referenceSpot > 0
			? (twapDelta / referenceSpot) * 100
			: null;

	return (
		<div
			className="min-w-[170px] rounded-lg border border-white/10 bg-slate-900/95 p-3 shadow-xl backdrop-blur-sm"
			data-testid="bonding-curve-tooltip"
		>
			<p className="mb-1 text-xs text-white/60">Supply: {supplyDisplay} keys</p>
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs text-white/50">Spot:</span>
				<span className="text-sm font-bold text-amber-400">{priceDisplay}</span>
			</div>
			{data.label && (
				<p className="mt-1 text-xs text-amber-400/60">{data.label}</p>
			)}
			{priceFloorStroops != null && priceFloorStroops > 0 && (
				<div className="mt-1 flex items-center justify-between gap-2 text-xs" data-testid="tooltip-price-floor">
					<span className="text-white/50">Floor:</span>
					<span className="font-bold text-rose-400">
						{formatDisplayKeyPrice(priceFloorStroops)}
					</span>
				</div>
			)}

			{hasTwap && (
				<div
					className="mt-2 space-y-1 border-t border-white/10 pt-2"
					data-testid="twap-tooltip-section"
				>
					<div className="flex items-center justify-between gap-3 text-xs">
						<span className="font-semibold text-emerald-400" data-testid="twap-tooltip-label">
							TWAP ({twapWindow}):
						</span>
						<span
							className="font-bold text-white tabular-nums"
							data-testid="twap-tooltip-price"
						>
							{formatDisplayKeyPrice(effectiveTwap)}
						</span>
					</div>
					{twapDeltaPercent != null && (
						<div
							className={cn(
								'text-right text-xs font-semibold tabular-nums',
								twapDeltaPercent < 0 ? 'text-emerald-400' : 'text-rose-400'
							)}
							data-testid="twap-tooltip-deviation"
						>
							{twapDeltaPercent < 0 ? '▼' : '▲'}{' '}
							{Math.abs(twapDeltaPercent).toFixed(2)}% vs spot
						</div>
					)}
				</div>
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
	twapPriceStroops,
	twapWindow,
	onTwapWindowChange,
	spotPriceStroops,
	showTwapControls,
	showTwapOverlay,
	onToggleOverlay,
	isTwapLoading,
	priceFloorStroops,
}) => {
	// Mobile-tuned axis layout (#1055): at <768px the chart is ~315px wide
	// inside the page padding, so we use tighter margins, straight x-ticks
	// (the -45° rotation wastes vertical space and overlaps at that width)
	// and a slimmer y-axis gutter so the plot keeps a readable aspect ratio.
	const isMobile = useIsMobile();
	const chartMargin = isMobile
		? { top: 16, right: 12, left: 0, bottom: 16 }
		: { top: 20, right: 30, left: 20, bottom: 60 };
	const xAxisHeight = isMobile ? 24 : 60;

	// TWAP overlay controls state
	const [internalTwapWindow, setInternalTwapWindow] = useState<TwapWindow>('24h');
	const [internalOverlayVisible, setInternalOverlayVisible] = useState<boolean>(true);

	const effectiveTwapWindow = twapWindow ?? internalTwapWindow;
	const isOverlayVisible =
		(showTwapOverlay ?? internalOverlayVisible) && twapPriceStroops != null;

	const handleTwapWindowChange = (win: TwapWindow) => {
		if (onTwapWindowChange) {
			onTwapWindowChange(win);
		} else {
			setInternalTwapWindow(win);
		}
		if (onToggleOverlay) {
			onToggleOverlay(true);
		} else {
			setInternalOverlayVisible(true);
		}
	};

	const handleToggleOverlay = () => {
		const nextState = !isOverlayVisible;
		if (onToggleOverlay) {
			onToggleOverlay(nextState);
		} else {
			setInternalOverlayVisible(nextState);
		}
	};

	const shouldShowTwapControls =
		showTwapControls ?? (Boolean(onTwapWindowChange) || twapPriceStroops !== undefined);

	// Use data array if provided, otherwise generate from supply/price
	let chartData: Array<{
		supply: number;
		priceStroops: number;
		priceXLM: number;
		isMilestone?: boolean;
		label?: string;
		isCurrent?: boolean;
		twapPriceStroops?: number;
	}>;
	let priceImpactData: { currentPrice: number; newPrice: number; priceIncrease: number; priceIncreasePercent: number } | null = null;
	let currentMilestoneRange: { current: BondingCurveMilestone; next?: BondingCurveMilestone } | null = null;
	let effectiveCurrentSupply = currentSupply;
	let effectiveCurrentPriceStroops = currentPriceStroops ?? spotPriceStroops;

	if (data && data.length > 0) {
		// Use provided data array (from upstream/dev implementation)
		chartData = data.map(point => ({
			supply: point.supply,
			priceStroops: point.priceXLM * 10_000_000, // Convert XLM to stroops
			priceXLM: point.priceXLM,
			isCurrent: point.isCurrent,
			twapPriceStroops: isOverlayVisible ? (twapPriceStroops ?? undefined) : undefined,
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
				twapPriceStroops: isOverlayVisible ? (twapPriceStroops ?? undefined) : undefined,
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
			{/* TWAP overlay controls (#931) */}
			{shouldShowTwapControls && (
				<div
					className="mb-4 flex flex-wrap items-center justify-between gap-3"
					data-testid="twap-controls"
				>
					<div className="flex items-center gap-2">
						<span className="text-xs font-semibold uppercase tracking-wider text-white/50">
							TWAP Overlay:
						</span>
						{twapPriceStroops != null && isOverlayVisible ? (
							<span
								className="text-xs font-bold text-emerald-400"
								data-testid="twap-current-value"
							>
								{formatDisplayKeyPrice(twapPriceStroops)}
							</span>
						) : isTwapLoading && twapPriceStroops === undefined ? (
							<span
								className="text-xs text-white/40 animate-pulse"
								data-testid="twap-status-loading"
							>
								Loading...
							</span>
						) : (
							<span
								className="text-xs italic text-white/40"
								data-testid="twap-status-unavailable"
							>
								{twapPriceStroops == null ? 'Unavailable' : 'Hidden'}
							</span>
						)}
					</div>

					<div className="flex items-center gap-2">
						<div
							className="flex items-center rounded-lg border border-white/10 bg-black/20 p-1"
							role="group"
							aria-label="TWAP window"
						>
							<button
								type="button"
								data-testid="twap-window-1h"
								aria-pressed={effectiveTwapWindow === '1h' && isOverlayVisible}
								onClick={() => handleTwapWindowChange('1h')}
								className={cn(
									'rounded-md px-3 py-1 text-xs font-bold tracking-wider transition-colors',
									effectiveTwapWindow === '1h' && isOverlayVisible
										? 'bg-emerald-400 text-slate-950 shadow-sm'
										: 'text-white/55 hover:bg-white/10 hover:text-white'
								)}
							>
								1H
							</button>                            <button
                                type="button"
                                data-testid="twap-window-4h"
                                aria-pressed={effectiveTwapWindow === '4h' && isOverlayVisible}
                                onClick={() => handleTwapWindowChange('4h')}
                                className={cn(
                                    'rounded-md px-3 py-1 text-xs font-bold tracking-wider transition-colors',
                                    effectiveTwapWindow === '4h' && isOverlayVisible
                                        ? 'bg-emerald-400 text-slate-950 shadow-sm'
                                        : 'text-white/55 hover:bg-white/10 hover:text-white'
                                )}
                            >
                                4H
                            </button>
                            <button
                                type="button"
                                data-testid="twap-window-24h"
                                aria-pressed={effectiveTwapWindow === '24h' && isOverlayVisible}
                                onClick={() => handleTwapWindowChange('24h')}
                                className={cn(
                                    'rounded-md px-3 py-1 text-xs font-bold tracking-wider transition-colors',
                                    effectiveTwapWindow === '24h' && isOverlayVisible
                                        ? 'bg-emerald-400 text-slate-950 shadow-sm'
                                        : 'text-white/55 hover:bg-white/10 hover:text-white'
                                )}
                            >
                                24H
                            </button>
						</div>

						{twapPriceStroops != null && (
							<button
								type="button"
								data-testid="twap-toggle-visibility"
								aria-pressed={isOverlayVisible}
								onClick={handleToggleOverlay}
								className={cn(
									'rounded-lg border border-white/10 px-2.5 py-1 text-xs font-semibold transition-colors',
									isOverlayVisible
										? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
										: 'bg-white/5 text-white/50 hover:text-white'
								)}
							>
								{isOverlayVisible ? 'Hide' : 'Show'}
							</button>
						)}
					</div>
				</div>
			)}

			<div style={{ height: displayHeight, width: displayWidth }}>
				<ResponsiveContainer width="100%" height="100%">
					<LineChart
						data={chartData}
						margin={chartMargin}
					>
						<CartesianGrid
							strokeDasharray="3 3"
							stroke="rgba(255, 255, 255, 0.1)"
							vertical={false}
						/>
						<XAxis
							dataKey="supply"
							stroke="#94a3b8"
							tick={{ fill: '#94a3b8', fontSize: isMobile ? 10 : 12 }}
							tickLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
							axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
							tickFormatter={(value: number) => formatCompactNumber(value)}
							angle={isMobile ? 0 : -45}
							textAnchor={isMobile ? 'middle' : 'end'}
							height={xAxisHeight}
							minTickGap={isMobile ? 32 : 16}
						/>
						<YAxis
							stroke="#94a3b8"
							tick={{ fill: '#94a3b8', fontSize: isMobile ? 10 : 12 }}
							tickLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
							axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
							tickFormatter={(value: number) => formatDisplayKeyPrice(value)}
							width={isMobile ? 62 : 80}
						/>
						<Tooltip
							content={
								<CustomTooltip
									twapPriceStroops={isOverlayVisible ? twapPriceStroops : null}
									twapWindow={effectiveTwapWindow}
									spotPriceStroops={spotPriceStroops ?? effectiveCurrentPriceStroops}
									showTwapOverlay={isOverlayVisible}
									priceFloorStroops={priceFloorStroops}
								/>
							}
						/>
						<Line
							type="monotone"
							dataKey="priceStroops"
							stroke="#f59e0b"
							strokeWidth={2}
							dot={false}
							activeDot={{ r: 6, fill: '#f59e0b', stroke: '#1e293b', strokeWidth: 2 }}
							name="Bonding Curve Price"
						/>
						{/* Price floor indicator line (#1152) */}
						{priceFloorStroops != null && priceFloorStroops > 0 && (
							<ReferenceLine
								y={priceFloorStroops}
								stroke="#f43f5e"
								strokeWidth={1.5}
								strokeDasharray="4 4"
								data-testid="price-floor-line"
								label={{
									value: `Floor: ${formatDisplayKeyPrice(priceFloorStroops)}`,
									position: 'insideTopRight',
									fill: '#f43f5e',
									fontSize: 11,
									fontWeight: 600,
								}}
							/>
						)}
						{/* TWAP overlay line (#931) */}
						{isOverlayVisible && twapPriceStroops != null && (
							<Line
								type="monotone"
								dataKey="twapPriceStroops"
								stroke="#10b981"
								strokeWidth={2}
								strokeDasharray="6 4"
								dot={false}
								activeDot={{ r: 5, fill: '#10b981', stroke: '#1e293b', strokeWidth: 2 }}
								isAnimationActive={false}
								name={`TWAP (${effectiveTwapWindow})`}
							/>
						)}
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

			{/* Chart Legend */}
			{(shouldShowTwapControls || (priceFloorStroops != null && priceFloorStroops > 0)) && (
				<div
					className="mt-3 flex flex-wrap items-center gap-4 text-xs"
					data-testid="chart-legend"
				>
					<div className="flex items-center gap-1.5">
						<span className="h-0.5 w-3 rounded bg-[#f59e0b]" />
						<span className="text-white/60">Bonding Curve (Spot)</span>
					</div>
					{isOverlayVisible && twapPriceStroops != null && (
						<div
							className="flex items-center gap-1.5"
							data-testid="twap-legend-indicator"
						>
							<span
								className="h-0.5 w-3 rounded border-b-2 border-dashed border-[#10b981]"
								style={{ borderBottom: '2px dashed #10b981' }}
							/>
							<span className="font-semibold text-emerald-400">
								TWAP ({effectiveTwapWindow})
							</span>
						</div>
					)}
					{priceFloorStroops != null && priceFloorStroops > 0 && (
						<div
							className="flex items-center gap-1.5"
							data-testid="price-floor-legend-indicator"
						>
							<span
								className="h-0.5 w-3 rounded border-b-2 border-dashed border-[#f43f5e]"
								style={{ borderBottom: '2px dashed #f43f5e' }}
							/>
							<span className="font-semibold text-rose-400" data-testid="price-floor-label">
								Floor ({formatDisplayKeyPrice(priceFloorStroops)})
							</span>
						</div>
					)}
				</div>
			)}

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
