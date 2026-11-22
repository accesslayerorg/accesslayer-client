/**
 * Creator onboarding checklist definitions and pure helpers (#1248).
 *
 * The checklist guides a creator through the five setup steps for a newly
 * created key. Everything here is data-source agnostic: completion is
 * derived elsewhere (see `useCreatorOnboardingChecklist`) and fed in as a
 * plain `{ stepId: boolean }` map.
 */

export type OnboardingStepId =
	| 'price-floor'
	| 'whitelist'
	| 'announcement'
	| 'staking-pool'
	| 'distribution';

export interface OnboardingStepDefinition {
	id: OnboardingStepId;
	label: string;
	description: string;
	/** CTA copy shown while the step is still pending. */
	ctaLabel: string;
	/** Dashboard tab that hosts the panel for this step. */
	tab: 'overview' | 'revenue' | 'settings';
	/** DOM id of the panel section the CTA scrolls to within that tab. */
	anchor: string;
}

/** Display order of the checklist. */
export const ONBOARDING_STEPS: readonly OnboardingStepDefinition[] = [
	{
		id: 'price-floor',
		label: 'Set price floor',
		description: 'Protect your key from selling below a minimum price.',
		ctaLabel: 'Set price floor',
		tab: 'settings',
		anchor: 'graduated-curve-section',
	},
	{
		id: 'whitelist',
		label: 'Configure whitelist',
		description: 'Approve the wallets that get early access to your key.',
		ctaLabel: 'Configure whitelist',
		tab: 'settings',
		anchor: 'whitelist-section',
	},
	{
		id: 'announcement',
		label: 'Post first announcement',
		description: 'Say hello to your key holders.',
		ctaLabel: 'Post announcement',
		tab: 'overview',
		anchor: 'dashboard-announcements-section',
	},
	{
		id: 'staking-pool',
		label: 'Fund staking pool',
		description: 'Seed the reward pool so stakers can start earning.',
		ctaLabel: 'Fund pool',
		tab: 'settings',
		anchor: 'staking-pool-section',
	},
	{
		id: 'distribution',
		label: 'Make first distribution',
		description: 'Share revenue with your key holders pro-rata.',
		ctaLabel: 'Distribute revenue',
		tab: 'revenue',
		anchor: 'distribute-revenue-section',
	},
] as const;

export type OnboardingCompletion = Record<OnboardingStepId, boolean>;

export interface OnboardingProgress {
	completedCount: number;
	totalCount: number;
	/** Whole-number completion percentage, 0-100. */
	percent: number;
	isComplete: boolean;
}

/** Counts completed steps and derives the progress-bar percentage. */
export function getOnboardingProgress(
	completion: OnboardingCompletion
): OnboardingProgress {
	const totalCount = ONBOARDING_STEPS.length;
	const completedCount = ONBOARDING_STEPS.filter(
		step => completion[step.id]
	).length;

	return {
		completedCount,
		totalCount,
		percent: Math.round((completedCount / totalCount) * 100),
		isComplete: completedCount === totalCount,
	};
}

/**
 * Dashboard URL for a step's panel: the right tab plus a hash anchor the
 * dashboard scrolls to once that tab has rendered.
 */
export function getOnboardingStepPath(
	step: Pick<OnboardingStepDefinition, 'tab' | 'anchor'>,
	keyId: string
): string {
	return `/creator/${keyId}/dashboard?tab=${step.tab}#${step.anchor}`;
}
