/**
 * Trade cooldown utilities (#998).
 *
 * Shared types and helpers that describe an *active* cooldown on a creator
 * key — the per-user window after a buy/sell during which further trades of
 * that key are blocked. This builds on the buy-cooldown groundwork from
 * #873/#889: the cooldown is configured per key (in ledgers via
 * `set_buy_cooldown`), and the backend resolves it into an absolute
 * `nextBuyAllowedAt` timestamp. When a cooldown is active, trade buttons
 * show a live countdown and stay disabled until it expires.
 */

/**
 * An active trade cooldown for one creator key.
 */
export interface TradeCooldownStatus {
	/** Creator key the cooldown applies to. */
	creatorId: string;
	/**
	 * Absolute timestamp (seconds epoch, ms epoch, or ISO string) after which
	 * trading is allowed again. `null` means no cooldown data is available.
	 */
	nextBuyAllowedAt?: number | string | null;
	/**
	 * The cooldown policy in seconds (how long after a trade the next one is
	 * blocked), as configured by the creator. `null` when unknown.
	 */
	cooldownDurationSeconds?: number | null;
}

/** A snapshot of a cooldown that is currently in force. */
export interface ActiveTradeCooldown {
	/** Creator key the cooldown applies to. */
	creatorId: string;
	/** Absolute timestamp after which trading is allowed again. */
	nextBuyAllowedAt: NonNullable<TradeCooldownStatus['nextBuyAllowedAt']>;
	/** Cooldown policy length in seconds, when known. */
	cooldownDurationSeconds: number | null;
}

/**
 * Whether a cooldown status represents a cooldown that is in force *right
 * now*. A status only counts when it carries a real `nextBuyAllowedAt`
 * timestamp that is still in the future — this never fabricates a timer.
 */
export function isActiveCooldown(
	status: TradeCooldownStatus | null | undefined,
	nowSec: number = Math.floor(Date.now() / 1000)
): status is ActiveTradeCooldown {
	if (!status || status.nextBuyAllowedAt == null) return false;
	const targetSec = normalizeTimestampToSeconds(status.nextBuyAllowedAt);
	if (targetSec == null) return false;
	return targetSec > nowSec;
}

/**
 * Normalises a numeric (seconds or ms epoch) or ISO-string timestamp into
 * whole seconds since the epoch. Returns `null` for unparseable input.
 */
function normalizeTimestampToSeconds(
	timestamp: number | string
): number | null {
	if (typeof timestamp === 'number') {
		if (!Number.isFinite(timestamp)) return null;
		return timestamp > 1e11
			? Math.floor(timestamp / 1000)
			: Math.floor(timestamp);
	}

	const parsed = new Date(timestamp).getTime();
	if (Number.isNaN(parsed)) return null;
	return Math.floor(parsed / 1000);
}

/**
 * The remaining seconds of an active cooldown at the given moment, never
 * below zero. Uses the same timestamp normalisation as
 * `computeRemainingCooldownSeconds` from `buyCooldown.utils`.
 */
export function getCooldownRemainingSeconds(
	cooldown: Pick<ActiveTradeCooldown, 'nextBuyAllowedAt'>,
	nowSec: number = Math.floor(Date.now() / 1000)
): number {
	const targetSec = normalizeTimestampToSeconds(cooldown.nextBuyAllowedAt);
	if (targetSec == null) return 0;
	return Math.max(0, targetSec - nowSec);
}

/**
 * Builds the tooltip copy shown over a disabled trade button, explaining the
 * cooldown policy set by the key's creator. The duration is included when
 * known so traders understand exactly how long the window is, not just when
 * this particular cooldown ends.
 */
export function formatTradeCooldownTooltip(
	remainingSeconds: number,
	cooldownDurationSeconds?: number | null
): string {
	const policyDuration = normalizePositiveSeconds(cooldownDurationSeconds);
	const policyCopy = policyDuration
		? ` This key enforces a ${formatDurationWords(policyDuration)} cooldown between trades, set by the creator.`
		: ' This cooldown is set by the creator.';

	if (remainingSeconds <= 0) {
		return `Trading is temporarily locked.${policyCopy}`;
	}

	return `You can trade this key again in ${formatDurationWords(remainingSeconds)}.${policyCopy}`;
}

function normalizePositiveSeconds(
	value: number | null | undefined
): number | null {
	if (value == null || !Number.isFinite(value) || value <= 0) return null;
	return Math.floor(value);
}

/** Formats seconds as readable words, e.g. "4m 32s" or "1h 02m". */
function formatDurationWords(totalSeconds: number): string {
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
