import type {
	CurveMilestone,
	GraduatedCurveConfig,
} from '@/services/course.service';
import { buildCreatorKeyReferralLink } from '@/utils/referral.utils';
import { buildTwitterIntentUrl } from '@/utils/shareTwitter.utils';

/** sessionStorage prefix; one entry per key that already played its animation. */
export const GRADUATION_SESSION_PREFIX = 'accesslayer:graduation-celebrated:';

/** The last (highest-supply) milestone of the graduated curve, if configured. */
export function getFinalMilestone(
	config: GraduatedCurveConfig | null | undefined
): CurveMilestone | null {
	const milestones = (config?.milestones ?? []).filter(
		m => Number.isFinite(m?.supplyThreshold) && m.supplyThreshold > 0
	);
	if (milestones.length === 0) return null;
	return milestones.reduce((final, m) =>
		m.supplyThreshold > final.supplyThreshold ? m : final
	);
}

/**
 * A key has graduated when its supply has reached the final milestone of its
 * graduated curve (the GraduationReached condition, #1110).
 */
export function hasKeyGraduated(
	config: GraduatedCurveConfig | null | undefined,
	currentSupply: number | null | undefined
): boolean {
	const final = getFinalMilestone(config);
	if (!final) return false;
	if (currentSupply == null || !Number.isFinite(currentSupply)) return false;
	return currentSupply >= final.supplyThreshold;
}

export interface GraduationStats {
	/** Supply at which the key graduated (the final milestone threshold). */
	finalSupply: number;
	/** Simulated per-key price at the final milestone, in XLM. */
	graduationPriceXlm: number | null;
	/** Number of curve milestones the key passed. */
	milestonesReached: number;
	holderCount: number | null;
}

export function buildGraduationStats(
	config: GraduatedCurveConfig | null | undefined,
	holderCount?: number | null
): GraduationStats | null {
	const final = getFinalMilestone(config);
	if (!final) return null;
	const price = Number(final.simulatedPrice);
	return {
		finalSupply: final.supplyThreshold,
		graduationPriceXlm: Number.isFinite(price) && price > 0 ? price : null,
		milestonesReached: (config?.milestones ?? []).length,
		holderCount:
			holderCount != null && Number.isFinite(holderCount)
				? holderCount
				: null,
	};
}

export interface GraduationShareInput {
	keyName: string;
	stats: GraduationStats;
	/** The link people land on; use {@link buildGraduationReferralLink}. */
	link: string;
}

export function buildGraduationTweetText({
	keyName,
	stats,
	link,
}: GraduationShareInput): string {
	const parts = [`${keyName} just graduated on AccessLayer`];
	parts.push(`${stats.finalSupply.toLocaleString('en-US')} keys minted`);
	if (stats.holderCount != null) {
		parts.push(`${stats.holderCount.toLocaleString('en-US')} holders`);
	}
	return `🎓 ${parts.join(' — ')}. Check it out: ${link}`;
}

export function buildGraduationTweetUrl(input: GraduationShareInput): string {
	return buildTwitterIntentUrl(buildGraduationTweetText(input));
}

/** The key page URL, carrying the sharer's referral code when a wallet is known. */
export function buildGraduationReferralLink(
	keyId: string,
	wallet?: string | null
): string {
	return buildCreatorKeyReferralLink({ creatorId: keyId, wallet });
}

/** True once this key's animation has played in the current browser session. */
export function hasCelebratedThisSession(keyId: string): boolean {
	try {
		return (
			window.sessionStorage.getItem(
				`${GRADUATION_SESSION_PREFIX}${keyId}`
			) === '1'
		);
	} catch {
		return false;
	}
}

export function markCelebratedThisSession(keyId: string): void {
	try {
		window.sessionStorage.setItem(
			`${GRADUATION_SESSION_PREFIX}${keyId}`,
			'1'
		);
	} catch {
		// Storage unavailable: the animation may replay on remount, which is harmless.
	}
}
