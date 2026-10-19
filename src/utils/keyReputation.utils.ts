import type { KeyReputation } from '@/services/keyReputation.service';

/** Maximum value any reputation metric (composite or component) can hold. */
export const REPUTATION_SCORE_MAX = 1000;

/** Plain-language explanation of how the composite score is computed. */
export const REPUTATION_METHODOLOGY_TOOLTIP =
	'Composite score out of 1000, weighted equally across trade volume, ' +
	'holder retention, price stability, and community rating. Recomputed ' +
	'daily from on-chain activity.';

export interface ReputationRadarPoint {
	metric: string;
	/** Raw score, 0–1000. */
	value: number;
	/** Score rescaled to 0–100 for consistent radar axis display. */
	normalized: number;
}

/** Clamps a raw score into the valid [0, REPUTATION_SCORE_MAX] range. */
export function clampReputationScore(value: number | null | undefined): number {
	if (value == null || !Number.isFinite(value)) return 0;
	return Math.min(REPUTATION_SCORE_MAX, Math.max(0, value));
}

/** Builds the four-metric radar chart dataset from a reputation payload. */
export function buildReputationRadarData(
	reputation: KeyReputation | undefined
): ReputationRadarPoint[] {
	if (!reputation) return [];

	const metrics: Array<[string, number]> = [
		['Trade Volume', reputation.tradeVolumeScore],
		['Holder Retention', reputation.holderRetentionScore],
		['Price Stability', reputation.priceStabilityScore],
		['Rating', reputation.ratingScore],
	];

	return metrics.map(([metric, rawValue]) => {
		const value = clampReputationScore(rawValue);
		return {
			metric,
			value,
			normalized: Math.round((value / REPUTATION_SCORE_MAX) * 100),
		};
	});
}

/** Qualitative tier label for a composite score, used for badge styling. */
export type ReputationTier = 'excellent' | 'good' | 'fair' | 'poor';

export function reputationTier(score: number): ReputationTier {
	const clamped = clampReputationScore(score);
	if (clamped >= 800) return 'excellent';
	if (clamped >= 600) return 'good';
	if (clamped >= 400) return 'fair';
	return 'poor';
}

export function formatReputationScore(score: number | null | undefined): string {
	if (score == null || !Number.isFinite(score)) return '—';
	return `${Math.round(clampReputationScore(score))}`;
}
