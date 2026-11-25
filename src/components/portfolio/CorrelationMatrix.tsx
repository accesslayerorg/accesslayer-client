import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import {
	HIGH_CORRELATION_THRESHOLD,
	formatCorrelation,
	type CorrelationMatrix as CorrelationMatrixData,
} from '@/utils/portfolioCorrelation.utils';

interface CorrelationMatrixProps {
	matrix: CorrelationMatrixData;
	names: Record<string, string>;
}

/** Cell background: amber for positive correlation, sky for negative. */
function cellStyle(value: number | null): CSSProperties {
	if (value === null) return { backgroundColor: 'rgba(255,255,255,0.03)' };
	const alpha = Math.min(1, Math.abs(value)) * 0.55 + 0.05;
	return {
		backgroundColor:
			value >= 0
				? `rgba(251, 191, 36, ${alpha.toFixed(2)})`
				: `rgba(56, 189, 248, ${alpha.toFixed(2)})`,
	};
}

/**
 * Pairwise correlation heatmap (#1474), with the same values in a plain
 * table for screen readers. The heatmap itself is hidden from assistive
 * technology; the table carries the data.
 */
export default function CorrelationMatrix({
	matrix,
	names,
}: CorrelationMatrixProps) {
	const { keyIds, values } = matrix;
	const name = (id: string) => names[id] ?? id;

	return (
		<div className="space-y-4">
			<div
				aria-hidden="true"
				data-testid="correlation-heatmap"
				className="overflow-x-auto"
			>
				<div
					className="grid gap-1"
					style={{
						gridTemplateColumns: `minmax(6rem, auto) repeat(${keyIds.length}, minmax(3.5rem, 1fr))`,
					}}
				>
					<div />
					{keyIds.map(id => (
						<div
							key={`col-${id}`}
							className="truncate px-1 text-center text-[0.65rem] font-bold uppercase tracking-wide text-white/50"
						>
							{name(id)}
						</div>
					))}
					{keyIds.map((row, i) => (
						<div key={`row-${row}`} className="contents">
							<div className="truncate pr-2 text-xs font-semibold text-white/70">
								{name(row)}
							</div>
							{keyIds.map((col, j) => {
								const v = values[i][j];
								const high =
									i !== j && v !== null && v > HIGH_CORRELATION_THRESHOLD;
								return (
									<div
										key={`${row}-${col}`}
										data-high={high ? 'true' : undefined}
										className={cn(
											'rounded-md py-2 text-center font-mono text-xs text-white',
											high && 'ring-2 ring-red-400'
										)}
										style={cellStyle(v)}
									>
										{formatCorrelation(v)}
									</div>
								);
							})}
						</div>
					))}
				</div>
			</div>

			<table className="sr-only">
				<caption>
					Correlation of daily returns between your keys. 1 means they move
					together exactly, 0 means no relationship, and -1 means they move in
					opposite directions. Values above {HIGH_CORRELATION_THRESHOLD} are
					marked as highly correlated.
				</caption>
				<thead>
					<tr>
						<th scope="col">Key</th>
						{keyIds.map(id => (
							<th key={id} scope="col">
								{name(id)}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{keyIds.map((row, i) => (
						<tr key={row}>
							<th scope="row">{name(row)}</th>
							{keyIds.map((col, j) => {
								const v = values[i][j];
								const high =
									i !== j && v !== null && v > HIGH_CORRELATION_THRESHOLD;
								return (
									<td key={col}>
										{formatCorrelation(v)}
										{high ? ' (highly correlated)' : ''}
									</td>
								);
							})}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
