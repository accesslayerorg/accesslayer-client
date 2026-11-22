import { STROOPS_PER_XLM } from '@/constants/stellar';
import type { PriceHistoryPoint } from '@/services/course.service';

export interface ComparisonSeriesInput {
	keyId: string;
	points: PriceHistoryPoint[] | undefined;
}

export type ComparisonChartRow = { timestamp: number } & Record<
	string,
	number | null
>;

/**
 * Merges each key's price history (stroops) into one row per timestamp so
 * several keys can be overlaid on a single chart (#1247). Values are XLM.
 * Keys with no sample at a timestamp get `null`.
 */
export function buildComparisonChartData(
	series: ComparisonSeriesInput[]
): ComparisonChartRow[] {
	const rows = new Map<number, ComparisonChartRow>();

	for (const { keyId, points } of series) {
		for (const point of points ?? []) {
			const ts = new Date(point.timestamp).getTime();
			if (!Number.isFinite(ts) || !Number.isFinite(point.price)) continue;
			const row = rows.get(ts) ?? ({ timestamp: ts } as ComparisonChartRow);
			row[keyId] = point.price / STROOPS_PER_XLM;
			rows.set(ts, row);
		}
	}

	return [...rows.values()]
		.sort((a, b) => a.timestamp - b.timestamp)
		.map(row => {
			const full = { ...row };
			for (const { keyId } of series) {
				if (full[keyId] === undefined) full[keyId] = null;
			}
			return full;
		});
}

/** Parses the `keys` query param: trims, dedupes, caps at `max`. */
export function parseComparisonKeyIds(raw: string | null, max = 3): string[] {
	if (!raw) return [];
	const ids = raw
		.split(',')
		.map(id => id.trim())
		.filter(Boolean);
	return [...new Set(ids)].slice(0, max);
}

/** Stable line colors, one per comparison slot. */
export const COMPARISON_LINE_COLORS = ['#fbbf24', '#34d399', '#60a5fa'] as const;
