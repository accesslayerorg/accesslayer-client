import type {
	KeyMilestoneRewards,
	MilestoneReward,
} from '@/services/milestoneRewards.service';

/** Visual/interaction state of a single milestone card (#1141). */
export type MilestoneState = 'claimed' | 'claimable' | 'locked';

/**
 * Derives a milestone's display state from its claimed flag and the key's
 * current holding duration: claimed once the user has already claimed it,
 * claimable once the threshold has been reached but not yet claimed, and
 * locked otherwise.
 */
export function resolveMilestoneState(
	milestone: MilestoneReward,
	daysHeld: number
): MilestoneState {
	if (milestone.claimed) return 'claimed';
	if (daysHeld >= milestone.thresholdDays) return 'claimable';
	return 'locked';
}

/**
 * Progress toward a milestone's threshold, 0–100. Claimed/overdue milestones
 * report 100.
 */
export function milestoneProgressPercent(
	milestone: MilestoneReward,
	daysHeld: number
): number {
	if (milestone.claimed || daysHeld >= milestone.thresholdDays) return 100;
	if (milestone.thresholdDays <= 0) return 100;
	return Math.max(
		0,
		Math.min(100, Math.round((daysHeld / milestone.thresholdDays) * 100))
	);
}

/** The next unclaimed milestone (claimable or locked), or null if none. */
export function nextUnclaimedMilestone(
	key: KeyMilestoneRewards
): MilestoneReward | null {
	const unclaimed = key.milestones
		.filter(m => !m.claimed)
		.sort((a, b) => a.thresholdDays - b.thresholdDays);
	return unclaimed[0] ?? null;
}

/** Whether any held key has at least one milestone defined. */
export function hasAnyMilestones(keys: KeyMilestoneRewards[]): boolean {
	return keys.some(key => key.milestones.length > 0);
}

/** Total count of milestones currently claimable across all held keys. */
export function countClaimableMilestones(
	keys: KeyMilestoneRewards[]
): number {
	return keys.reduce(
		(total, key) =>
			total +
			key.milestones.filter(
				m => resolveMilestoneState(m, key.daysHeld) === 'claimable'
			).length,
		0
	);
}

export function formatDaysHeld(days: number): string {
	return `${Math.max(0, Math.floor(days))}d held`;
}
