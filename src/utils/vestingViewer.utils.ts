import type { VestingPhase } from '@/utils/vestingSchedule.utils';

/**
 * Next-unlock helpers for the creator-dashboard vesting viewer (#1117).
 *
 * A wallet can hold several vesting schedules at once; the viewer surfaces
 * the single most relevant upcoming event — the next cliff, or the next full
 * unlock once every cliff has passed — so the creator always knows what
 * unlocks next and when.
 */

/** Minimal schedule shape needed to locate the next milestone. */
export interface VestingMilestoneInput {
	/** Creator key the schedule belongs to. */
	keyId: string;
	/** Display name of the key, when known. */
	keyName?: string | null;
	/** Resolved lifecycle phase (from `resolveVestingSchedule`). */
	phase?: VestingPhase;
	/** ISO timestamp (or epoch ms) after which tokens unlock. */
	cliffAt?: string | number | null;
	/** ISO timestamp (or epoch ms) at which the allocation fully vests. */
	endAt?: string | number | null;
}

export type VestingMilestoneKind = 'cliff' | 'full_vest';

export interface VestingMilestone {
	/** Key whose milestone is the next to occur. */
	keyId: string;
	/** Display name of that key, when known. */
	keyName: string | null;
	/** Which event the milestone is. */
	kind: VestingMilestoneKind;
	/** ISO timestamp of the milestone. */
	at: string;
	/** Whole seconds from `now` until the milestone (never negative). */
	secondsLeft: number;
}

function toTimestampMs(
	value: string | number | null | undefined
): number | null {
	if (value == null) return null;
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null;
	}
	const parsed = new Date(value).getTime();
	return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Finds the soonest upcoming cliff or full-vest event across schedules.
 *
 * - Schedules still pre-cliff contribute their cliff.
 * - Schedules past the cliff contribute their full-vest date.
 * - Fully vested (or malformed) schedules contribute nothing.
 *
 * Returns `null` when nothing is upcoming.
 */
export function getNextVestingMilestone(
	schedules: VestingMilestoneInput[],
	now: number = Date.now()
): VestingMilestone | null {
	let next: VestingMilestone | null = null;

	for (const schedule of schedules) {
		const cliffMs = toTimestampMs(schedule.cliffAt);
		const endMs = toTimestampMs(schedule.endAt);

		let candidate: { kind: VestingMilestoneKind; atMs: number } | null =
			null;
		if (cliffMs != null && now < cliffMs) {
			candidate = { kind: 'cliff', atMs: cliffMs };
		} else if (endMs != null && now < endMs) {
			candidate = { kind: 'full_vest', atMs: endMs };
		}

		if (!candidate) continue;

		const secondsLeft = Math.max(
			0,
			Math.floor((candidate.atMs - now) / 1000)
		);
		if (!next || secondsLeft < next.secondsLeft) {
			next = {
				keyId: schedule.keyId,
				keyName: schedule.keyName ?? null,
				kind: candidate.kind,
				at: new Date(candidate.atMs).toISOString(),
				secondsLeft,
			};
		}
	}

	return next;
}

/** Human-readable label for a milestone, e.g. "Cliff for Alpha Key". */
export function describeVestingMilestone(milestone: VestingMilestone): string {
	const name = milestone.keyName || `Key ${milestone.keyId}`;
	return milestone.kind === 'cliff' ? `Cliff for ${name}` : `Full vest for ${name}`;
}
