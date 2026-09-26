/**
 * Buy cooldown utilities (#873).
 *
 * Computes the remaining time until the authenticated user can next buy a
 * given key, based on a per-user `nextBuyAllowedAt` timestamp.
 *
 * No buy-cooldown concept exists yet in the contract layer or backend API
 * for this repo (see `docs/wip/buy-cooldown-simulation-slippage-deprecation.md`
 * and the search performed for this issue) — there is no ABI/contract read
 * method and no existing `lastBuyAt`/cooldown field on user-key state. The
 * closest analog, `last_buy_timestamp` on `HeldKeyPosition`, drives a
 * *sell*-side lockup (`lockupCountdown.utils.ts` / `LockupCountdown`), which
 * is the opposite direction of what #873 asks for (rate-limiting *buys*).
 *
 * Rather than fabricate a client-only timer with no backing data, this
 * introduces the natural wiring point on the client: an explicit, optional
 * `nextBuyAllowedAt` timestamp on `HeldKeyPosition` (falling back to the
 * same field on `Course` for a creator-wide cooldown when no per-user value
 * is present). When the backend/contract starts returning this value, the
 * countdown activates automatically; until then it renders nothing (no
 * cooldown data => no countdown), exactly like `LockupCountdown` does when
 * `lastBuyTimestamp` is absent.
 */

export function computeRemainingCooldownSeconds(
	nextBuyAllowedAt?: number | string | null
): number {
	if (!nextBuyAllowedAt) return 0;

	let targetSec = 0;
	if (typeof nextBuyAllowedAt === 'number') {
		targetSec =
			nextBuyAllowedAt > 1e11
				? Math.floor(nextBuyAllowedAt / 1000)
				: nextBuyAllowedAt;
	} else if (typeof nextBuyAllowedAt === 'string') {
		const parsed = new Date(nextBuyAllowedAt).getTime();
		if (isNaN(parsed)) return 0;
		targetSec = Math.floor(parsed / 1000);
	}

	const nowSec = Math.floor(Date.now() / 1000);
	const remaining = targetSec - nowSec;

	return remaining > 0 ? remaining : 0;
}

/**
 * Formats a remaining-seconds duration as a compact human string, e.g.
 * "4m 32s", "1h 02m", or "12s". Unlike `formatCountdownTime` (used for the
 * sell lockup's fixed `HH:MM:SS` display), this omits leading zero units so
 * short cooldowns read naturally ("Next buy available in 4m 32s" rather
 * than "00:04:32").
 */
export function formatCooldownDuration(totalSeconds: number): string {
	if (totalSeconds <= 0) return '0s';

	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		return `${hours}h ${String(minutes).padStart(2, '0')}m`;
	}
	if (minutes > 0) {
		return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
	}
	return `${seconds}s`;
}
