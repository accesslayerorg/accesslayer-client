import type {
	KeySnapshot,
	SnapshotHistoryRange,
	SnapshotMetric,
} from '@/services/keySnapshotHistory.service';

export const SNAPSHOT_HISTORY_RANGES: ReadonlyArray<{
	value: SnapshotHistoryRange;
	label: string;
}> = [
	{ value: '7d', label: '7d' },
	{ value: '30d', label: '30d' },
	{ value: '90d', label: '90d' },
	{ value: 'all', label: 'All Time' },
];

export const SNAPSHOT_METRICS: ReadonlyArray<{
	value: SnapshotMetric;
	label: string;
}> = [
	{ value: 'price', label: 'Price' },
	{ value: 'volume', label: 'Volume' },
	{ value: 'holders', label: 'Holders' },
	{ value: 'marketCap', label: 'Market Cap' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** One chart-ready point: numeric timestamp plus every metric's value. */
export interface SnapshotHistoryPoint {
	ts: number;
	price: number;
	volume: number;
	holders: number;
	marketCap: number;
}

function rangeWindowMs(range: SnapshotHistoryRange): number | null {
	if (range === '7d') return 7 * DAY_MS;
	if (range === '30d') return 30 * DAY_MS;
	if (range === '90d') return 90 * DAY_MS;
	return null;
}

/**
 * Converts raw snapshots into chart points for the selected range: drops
 * malformed entries, keeps only points inside the window, and sorts
 * oldest-to-newest so the line always reads left-to-right (#1142).
 */
export function buildSnapshotHistoryPoints(
	snapshots: KeySnapshot[] | undefined,
	range: SnapshotHistoryRange,
	now: number = Date.now()
): SnapshotHistoryPoint[] {
	const windowMs = rangeWindowMs(range);
	const cutoff = windowMs == null ? -Infinity : now - windowMs;

	return (snapshots ?? [])
		.map(snapshot => ({
			ts: Date.parse(snapshot.snapshotDate),
			price: snapshot.priceStroops,
			volume: snapshot.volumeStroops,
			holders: snapshot.holderCount,
			marketCap: snapshot.marketCapStroops,
		}))
		.filter(point => Number.isFinite(point.ts) && point.ts >= cutoff)
		.sort((a, b) => a.ts - b.ts);
}

/** Maps a metric to the chart point's corresponding dataKey. */
export function metricDataKey(
	metric: SnapshotMetric
): keyof Omit<SnapshotHistoryPoint, 'ts'> {
	return metric;
}

/**
 * Value formatter for a metric's axis/tooltip display. Price and market cap
 * are quoted in XLM (stroops / 10,000,000); volume likewise; holders is a
 * plain count.
 */
export function formatMetricValue(
	metric: SnapshotMetric,
	value: number
): string {
	if (!Number.isFinite(value)) return '—';
	if (metric === 'holders') {
		return new Intl.NumberFormat('en-US').format(Math.round(value));
	}
	const xlm = value / 10_000_000;
	return `${new Intl.NumberFormat('en-US', {
		maximumFractionDigits: 2,
	}).format(xlm)} XLM`;
}

export function formatSnapshotAxisDate(ts: number): string {
	return new Date(ts).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		timeZone: 'UTC',
	});
}

export function metricLabel(metric: SnapshotMetric): string {
	return SNAPSHOT_METRICS.find(m => m.value === metric)?.label ?? metric;
}

/** True once there are enough points for the line to be meaningful. */
export function hasSnapshotHistoryData(
	points: SnapshotHistoryPoint[]
): boolean {
	return points.length > 0;
}
