export type TrendDirection = 'up' | 'down' | 'flat';

export interface UniqueTradersTrend {
	direction: TrendDirection;
	/** Absolute change vs 24 hours ago. */
	delta: number;
}

/**
 * Compares the current unique trader count with the count from 24 hours ago
 * (#1020). Returns null when either value is missing, so no trend is shown
 * rather than a misleading one.
 */
export function getUniqueTradersTrend(
	current: number | null | undefined,
	previous: number | null | undefined
): UniqueTradersTrend | null {
	if (current == null || previous == null) return null;
	if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
	const diff = current - previous;
	if (diff > 0) return { direction: 'up', delta: diff };
	if (diff < 0) return { direction: 'down', delta: -diff };
	return { direction: 'flat', delta: 0 };
}
