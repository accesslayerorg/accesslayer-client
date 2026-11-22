import type {
	HolderSnapshot,
	HolderSnapshotRange,
} from '@/services/holderSnapshots.service';

export const HOLDER_SNAPSHOT_RANGES: ReadonlyArray<{
	value: HolderSnapshotRange;
	label: string;
}> = [
	{ value: '7d', label: '7d' },
	{ value: '30d', label: '30d' },
	{ value: 'all', label: 'All time' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

export interface HolderSnapshotPoint {
	/** Snapshot time as epoch milliseconds (numeric x-axis value). */
	ts: number;
	holderCount: number;
	top10SharePercent: number;
	topHolderPercent: number;
	giniCoefficient: number;
}

function rangeWindowMs(range: HolderSnapshotRange): number | null {
	if (range === '7d') return 7 * DAY_MS;
	if (range === '30d') return 30 * DAY_MS;
	return null;
}

/**
 * Converts API snapshots to chart points: drops malformed entries, keeps only
 * those inside the selected range, and sorts oldest to newest.
 */
export function buildSnapshotPoints(
	snapshots: HolderSnapshot[] | undefined,
	range: HolderSnapshotRange,
	now: number = Date.now()
): HolderSnapshotPoint[] {
	const windowMs = rangeWindowMs(range);
	const cutoff = windowMs == null ? -Infinity : now - windowMs;

	return (snapshots ?? [])
		.map(snapshot => ({
			ts: Date.parse(snapshot.snapshotAt),
			holderCount: snapshot.holderCount,
			top10SharePercent: snapshot.top10SharePercent,
			topHolderPercent: snapshot.topHolderPercent,
			giniCoefficient: snapshot.giniCoefficient,
		}))
		.filter(
			point =>
				Number.isFinite(point.ts) &&
				Number.isFinite(point.holderCount) &&
				Number.isFinite(point.top10SharePercent) &&
				point.ts >= cutoff
		)
		.sort((a, b) => a.ts - b.ts);
}

/** The most recent snapshot, or null when there is none. */
export function latestSnapshot(
	points: HolderSnapshotPoint[]
): HolderSnapshotPoint | null {
	return points.length > 0 ? points[points.length - 1] : null;
}

/** Fewer than this many snapshots cannot draw a meaningful line. */
export const MIN_SNAPSHOTS_FOR_TREND = 3;

export function hasEnoughSnapshotsForTrend(
	points: HolderSnapshotPoint[]
): boolean {
	return points.length >= MIN_SNAPSHOTS_FOR_TREND;
}

export function formatSnapshotDate(ts: number): string {
	return new Date(ts).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		timeZone: 'UTC',
	});
}

export function formatGini(value: number): string {
	return Number.isFinite(value) ? value.toFixed(2) : '—';
}
