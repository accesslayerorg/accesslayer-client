import React, { useState, useMemo } from 'react';
import {
	useActivityHeatmap,
	type HeatmapRange,
	type HeatmapMetric,
	SHORT_WEEKDAYS,
	formatHourLabel,
} from '@/hooks/useActivityHeatmap';
import { useTimezone } from '@/hooks/useTimezone';
import { formatNumber, formatCompactNumber } from '@/utils/numberFormat.utils';
import { getZoneAbbreviation } from '@/utils/time';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Flame, Table, Grid3X3, Clock, AlertCircle } from 'lucide-react';

export interface ActivityHeatmapProps {
	keyId?: string;
	className?: string;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
	keyId,
	className,
}) => {
	const [range, setRange] = useState<HeatmapRange>('30d');
	const [metric, setMetric] = useState<HeatmapMetric>('trades');
	const [forceUtc, setForceUtc] = useState<boolean>(false);
	const [showTableView, setShowTableView] = useState<boolean>(false);

	const storeZone = useTimezone(state => state.effectiveTimezone);
	const activeZone = forceUtc ? 'UTC' : storeZone;

	const {
		grid,
		busiestTrades,
		busiestVolume,
		totalTrades,
		totalVolume,
		hasMinimumData,
		summarySentence,
		isLoading,
	} = useActivityHeatmap(keyId, range, activeZone);

	const currentBusiest = metric === 'trades' ? busiestTrades : busiestVolume;
	const maxValue = useMemo(() => {
		let max = 0;
		for (const row of grid) {
			for (const cell of row) {
				const val = metric === 'trades' ? cell.tradeCount : cell.volume;
				if (val > max) max = val;
			}
		}
		return max || 1;
	}, [grid, metric]);

	const getCellColor = (val: number, isBusiest: boolean) => {
		if (val === 0) return 'bg-white/5 border border-white/5';
		const ratio = Math.min(1, val / maxValue);
		if (isBusiest) {
			return 'bg-amber-400 border-2 border-amber-300 ring-2 ring-amber-400/40 text-slate-950 font-bold';
		}
		if (ratio > 0.75) return 'bg-amber-500/80 border border-amber-400 text-white';
		if (ratio > 0.5) return 'bg-amber-600/70 border border-amber-500/50 text-white';
		if (ratio > 0.25) return 'bg-amber-700/50 border border-amber-600/30 text-white/90';
		return 'bg-amber-800/30 border border-amber-700/20 text-white/70';
	};

	const zoneAbbr = getZoneAbbreviation(new Date(), activeZone);

	return (
		<div
			data-testid="activity-heatmap"
			className={cn(
				'rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-md',
				className
			)}
		>
			{/* Top Controls Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-5">
				<div>
					<div className="flex items-center gap-2">
						<Flame className="size-5 text-amber-400" aria-hidden="true" />
						<h3 className="font-jakarta text-lg font-bold text-white">
							Trading Activity Heatmap
						</h3>
					</div>
					<p className="mt-1 text-xs text-white/60">
						Trade counts and volume by day and hour across selected timezone.
					</p>
				</div>

				{/* Controls Toolbar */}
				<div className="flex flex-wrap items-center gap-2">
					{/* Metric Toggle */}
					<div
						role="group"
						aria-label="Select metric"
						className="flex rounded-lg bg-white/5 p-1 text-xs"
					>
						<button
							type="button"
							onClick={() => setMetric('trades')}
							data-testid="heatmap-metric-trades"
							className={cn(
								'rounded px-2.5 py-1 font-medium transition-colors',
								metric === 'trades'
									? 'bg-amber-400 text-slate-950'
									: 'text-white/60 hover:text-white'
							)}
						>
							Trades
						</button>
						<button
							type="button"
							onClick={() => setMetric('volume')}
							data-testid="heatmap-metric-volume"
							className={cn(
								'rounded px-2.5 py-1 font-medium transition-colors',
								metric === 'volume'
									? 'bg-amber-400 text-slate-950'
									: 'text-white/60 hover:text-white'
							)}
						>
							Volume
						</button>
					</div>

					{/* Range Toggle */}
					<div
						role="group"
						aria-label="Select time range"
						className="flex rounded-lg bg-white/5 p-1 text-xs"
					>
						{(['7d', '30d', '90d'] as const).map(r => (
							<button
								key={r}
								type="button"
								onClick={() => setRange(r)}
								data-testid={`heatmap-range-${r}`}
								className={cn(
									'rounded px-2 py-1 font-medium transition-colors',
									range === r
										? 'bg-amber-400 text-slate-950'
										: 'text-white/60 hover:text-white'
								)}
							>
								{r}
							</button>
						))}
					</div>

					{/* Timezone / UTC Toggle */}
					<button
						type="button"
						onClick={() => setForceUtc(!forceUtc)}
						data-testid="heatmap-toggle-utc"
						className={cn(
							'flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
							forceUtc
								? 'border-amber-400/60 bg-amber-400/20 text-amber-200'
								: 'border-white/10 bg-white/5 text-white/70 hover:text-white'
						)}
					>
						<Clock className="size-3.5" />
						<span>{forceUtc ? 'UTC' : zoneAbbr}</span>
					</button>

					{/* Table View Toggle for Accessibility */}
					<button
						type="button"
						onClick={() => setShowTableView(!showTableView)}
						data-testid="heatmap-toggle-table"
						aria-label={showTableView ? 'Switch to grid view' : 'Switch to accessible table view'}
						className={cn(
							'flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
							showTableView
								? 'border-amber-400/60 bg-amber-400/20 text-amber-200'
								: 'border-white/10 bg-white/5 text-white/70 hover:text-white'
						)}
					>
						{showTableView ? <Grid3X3 className="size-3.5" /> : <Table className="size-3.5" />}
						<span>{showTableView ? 'Grid' : 'Table'}</span>
					</button>
				</div>
			</div>

			{/* Summary Bar */}
			<div className="mt-4 flex flex-col gap-2 rounded-xl bg-white/[0.03] p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
				<div data-testid="heatmap-summary-sentence" className="text-white/90 font-medium">
					{summarySentence}
				</div>
				<div className="flex items-center gap-4 text-white/60">
					<span>Total trades: <strong className="text-white">{totalTrades}</strong></span>
					<span>Total volume: <strong className="text-white">{formatCompactNumber(totalVolume)} XLM</strong></span>
				</div>
			</div>

			{/* Minimum Data Notice if data is low */}
			{!isLoading && !hasMinimumData && (
				<div
					data-testid="heatmap-minimum-data-notice"
					className="mt-4 flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3.5 text-xs text-amber-300"
				>
					<AlertCircle className="size-4 shrink-0" />
					<span>
						Minimum-data notice: This key has limited trading activity in the last {range}. Additional data will populate the activity cells as trades occur.
					</span>
				</div>
			)}

			{/* Content: Either Accessible Table View OR Interactive Grid */}
			{showTableView ? (
				<div className="mt-5 overflow-x-auto" data-testid="heatmap-table-container">
					<table
						data-testid="heatmap-table-alternative"
						className="w-full text-left text-xs text-white/80 border-collapse"
					>
						<caption className="sr-only">
							Trading activity heatmap table showing trade count and volume by weekday and hour in {activeZone}
						</caption>
						<thead>
							<tr className="border-b border-white/10 text-white/40">
								<th scope="col" className="p-2 font-medium">Weekday</th>
								{Array.from({ length: 24 }, (_, h) => (
									<th key={h} scope="col" className="p-2 font-mono font-normal text-center">
										{h}h
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-white/5">
							{grid.map((row, d) => (
								<tr key={d}>
									<th scope="row" className="p-2 font-medium text-white whitespace-nowrap">
										{SHORT_WEEKDAYS[d]}
									</th>
									{row.map(cell => {
										const val = metric === 'trades' ? cell.tradeCount : cell.volume;
										const isBusiest =
											currentBusiest?.day === cell.day && currentBusiest?.hour === cell.hour;
										return (
											<td
												key={cell.hour}
												className={cn(
													'p-2 text-center font-mono',
													isBusiest && 'bg-amber-400/20 font-bold text-amber-300'
												)}
											>
												{metric === 'trades' ? val : formatCompactNumber(val)}
											</td>
										);
									})}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<div className="mt-5 overflow-x-auto" data-testid="heatmap-grid-container">
					<div className="min-w-[680px]">
						{/* Hour Headers */}
						<div className="grid grid-cols-[48px_repeat(24,1fr)] gap-1 text-[0.65rem] font-mono text-white/40 mb-1">
							<div />
							{Array.from({ length: 24 }, (_, h) => (
								<div key={h} className="text-center">
									{h % 3 === 0 ? h : ''}
								</div>
							))}
						</div>

						{/* Rows by Day */}
						<div className="space-y-1">
							{grid.map((row, d) => (
								<div
									key={d}
									className="grid grid-cols-[48px_repeat(24,1fr)] items-center gap-1"
								>
									<span className="text-xs font-medium text-white/60">
										{SHORT_WEEKDAYS[d]}
									</span>

									{row.map(cell => {
										const val = metric === 'trades' ? cell.tradeCount : cell.volume;
										const isBusiest =
											Boolean(currentBusiest) &&
											currentBusiest?.day === cell.day &&
											currentBusiest?.hour === cell.hour &&
											val > 0;

										const formattedVal =
											metric === 'trades'
												? `${val} trade${val === 1 ? '' : 's'}`
												: `${formatNumber(val)} XLM volume`;

										const tooltipText = `${cell.dayName} at ${cell.hourLabel}: ${formattedVal} (${cell.tradeCount} trades, ${formatCompactNumber(cell.volume)} XLM)`;

										return (
											<Tooltip key={cell.hour} content={tooltipText}>
												<div
													tabIndex={0}
													role="gridcell"
													aria-label={tooltipText}
													data-testid={`heatmap-cell-${cell.day}-${cell.hour}`}
													data-busiest={isBusiest ? 'true' : 'false'}
													className={cn(
														'h-7 rounded transition-all duration-150 cursor-pointer flex items-center justify-center text-[0.6rem]',
														getCellColor(val, isBusiest),
														isBusiest && 'scale-105'
													)}
												>
													{val > 0 && (
														<span className="truncate px-0.5">
															{metric === 'trades' ? val : formatCompactNumber(val)}
														</span>
													)}
												</div>
											</Tooltip>
										);
									})}
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ActivityHeatmap;
