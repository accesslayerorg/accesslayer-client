/**
 * LaunchCapRampChart (#1385).
 *
 * Visualizes the ramping purchase cap schedule against time, with the current
 * tier and active point clearly marked.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { LaunchCapStep } from '@/types/launchCap';

export interface LaunchCapRampChartProps {
	/** Ramping steps of cap against time. */
	steps: LaunchCapStep[];
	/** Current active cap limit to mark on the chart. */
	currentCap: number | null;
	/** Current timestamp in ms (defaults to Date.now()). */
	currentTimestamp?: number;
	/** Start of the launch window in ms. */
	windowStart?: number;
	/** End of the launch window in ms. */
	windowEnd?: number;
	className?: string;
}

function formatChartTime(timestamp: number): string {
	const date = new Date(timestamp);
	return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const LaunchCapRampChart: React.FC<LaunchCapRampChartProps> = ({
	steps,
	currentCap,
	currentTimestamp = Date.now(),
	windowStart,
	windowEnd,
	className,
}) => {
	if (!steps || steps.length === 0) return null;

	const sortedSteps = [...steps].sort((a, b) => a.timestamp - b.timestamp);
	const minTime = windowStart ?? sortedSteps[0].timestamp;
	const maxTime = windowEnd ?? sortedSteps[sortedSteps.length - 1].timestamp;
	const timeSpan = Math.max(1, maxTime - minTime);

	const maxCap = Math.max(...sortedSteps.map(s => s.cap), 1);

	// SVG viewport dimensions
	const viewBoxWidth = 320;
	const viewBoxHeight = 110;
	const padLeft = 32;
	const padRight = 16;
	const padTop = 22;
	const padBottom = 24;

	const plotWidth = viewBoxWidth - padLeft - padRight;
	const plotHeight = viewBoxHeight - padTop - padBottom;

	const getX = (time: number) => {
		const clampedTime = Math.min(Math.max(time, minTime), maxTime);
		return padLeft + ((clampedTime - minTime) / timeSpan) * plotWidth;
	};

	const getY = (cap: number) => {
		const clampedCap = Math.min(Math.max(cap, 0), maxCap);
		return padTop + plotHeight - (clampedCap / maxCap) * plotHeight;
	};

	// Build step-line path
	let linePath = '';
	let areaPath = '';

	// Start point: from minTime at first step's cap
	const startX = getX(minTime);
	const startY = getY(sortedSteps[0].cap);
	linePath = `M ${startX} ${startY}`;
	areaPath = `M ${startX} ${padTop + plotHeight} L ${startX} ${startY}`;

	for (let i = 0; i < sortedSteps.length; i++) {
		const step = sortedSteps[i];
		const stepX = getX(step.timestamp);
		const stepY = getY(step.cap);

		// Step horizontal then vertical
		linePath += ` L ${stepX} ${stepY}`;
		areaPath += ` L ${stepX} ${stepY}`;

		const nextTime =
			i < sortedSteps.length - 1 ? sortedSteps[i + 1].timestamp : maxTime;
		const nextX = getX(nextTime);
		linePath += ` L ${nextX} ${stepY}`;
		areaPath += ` L ${nextX} ${stepY}`;
	}

	const endX = getX(maxTime);
	areaPath += ` L ${endX} ${padTop + plotHeight} Z`;

	// Determine current point coordinates
	const effectiveCurrentCap = currentCap ?? sortedSteps[0].cap;
	const currentX = getX(currentTimestamp);
	const currentY = getY(effectiveCurrentCap);

	return (
		<div
			className={cn(
				'rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs',
				className
			)}
			data-testid="launch-cap-ramp-chart"
		>
			<div className="mb-1.5 flex items-center justify-between text-[11px] text-white/50">
				<span className="font-semibold text-white/70">Purchase Cap Ramp</span>
				<span>Max: {maxCap} keys</span>
			</div>

			<svg
				viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
				className="w-full overflow-visible"
				role="img"
				aria-label={`Purchase cap ramp chart. Current cap: ${effectiveCurrentCap} keys`}
			>
				<defs>
					<linearGradient id="rampAreaGrad" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#fbbf24" stopOpacity="0.25" />
						<stop offset="100%" stopColor="#fbbf24" stopOpacity="0.02" />
					</linearGradient>
				</defs>

				{/* Horizontal grid lines */}
				<line
					x1={padLeft}
					y1={padTop}
					x2={viewBoxWidth - padRight}
					y2={padTop}
					stroke="rgba(255,255,255,0.08)"
					strokeDasharray="3 3"
				/>
				<line
					x1={padLeft}
					y1={padTop + plotHeight / 2}
					x2={viewBoxWidth - padRight}
					y2={padTop + plotHeight / 2}
					stroke="rgba(255,255,255,0.08)"
					strokeDasharray="3 3"
				/>
				<line
					x1={padLeft}
					y1={padTop + plotHeight}
					x2={viewBoxWidth - padRight}
					y2={padTop + plotHeight}
					stroke="rgba(255,255,255,0.15)"
				/>

				{/* Y-axis labels */}
				<text
					x={padLeft - 6}
					y={padTop + 4}
					textAnchor="end"
					className="text-[9px] fill-white/40 tabular-nums"
				>
					{maxCap}
				</text>
				<text
					x={padLeft - 6}
					y={padTop + plotHeight / 2 + 3}
					textAnchor="end"
					className="text-[9px] fill-white/40 tabular-nums"
				>
					{Math.round(maxCap / 2)}
				</text>
				<text
					x={padLeft - 6}
					y={padTop + plotHeight + 3}
					textAnchor="end"
					className="text-[9px] fill-white/40 tabular-nums"
				>
					0
				</text>

				{/* Shaded area under curve */}
				<path d={areaPath} fill="url(#rampAreaGrad)" />

				{/* Step-line */}
				<path
					d={linePath}
					fill="none"
					stroke="#fbbf24"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>

				{/* Schedule step markers */}
				{sortedSteps.map((step, idx) => {
					const sx = getX(step.timestamp);
					const sy = getY(step.cap);
					return (
						<circle
							key={idx}
							cx={sx}
							cy={sy}
							r={2.5}
							className="fill-amber-300/80"
						/>
					);
				})}

				{/* Current point indicator (#1385) */}
				<circle
					cx={currentX}
					cy={currentY}
					r={8}
					className="fill-amber-400/25 animate-pulse"
				/>
				<circle
					cx={currentX}
					cy={currentY}
					r={4.5}
					className="fill-amber-400 stroke-slate-950 stroke-2"
					data-testid="ramp-chart-current-point"
					aria-label={`Current cap: ${effectiveCurrentCap} keys`}
				/>
				<text
					x={Math.min(Math.max(currentX, padLeft + 20), viewBoxWidth - padRight - 20)}
					y={Math.max(12, currentY - 8)}
					textAnchor="middle"
					className="text-[10px] font-bold fill-amber-300 tabular-nums"
				>
					Current: {effectiveCurrentCap}
				</text>

				{/* X-axis time labels */}
				<text
					x={padLeft}
					y={viewBoxHeight - 6}
					textAnchor="start"
					className="text-[9px] fill-white/40"
				>
					{formatChartTime(minTime)}
				</text>
				<text
					x={viewBoxWidth - padRight}
					y={viewBoxHeight - 6}
					textAnchor="end"
					className="text-[9px] fill-white/40"
				>
					{formatChartTime(maxTime)}
				</text>
			</svg>
		</div>
	);
};

export default LaunchCapRampChart;
