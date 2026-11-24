import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronUp, Table as TableIcon } from 'lucide-react';

export interface TimeSeriesPoint {
	timestamp: string;
	[key: string]: string | number;
}

export type GenericDataPoint = Record<string, unknown>;

export interface AccessibleChartProps {
	title: string;
	summary: string;
	tableHeaders: string[];
	tableData: GenericDataPoint[];
	getRowValues: (row: GenericDataPoint) => (string | number)[];
	children: React.ReactNode;
	className?: string;
	'data-testid'?: string;
}

export function generateTimeSeriesSummary(
	data: TimeSeriesPoint[],
	valueKey: string,
	valueLabel = 'value'
): string {
	if (data.length === 0) return 'No data available.';

	const values = data
		.map(d => Number(d[valueKey]))
		.filter(v => Number.isFinite(v));

	if (values.length === 0) return 'No data available.';

	const high = Math.max(...values);
	const low = Math.min(...values);
	const latest = values[values.length - 1];
	const first = values[0];
	const trend =
		latest > first ? 'trending up' : latest < first ? 'trending down' : 'flat';

	return `${valueLabel.charAt(0).toUpperCase() + valueLabel.slice(1)} data for ${data.length} points. High: ${high.toLocaleString()}, low: ${low.toLocaleString()}, latest: ${latest.toLocaleString()}. ${trend.charAt(0).toUpperCase() + trend.slice(1)}.`;
}

export default function AccessibleChart({
	title,
	summary,
	tableHeaders,
	tableData,
	getRowValues,
	children,
	className,
	'data-testid': testId,
}: AccessibleChartProps) {
	const [showTable, setShowTable] = useState(false);
	const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
	const tbodyRef = useRef<HTMLTableSectionElement>(null);

	const descId = `chart-desc-${title.toLowerCase().replace(/\s+/g, '-')}`;

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTableSectionElement>) => {
			if (!tbodyRef.current) return;
			const rows = tbodyRef.current.querySelectorAll('tr');
			if (rows.length === 0) return;

			if (e.key === 'ArrowDown') {
				e.preventDefault();
				setFocusedIndex(prev => {
					const next = prev === null ? 0 : Math.min(prev + 1, rows.length - 1);
					(rows[next] as HTMLElement).focus();
					return next;
				});
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				setFocusedIndex(prev => {
					const next = prev === null ? 0 : Math.max(prev - 1, 0);
					(rows[next] as HTMLElement).focus();
					return next;
				});
			}
		},
		[]
	);

	useEffect(() => {
		if (showTable && tbodyRef.current) {
			const firstRow = tbodyRef.current.querySelector('tr') as HTMLElement | null;
			firstRow?.focus();
			setFocusedIndex(0);
		}
	}, [showTable]);

	const liveValue = useMemo(() => {
		if (focusedIndex === null || !tableData[focusedIndex]) return '';
		return getRowValues(tableData[focusedIndex])
			.map((v, i) => `${tableHeaders[i] ?? ''}: ${v}`)
			.join(', ');
	}, [focusedIndex, tableData, getRowValues, tableHeaders]);

	return (
		<div className={className} data-testid={testId}>
			<p id={descId} className="sr-only">
				{summary}
			</p>

			<div
				aria-label={title}
				aria-describedby={descId}
				role="img"
			>
				{children}
			</div>

			<div
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
			>
				{liveValue}
			</div>

			{tableData.length > 0 && (
				<div className="mt-2">
					<button
						type="button"
						onClick={() => setShowTable(v => !v)}
						aria-expanded={showTable}
						aria-controls={`${descId}-table`}
						className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
						data-testid={testId ? `${testId}-table-toggle` : 'chart-table-toggle'}
					>
						<TableIcon className="size-3" aria-hidden="true" />
						{showTable ? 'Hide table view' : 'View as table'}
						{showTable ? (
							<ChevronUp className="size-3" aria-hidden="true" />
						) : (
							<ChevronDown className="size-3" aria-hidden="true" />
						)}
					</button>

					{showTable && (
						<div
							id={`${descId}-table`}
							className="mt-2 overflow-x-auto rounded-xl border border-white/10 bg-black/20"
							data-testid={testId ? `${testId}-table` : 'chart-table'}
						>
							<table
								className="w-full text-left text-xs text-white/70"
								aria-label={`${title} data table`}
								aria-rowcount={tableData.length}
							>
								<thead>
									<tr className="border-b border-white/10">
										{tableHeaders.map(h => (
											<th
												key={h}
												scope="col"
												className="px-3 py-2 font-semibold uppercase tracking-wider text-white/40"
											>
												{h}
											</th>
										))}
									</tr>
								</thead>
								<tbody
									ref={tbodyRef}
									onKeyDown={handleKeyDown}
									className="divide-y divide-white/5"
								>
									{tableData.map((row, i) => {
										const values = getRowValues(row);
										return (
											<tr
												key={i}
												tabIndex={0}
												aria-rowindex={i + 1}
												className="cursor-pointer hover:bg-white/5 focus:bg-white/5 outline-none focus-visible:ring-1 focus-visible:ring-amber-400/60"
												onFocus={() => setFocusedIndex(i)}
											>
												{values.map((v, j) => (
													<td key={j} className="px-3 py-2 tabular-nums">
														{v}
													</td>
												))}
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
