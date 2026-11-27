/**
 * Portfolio correlation and diversification analysis (#1474).
 *
 * Pure functions over daily key snapshots, so the maths can be tested on its
 * own:
 *
 * - Daily returns come from consecutive daily closing prices.
 * - Pairwise correlation is Pearson's r over the days both keys have a
 *   return.
 * - The diversification score combines how evenly value is spread
 *   (Herfindahl concentration) with how much the holdings move together
 *   (weighted average correlation).
 */

import type { KeySnapshot } from '@/services/keySnapshotHistory.service';

/** Keys with fewer daily snapshots than this are left out of the analysis. */
export const MIN_HISTORY_DAYS = 14;
/** Pairs above this correlation are highlighted as overlapping exposure. */
export const HIGH_CORRELATION_THRESHOLD = 0.8;

export interface ReturnSeries {
	/** ISO day (YYYY-MM-DD) → simple daily return. */
	byDay: Map<string, number>;
	/** Number of daily closing prices the returns were built from. */
	days: number;
}

/** ISO day for a snapshot date, or null when it cannot be parsed. */
function dayOf(snapshotDate: string): string | null {
	const t = Date.parse(snapshotDate);
	if (!Number.isFinite(t)) return null;
	return new Date(t).toISOString().slice(0, 10);
}

/**
 * Daily simple returns from snapshots: one closing price per day (the last
 * snapshot of that day), then p[t] / p[t-1] - 1 for consecutive calendar days.
 * Days with a missing or non-positive price break the chain.
 */
export function dailyReturns(snapshots: readonly KeySnapshot[]): ReturnSeries {
	const closes = new Map<string, { t: number; price: number }>();
	for (const s of snapshots) {
		const day = dayOf(s.snapshotDate);
		if (!day || !Number.isFinite(s.priceStroops) || s.priceStroops <= 0)
			continue;
		const t = Date.parse(s.snapshotDate);
		const prev = closes.get(day);
		if (!prev || t >= prev.t) closes.set(day, { t, price: s.priceStroops });
	}
	const days = [...closes.keys()].sort();
	const byDay = new Map<string, number>();
	for (let i = 1; i < days.length; i++) {
		const prevDay = new Date(`${days[i - 1]}T00:00:00Z`).getTime();
		const thisDay = new Date(`${days[i]}T00:00:00Z`).getTime();
		if (thisDay - prevDay !== 86_400_000) continue;
		const p0 = closes.get(days[i - 1])!.price;
		const p1 = closes.get(days[i])!.price;
		byDay.set(days[i], p1 / p0 - 1);
	}
	return { byDay, days: days.length };
}

/**
 * Pearson correlation of two return series over their common days.
 * Returns null when they share fewer than `minOverlap` days or either is flat
 * over the overlap (correlation is undefined for a constant series).
 */
export function pearsonCorrelation(
	a: ReturnSeries,
	b: ReturnSeries,
	minOverlap = MIN_HISTORY_DAYS - 1
): number | null {
	const xs: number[] = [];
	const ys: number[] = [];
	for (const [day, x] of a.byDay) {
		const y = b.byDay.get(day);
		if (y !== undefined) {
			xs.push(x);
			ys.push(y);
		}
	}
	const n = xs.length;
	if (n < minOverlap || n < 2) return null;
	const mx = xs.reduce((s, v) => s + v, 0) / n;
	const my = ys.reduce((s, v) => s + v, 0) / n;
	let sxy = 0;
	let sxx = 0;
	let syy = 0;
	for (let i = 0; i < n; i++) {
		const dx = xs[i] - mx;
		const dy = ys[i] - my;
		sxy += dx * dy;
		sxx += dx * dx;
		syy += dy * dy;
	}
	if (sxx === 0 || syy === 0) return null;
	return Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy)));
}

/** Two decimals, or "n/a" for an undefined correlation. */
export function formatCorrelation(value: number | null): string {
	return value === null ? 'n/a' : value.toFixed(2);
}

export interface CorrelationMatrix {
	keyIds: string[];
	/** values[i][j]; symmetric, 1 on the diagonal, null when undefined. */
	values: (number | null)[][];
}

export function buildCorrelationMatrix(
	series: ReadonlyMap<string, ReturnSeries>,
	keyIds: readonly string[] = [...series.keys()]
): CorrelationMatrix {
	const ids = [...keyIds];
	const values: (number | null)[][] = ids.map(() => ids.map(() => null));
	for (let i = 0; i < ids.length; i++) {
		values[i][i] = 1;
		for (let j = i + 1; j < ids.length; j++) {
			const r = pearsonCorrelation(series.get(ids[i])!, series.get(ids[j])!);
			values[i][j] = r;
			values[j][i] = r;
		}
	}
	return { keyIds: ids, values };
}

export interface CorrelatedPair {
	a: string;
	b: string;
	correlation: number;
}

/** Pairs strictly above `threshold`, strongest first. */
export function highlyCorrelatedPairs(
	matrix: CorrelationMatrix,
	threshold = HIGH_CORRELATION_THRESHOLD
): CorrelatedPair[] {
	const out: CorrelatedPair[] = [];
	const { keyIds, values } = matrix;
	for (let i = 0; i < keyIds.length; i++)
		for (let j = i + 1; j < keyIds.length; j++) {
			const r = values[i][j];
			if (r !== null && r > threshold)
				out.push({ a: keyIds[i], b: keyIds[j], correlation: r });
		}
	return out.sort((x, y) => y.correlation - x.correlation);
}

/** Normalises non-negative values to weights that sum to 1 (empty when total is 0). */
export function normaliseWeights(
	values: ReadonlyMap<string, number>
): Map<string, number> {
	let total = 0;
	for (const v of values.values()) if (Number.isFinite(v) && v > 0) total += v;
	const out = new Map<string, number>();
	if (total <= 0) return out;
	for (const [k, v] of values)
		if (Number.isFinite(v) && v > 0) out.set(k, v / total);
	return out;
}

export type DiversificationLabel =
	| 'Well diversified'
	| 'Moderately diversified'
	| 'Concentrated'
	| 'Highly concentrated';

export interface DiversificationScore {
	/** 0 (one position, or everything moves together) to 100. */
	score: number;
	label: DiversificationLabel;
	/** Herfindahl index of the weights: 1 = a single position. */
	concentration: number;
	/** Weight-averaged pairwise correlation; null with fewer than two known pairs. */
	averageCorrelation: number | null;
	/** 1 / HHI: how many equally sized positions the weights amount to. */
	effectivePositions: number;
	/** The plain-language explanation shown under the score. */
	summary: string;
}

export function labelForScore(score: number): DiversificationLabel {
	if (score >= 60) return 'Well diversified';
	if (score >= 35) return 'Moderately diversified';
	if (score >= 15) return 'Concentrated';
	return 'Highly concentrated';
}

/**
 * Diversification score from position weights and the correlation matrix.
 *
 *   spread      = 1 - HHI                      (0 for a single position)
 *   overlap     = max(0, weighted average ρ)   (negative ρ is not rewarded)
 *   score       = round(100 × spread × (1 - overlap))
 *
 * The weighted average correlation weights each pair by w_i × w_j, so a
 * strongly correlated pair matters more when both positions are large.
 * Pairs with an undefined correlation are left out of the average.
 */
export function diversificationScore(
	weights: ReadonlyMap<string, number>,
	matrix: CorrelationMatrix
): DiversificationScore {
	const ids = matrix.keyIds.filter(id => (weights.get(id) ?? 0) > 0);
	const w = normaliseWeights(new Map(ids.map(id => [id, weights.get(id)!])));
	let hhi = 0;
	for (const v of w.values()) hhi += v * v;
	const index = new Map(matrix.keyIds.map((id, i) => [id, i]));
	let num = 0;
	let den = 0;
	for (let a = 0; a < ids.length; a++)
		for (let b = a + 1; b < ids.length; b++) {
			const r = matrix.values[index.get(ids[a])!][index.get(ids[b])!];
			if (r === null) continue;
			const pw = w.get(ids[a])! * w.get(ids[b])!;
			num += pw * r;
			den += pw;
		}
	const averageCorrelation = den > 0 ? num / den : null;
	const spread = w.size ? 1 - hhi : 0;
	const overlap = Math.max(0, averageCorrelation ?? 0);
	const score = Math.round(100 * spread * (1 - overlap));
	const label = labelForScore(score);
	const effectivePositions = hhi > 0 ? 1 / hhi : 0;
	const corrText =
		averageCorrelation === null
			? 'There is not enough shared history to measure how they move together.'
			: averageCorrelation > 0.6
				? 'Your keys tend to move together, so a drop in one is likely to hit the others.'
				: averageCorrelation > 0.3
					? 'Your keys move together somewhat.'
					: 'Your keys mostly move independently of each other.';
	const summary =
		w.size <= 1
			? 'All of your analysed value is in a single key.'
			: `Your value is spread like ${effectivePositions.toFixed(1)} equal positions. ${corrText}`;
	return {
		score,
		label,
		concentration: hhi,
		averageCorrelation,
		effectivePositions,
		summary,
	};
}
