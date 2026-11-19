import { useState, useEffect } from 'react';
import { TrendingDown, Clock, BarChart3 } from 'lucide-react';

interface BootstrapPriceChartProps {
	startPrice: number;
	endPrice: number;
	bootstrapStart: number;
	bootstrapEnd: number;
	currentPrice?: number;
	className?: string;
}

/**
 * Bootstrapping price curve chart overlay (#1180).
 * Shows the projected price decline from start_price to end_price over the
 * bootstrap duration, with a live countdown timer and current price marker.
 * Transitions to standard bonding curve chart after bootstrap ends.
 */
export function BootstrapPriceChart({
	startPrice,
	endPrice,
	bootstrapStart,
	bootstrapEnd,
	currentPrice,
	className = '',
}: BootstrapPriceChartProps) {
	const [now, setNow] = useState(Date.now());

	useEffect(() => {
		const interval = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(interval);
	}, []);

	const totalDuration = bootstrapEnd - bootstrapStart;
	const elapsed = Math.min(Math.max(now - bootstrapStart, 0), totalDuration);
	const progress = totalDuration > 0 ? elapsed / totalDuration : 1;
	const remaining = Math.max(bootstrapEnd - now, 0);
	const isExpired = now >= bootstrapEnd;

	// Linear decline from startPrice to endPrice
	const projectedPrice = startPrice + (endPrice - startPrice) * progress;
	const displayPrice = currentPrice ?? projectedPrice;

	// Chart geometry
	const chartWidth = 400;
	const chartHeight = 120;
	const padding = { top: 16, right: 16, bottom: 24, left: 16 };
	const innerWidth = chartWidth - padding.left - padding.right;
	const innerHeight = chartHeight - padding.top - padding.bottom;

	const priceRange = startPrice - endPrice || 1;
	const yForPrice = (price: number) =>
		padding.top + innerHeight - ((price - endPrice) / priceRange) * innerHeight;
	const xForProgress = (p: number) => padding.left + p * innerWidth;

	const currentX = xForProgress(progress);
	const currentY = yForPrice(displayPrice);

	// Below 10% remaining: switch to tighter scale for accuracy
	const showDetail = progress > 0.9;

	if (isExpired) {
		return (
			<div data-testid="bootstrap-chart-expired" className={`rounded-2xl border border-white/10 bg-white/[0.02] p-6 ${className}`}>
				<div className="flex items-center gap-2 text-white/50">
					<BarChart3 className="size-4" />
					<span className="text-sm">Bootstrap complete — showing standard bonding curve</span>
				</div>
			</div>
		);
	}

	const hours = Math.floor(remaining / 3600000);
	const minutes = Math.floor((remaining % 3600000) / 60000);
	const seconds = Math.floor((remaining % 60000) / 1000);

	return (
		<div data-testid="bootstrap-price-chart" className={`rounded-2xl border border-amber-400/20 bg-amber-400/[0.03] p-6 ${className}`}>
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-2">
					<TrendingDown className="size-4 text-amber-400" />
					<h3 className="text-sm font-semibold text-white">Bootstrapping Price Curve</h3>
				</div>
				<div data-testid="bootstrap-countdown" className="flex items-center gap-1.5 text-xs text-amber-300">
					<Clock className="size-3" />
					<span className="font-mono tabular-nums">
						{hours}h {minutes}m {seconds}s
					</span>
				</div>
			</div>

			<svg
				viewBox={`0 0 ${chartWidth} ${chartHeight}`}
				className="w-full h-32"
				role="img"
				aria-label="Bootstrap price decline chart"
			>
				{/* Grid lines */}
				{[0, 0.25, 0.5, 0.75, 1].map((p) => (
					<line
						key={p}
						x1={xForProgress(p)}
						y1={padding.top}
						x2={xForProgress(p)}
						y2={padding.top + innerHeight}
						stroke="rgba(255,255,255,0.05)"
						strokeWidth="1"
					/>
				))}

				{/* Decline line */}
				<line
					x1={xForProgress(0)}
					y1={yForPrice(startPrice)}
					x2={xForProgress(1)}
					y2={yForPrice(endPrice)}
					stroke="rgba(251,191,36,0.4)"
					strokeWidth="2"
					strokeDasharray="6 3"
				/>

				{/* Progress line (solid, up to current) */}
				<line
					x1={xForProgress(0)}
					y1={yForPrice(startPrice)}
					x2={currentX}
					y2={currentY}
					stroke="rgb(251,191,36)"
					strokeWidth="2"
				/>

				{/* Start price label */}
				<circle cx={xForProgress(0)} cy={yForPrice(startPrice)} r="3" fill="rgb(251,191,36)" />
				<text x={xForProgress(0)} y={yForPrice(startPrice) - 8} fill="rgba(255,255,255,0.5)" fontSize="9" textAnchor="start">
					{startPrice.toFixed(4)}
				</text>

				{/* End price label */}
				<circle cx={xForProgress(1)} cy={yForPrice(endPrice)} r="3" fill="rgba(251,191,36,0.5)" />
				<text x={xForProgress(1)} y={yForPrice(endPrice) + 14} fill="rgba(255,255,255,0.5)" fontSize="9" textAnchor="end">
					{endPrice.toFixed(4)}
				</text>

				{/* Current price marker */}
				<circle cx={currentX} cy={currentY} r="5" fill="rgb(251,191,36)" stroke="rgba(0,0,0,0.5)" strokeWidth="2" />
				<text
					x={currentX}
					y={currentY - 10}
					fill="white"
					fontSize="10"
					fontWeight="bold"
					textAnchor="middle"
				>
					{displayPrice.toFixed(4)}
				</text>
			</svg>

			<div className="mt-3 flex items-center justify-between text-xs text-white/50">
				<span>Start: {startPrice.toFixed(4)}</span>
				<span className="text-amber-300">Now: {displayPrice.toFixed(4)}</span>
				<span>End: {endPrice.toFixed(4)}</span>
			</div>

			{showDetail && (
				<div className="mt-2 text-[10px] text-amber-200/60 text-center">
					Less than 10% of bootstrap time remaining — price approaching end
				</div>
			)}
		</div>
	);
}

export default BootstrapPriceChart;
