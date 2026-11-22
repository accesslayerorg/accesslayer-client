import {
	useKeyPriceFloor,
	resolvePriceFloorStroops,
} from '@/hooks/useKeyPriceFloor';
import { useCreatorAnnouncements } from '@/hooks/useCreatorAnnouncements';
import { useStakingRewardPool } from '@/hooks/useStakingRewardPool';
import { useRevenueDistributionHistory } from '@/hooks/useCreatorRevenue';
import {
	ONBOARDING_STEPS,
	getOnboardingProgress,
	type OnboardingCompletion,
	type OnboardingProgress,
	type OnboardingStepDefinition,
} from '@/utils/creatorOnboarding.utils';

export interface OnboardingChecklistStep extends OnboardingStepDefinition {
	completed: boolean;
}

export interface CreatorOnboardingChecklist extends OnboardingProgress {
	steps: OnboardingChecklistStep[];
	/** True until every status query has settled for the first time. */
	isLoading: boolean;
}

export interface UseCreatorOnboardingChecklistOptions {
	keyId: string;
	/**
	 * Only the key's creator manages these panels, so every status query stays
	 * disabled for any other viewer.
	 */
	enabled: boolean;
	/** Whitelist entries, owned by the page's `useCreatorWhitelist` call. */
	whitelistEntryCount: number;
	isWhitelistLoading: boolean;
}

/**
 * Derives the completion state of the five creator onboarding steps (#1248).
 *
 * No data is fetched here that the dashboard panels don't already fetch. Each
 * status reads the same React Query entry the corresponding panel writes to,
 * so completing a step in a panel (which updates or invalidates that entry)
 * flips the checklist immediately, without a page reload.
 *
 * A query that errors is treated as "not completed": completion can't be
 * confirmed, so the step stays pending rather than claiming success.
 */
export function useCreatorOnboardingChecklist({
	keyId,
	enabled,
	whitelistEntryCount,
	isWhitelistLoading,
}: UseCreatorOnboardingChecklistOptions): CreatorOnboardingChecklist {
	const scopedKeyId = enabled ? keyId : undefined;

	const priceFloor = useKeyPriceFloor(scopedKeyId ?? '');
	const { announcements, isLoading: isAnnouncementsLoading } =
		useCreatorAnnouncements(scopedKeyId);
	const stakingPool = useStakingRewardPool(scopedKeyId);
	const distributions = useRevenueDistributionHistory(scopedKeyId);

	const completion: OnboardingCompletion = {
		'price-floor': resolvePriceFloorStroops(priceFloor.data) !== null,
		whitelist: whitelistEntryCount > 0,
		announcement: announcements.length > 0,
		'staking-pool': (stakingPool.data?.poolBalanceXlm ?? 0) > 0,
		distribution: (distributions.data?.length ?? 0) > 0,
	};

	const steps = ONBOARDING_STEPS.map(step => ({
		...step,
		completed: completion[step.id],
	}));

	return {
		steps,
		...getOnboardingProgress(completion),
		isLoading:
			priceFloor.isLoading ||
			isAnnouncementsLoading ||
			stakingPool.isLoading ||
			distributions.isLoading ||
			isWhitelistLoading,
	};
}
