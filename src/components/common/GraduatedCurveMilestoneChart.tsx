import React from 'react';
import {
	ResponsiveContainer,
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip,
	CartesianGrid,
	ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';
import { useGraduatedCurveConfig } from '@/hooks/useGraduatedCurveConfig';
import type { GraduatedCurveConfig, CurveMilestone } from '@/services/course.service';

export interface GraduatedCurveMilestoneChartProps {
	keyId: string;
	currentSupply?: number;
	className?: string;
	height?: number;
	overrideConfig?: GraduatedCurveConfig;
	overrideLoading?: boolean;
}

export const GraduatedCurveMilestoneChart: React.FC<GraduatedCurveMilestoneChartProps> = ({
	keyId,
	currentSupply,
	className,
	height = 320,
	overrideConfig,
	overrideLoading,
}) => {
	const { data: fetchedConfig, isLoading: fetchLoading } = useGraduatedCurveConfig(
		overrideConfig ? undefined : keyId
	);

	const isLoading = overrideLoading ?? fetchLoading;
	const config = overrideConfig ?? fetchedConfig;

	if (isLoading) {
		return (
			<div
				className={cn(
					'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8 space-y-4',
					className
				)}
				data-testid="graduated-curve-skeleton"
				role="status"
				aria-label="Loading graduated curve chart"
			>
				<span className="sr-only">Loading graduated curve chart</span>
				<div className="h-6 w-48 rounded-md bg-white/12 skeleton-shimmer" />
				<div className="h-[280px] w-full rounded-xl bg-white/12 skeleton-shimmer" />
			</div>
		);
	}

	const rawMilestones = config?.milestones ?? [];

	if (!rawMilestones || rawMilestones.length === 0) {
		return (
			<div
				className={cn(
					'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8 flex flex-col items-center justify-center text-center min-h-[220px]',
					className
				)}
				data-testid="no-graduated-curve"
			>
				<p
					className="text-sm font-medium text-white/70"
					data-testid="no-graduated-curve-message"
				>
					No graduated curve configured — using default exponent
				</p>
			</div>
		);
	}

	// Normalize milestones data to handle flexible API property names
	const normalizedMilestones: CurveMilestone[] = rawMilestones.map(m => {
		const raw = m as unknown as Record<string, unknown>;
		const supplyThreshold = Number(
			m.supplyThreshold ?? raw.supply ?? raw.threshold ?? 0
		);
		const simulatedPrice = Number(
			m.simulatedPrice ?? raw.price ?? raw.simulatedPriceXLM ?? 0
		);
		const exponent = Number(m.exponent ?? raw.exponent ?? 1);
		const exponentChange = m.exponentChange ?? (raw.exponentChange as string) ?? undefined;

		return {
			supplyThreshold,
			simulatedPrice,
			exponent,
			exponentChange,
		};
	}).sort((a, b) => a.supplyThreshold - b.supplyThreshold);
	const finalMilestone = normalizedMilestones[normalizedMilestones.length - 1];
	const nextMilestone =
		currentSupply === undefined
			? finalMilestone
			: normalizedMilestones.find(m => m.supplyThreshold > currentSupply);
	const progressPercent =
		currentSupply === undefined || finalMilestone.supplyThreshold <= 0
			? 0
			: Math.min(100, Math.max(0, (currentSupply / finalMilestone.supplyThreshold) * 100));
	const remainingSupply = nextMilestone
		? Math.max(0, nextMilestone.supplyThreshold - (currentSupply ?? 0))
		: 0;

	// Ensure milestone step points for Recharts step chart rendering
	const chartData = [...normalizedMilestones];

	return (
		<div
			className={cn(
				'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8',
				className
			)}
			data-testid="graduated-curve-chart-container"
		>
			<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
				<div>
					<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
						Graduated Curve Price Milestones
					</h2>
					<p className="mt-1 text-xs text-white/50">
						Simulated key prices at each configured supply milestone
					</p>
				</div>
				{config?.defaultExponent !== undefined && (
					<div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
						Default Exponent:{' '}
						<span className="font-semibold text-emerald-400">
							{config.defaultExponent}
						</span>
					</div>
				)}
			</div>
			<div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4" data-testid="milestone-progress-panel">
				<div className="flex items-start justify-between gap-4 text-sm">
					<div>
						<p className="font-semibold text-white">Graduation progress</p>
						<p className="mt-1 text-xs text-white/55">
							{currentSupply === undefined
								? 'Connect live supply data to see your position.'
								: nextMilestone
									? `${remainingSupply.toLocaleString()} keys until the ${nextMilestone.supplyThreshold.toLocaleString()}-key milestone`
									: 'Final milestone reached — the key is graduated.'}
						</p>
					</div>
					<span className="font-semibold text-emerald-400" data-testid="milestone-progress-value">
						{Math.round(progressPercent)}%
					</span>
				</div>
				<div
					className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"
					role="progressbar"
					aria-label="Graduated curve progress"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={Math.round(progressPercent)}
				>
					<div className="h-full rounded-full bg-emerald-400 transition-[width]" style={{ width: `${progressPercent}%` }} />
				</div>
				<div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/50">
					{normalizedMilestones.map(milestone => (
						<span key={milestone.supplyThreshold}>
							{milestone.supplyThreshold.toLocaleString()} keys · {milestone.simulatedPrice} XLM
						</span>
					))}
				</div>
			</div>

			<div
				className="w-full relative min-h-[280px]"
				data-testid="graduated-curve-chart"
				data-milestone-count={normalizedMilestones.length}
			>
				<ResponsiveContainer width="100%" height={height}>
					<LineChart
						data={chartData}
						margin={{ top: 25, right: 30, left: 10, bottom: 25 }}
					>
						<CartesianGrid strokeDasharray="3 3" stroke="#262626" />
						<XAxis
							dataKey="supplyThreshold"
							type="number"
							stroke="#737373"
							tickLine={false}
							unit=" keys"
							data-testid="x-axis"
						/>
						<YAxis
							dataKey="simulatedPrice"
							stroke="#737373"
							tickLine={false}
							unit=" XLM"
							data-testid="y-axis"
						/>
						<Tooltip
							contentStyle={{
								backgroundColor: '#171717',
								borderColor: '#404040',
								borderRadius: '0.75rem',
								color: '#f5f5f5',
							}}
							formatter={(value: unknown) => [`${value} XLM`, 'Simulated Price']}
							labelFormatter={(label: unknown) => `Supply Threshold: ${label} keys`}
						/>
						<Line
							type="stepAfter"
							dataKey="simulatedPrice"
							stroke="#10b981"
							strokeWidth={2.5}
							dot={{ r: 4, fill: '#10b981', stroke: '#047857' }}
							activeDot={{ r: 7, fill: '#34d399' }}
						/>
						{/* Render milestone threshold vertical lines and exponent labels */}
						{normalizedMilestones.map((m, idx) => {
							const labelText = m.exponentChange
								? `${m.exponentChange}`
								: `^${m.exponent}`;
							return (
								<ReferenceLine
									key={`milestone-line-${idx}-${m.supplyThreshold}`}
									x={m.supplyThreshold}
									stroke="#8b5cf6"
									strokeDasharray="4 4"
									strokeWidth={1.5}
									data-testid={`milestone-line-${m.supplyThreshold}`}
									label={{
										value: labelText,
										position: 'top',
										fill: '#a78bfa',
										fontSize: 11,
										fontWeight: 600,
									}}
								/>
							);
						})}
						{/* Current Supply Marker */}
						{currentSupply !== undefined && (
							<ReferenceLine
								x={currentSupply}
								stroke="#ec4899"
								strokeDasharray="5 5"
								strokeWidth={2}
								data-testid="current-supply-marker"
								label={{
									value: `Current (${currentSupply})`,
									position: 'insideTopRight',
									fill: '#f472b6',
									fontSize: 11,
									fontWeight: 700,
								}}
							/>
						)}
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};

export default GraduatedCurveMilestoneChart;
