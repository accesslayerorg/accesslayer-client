import { useEffect, useState } from 'react';

/**
 * Key freeze status resolution and lifecycle (#1121).
 *
 * An admin can freeze a key (`Course.isFrozen`) with a human-readable reason
 * and an optional expiry. While the freeze is active the key detail page
 * shows a freeze banner and every buy/sell control is disabled. The freeze
 * can lift in two ways:
 *
 * 1. The 30s creator-detail poll returns a course with `isFrozen: false`.
 * 2. The freeze expiry timestamp passes while the page is open — this hook
 *    schedules a timer for that moment and forces a re-render so the banner
 *    dismisses and controls re-enable without a reload.
 */

/** Minimal shape of the freeze fields carried by a course (#1121). */
export interface KeyFreezeSource {
	/** True while an admin freeze is active on this key. */
	isFrozen?: boolean;
	/** Human-readable reason for the freeze, surfaced in the banner. */
	freezeReason?: string | null;
	/** ISO timestamp when the freeze expires; null/absent means indefinite. */
	freezeExpiresAt?: string | null;
}

/** Resolved freeze status consumed by the banner and trading controls. */
export interface KeyFreezeStatus {
	/** Human-readable reason shown in the banner and tooltips. */
	reason: string;
	/** Raw ISO expiry timestamp, or null when the freeze is indefinite. */
	expiresAt: string | null;
	/** Parsed expiry in epoch ms, or null when the freeze is indefinite. */
	expiresAtMs: number | null;
}

/** Fallback copy when the API does not provide a freeze reason. */
export const DEFAULT_FREEZE_REASON = 'Trading for this key is frozen.';

/**
 * setTimeout delays are stored as a signed 32-bit int; clamp so far-future
 * expiries still schedule (the effect re-arms on each tick until it lands).
 */
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * Derive the active freeze for a creator, or null when the key is not
 * frozen or its expiry already passed.
 */
export function resolveKeyFreeze(
	creator: KeyFreezeSource | null | undefined,
	now: number = Date.now()
): KeyFreezeStatus | null {
	if (!creator?.isFrozen) return null;

	const expiresAt =
		typeof creator.freezeExpiresAt === 'string' &&
		creator.freezeExpiresAt.trim().length > 0
			? creator.freezeExpiresAt
			: null;

	// An unparsable expiry is treated as indefinite so the UI never unlocks
	// early on malformed data; the banner renders the raw value as-is.
	const parsedMs = expiresAt ? Date.parse(expiresAt) : NaN;
	const expiresAtMs = Number.isNaN(parsedMs) ? null : parsedMs;

	if (expiresAtMs !== null && expiresAtMs <= now) return null;

	return {
		reason: creator.freezeReason?.trim() || DEFAULT_FREEZE_REASON,
		expiresAt,
		expiresAtMs,
	};
}

/**
 * Returns the active {@link KeyFreezeStatus} for a key, or null when the key
 * is not frozen. When a freeze expiry passes while mounted, the hook
 * re-renders at that moment so the banner auto-dismisses and trading
 * controls re-enable without a page reload (#1121).
 */
export function useKeyFreeze(
	creator: KeyFreezeSource | null | undefined
): KeyFreezeStatus | null {
	const freeze = resolveKeyFreeze(creator);
	const [, setTick] = useState(0);
	const expiresAtMs = freeze?.expiresAtMs ?? null;

	useEffect(() => {
		if (expiresAtMs === null) return undefined;

		let timer: number | undefined;
		const schedule = () => {
			const remaining = expiresAtMs - Date.now();
			// Expired: force a re-render so the next render drops the freeze.
			if (remaining <= 0) {
				setTick(value => value + 1);
				return;
			}
			// setTimeout delays are 32-bit; re-arm until the real expiry lands.
			timer = window.setTimeout(
				schedule,
				Math.min(remaining, MAX_TIMEOUT_MS)
			);
		};

		schedule();
		return () => {
			if (timer !== undefined) window.clearTimeout(timer);
		};
	}, [expiresAtMs]);

	return freeze;
}
