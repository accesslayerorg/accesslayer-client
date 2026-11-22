import type { SplitExecutedEvent } from '@/types/keySplit';

/** Duration for which split notifications and portfolio badges remain active (#1151). */
export const SPLIT_ACTIVE_DURATION_MS = 48 * 60 * 60 * 1000; // 48 hours

const DISMISSAL_STORAGE_PREFIX = 'accesslayer.split_dismissed.';

/**
 * Safely parses an ISO date string or epoch timestamp into milliseconds.
 */
export function parseTimestampMs(
	timestamp: string | number | undefined | null
): number {
	if (timestamp == null || timestamp === '') return NaN;

	if (typeof timestamp === 'number') {
		// Unix seconds fallback (< year 2001 in ms)
		return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
	}

	const parsed = Date.parse(timestamp);
	if (!Number.isNaN(parsed)) return parsed;

	const numeric = Number(timestamp);
	if (!Number.isNaN(numeric)) {
		return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
	}

	return NaN;
}

/**
 * Determines whether a key split event is active (occurred within the last 48 hours).
 */
export function isSplitActive(
	split: { executedAt?: string | number } | null | undefined,
	now: number = Date.now()
): boolean {
	if (!split?.executedAt) return false;

	const executedAtMs = parseTimestampMs(split.executedAt);
	if (Number.isNaN(executedAtMs)) return false;

	// Split occurred in future or within the 48h active window
	const elapsed = now - executedAtMs;
	return elapsed >= 0 && elapsed <= SPLIT_ACTIVE_DURATION_MS;
}

/**
 * Calculates remaining active time for a split event in milliseconds.
 */
export function getSplitRemainingMs(
	split: { executedAt?: string | number } | null | undefined,
	now: number = Date.now()
): number {
	if (!split?.executedAt) return 0;
	const executedAtMs = parseTimestampMs(split.executedAt);
	if (Number.isNaN(executedAtMs)) return 0;

	return Math.max(0, executedAtMs + SPLIT_ACTIVE_DURATION_MS - now);
}

/**
 * Formats a numeric split ratio into display strings (e.g. "2:1" or "2x").
 */
export function formatSplitRatio(ratio: number): string {
	if (!ratio || ratio <= 0) return '1:1';
	return `${ratio}:1`;
}

/**
 * Resolves the pre-split and post-split balances for a holder.
 */
export function resolveSplitBalances(
	split: SplitExecutedEvent,
	currentHoldingQuantity?: number,
	isCurrentQuantityPostSplit: boolean = true
): { preSplitBalance: number; postSplitBalance: number } {
	const ratio = split.ratio > 0 ? split.ratio : 1;

	// Explicit balances provided by event or payload
	if (split.preSplitBalance != null && split.postSplitBalance != null) {
		return {
			preSplitBalance: split.preSplitBalance,
			postSplitBalance: split.postSplitBalance,
		};
	}

	if (split.preSplitBalance != null) {
		return {
			preSplitBalance: split.preSplitBalance,
			postSplitBalance: Math.round(split.preSplitBalance * ratio),
		};
	}

	if (split.postSplitBalance != null) {
		return {
			preSplitBalance: Math.floor(split.postSplitBalance / ratio),
			postSplitBalance: split.postSplitBalance,
		};
	}

	// Calculate from holder's active wallet balance
	if (currentHoldingQuantity != null && currentHoldingQuantity > 0) {
		if (isCurrentQuantityPostSplit) {
			return {
				preSplitBalance: Math.floor(currentHoldingQuantity / ratio),
				postSplitBalance: currentHoldingQuantity,
			};
		}
		return {
			preSplitBalance: currentHoldingQuantity,
			postSplitBalance: Math.round(currentHoldingQuantity * ratio),
		};
	}

	return {
		preSplitBalance: 0,
		postSplitBalance: 0,
	};
}

/**
 * Storage key for session dismissal of the split banner.
 */
export function getSplitDismissalKey(
	keyId: string,
	executedAt?: string | number
): string {
	const timestampSuffix = executedAt ? `.${parseTimestampMs(executedAt)}` : '';
	return `${DISMISSAL_STORAGE_PREFIX}${keyId}${timestampSuffix}`;
}

/**
 * Checks whether the split banner for this key has been dismissed for the current session.
 */
export function isSplitDismissedForSession(
	keyId: string,
	executedAt?: string | number
): boolean {
	if (typeof window === 'undefined' || !window.sessionStorage) return false;

	try {
		const specificKey = getSplitDismissalKey(keyId, executedAt);
		if (window.sessionStorage.getItem(specificKey) === 'true') return true;

		// Fallback check by keyId alone
		const generalKey = `${DISMISSAL_STORAGE_PREFIX}${keyId}`;
		return window.sessionStorage.getItem(generalKey) === 'true';
	} catch {
		return false;
	}
}

/**
 * Dismisses the split banner for this key for the remainder of the session.
 */
export function dismissSplitForSession(
	keyId: string,
	executedAt?: string | number
): void {
	if (typeof window === 'undefined' || !window.sessionStorage) return;

	try {
		const specificKey = getSplitDismissalKey(keyId, executedAt);
		window.sessionStorage.setItem(specificKey, 'true');
		window.sessionStorage.setItem(`${DISMISSAL_STORAGE_PREFIX}${keyId}`, 'true');
	} catch {
		// Ignore session storage errors (e.g. private browsing quota)
	}
}

/**
 * Clears session dismissal for testing or session reset.
 */
export function clearSplitDismissal(keyId?: string): void {
	if (typeof window === 'undefined' || !window.sessionStorage) return;

	try {
		const targetPrefix = keyId ? `${DISMISSAL_STORAGE_PREFIX}${keyId}` : DISMISSAL_STORAGE_PREFIX;
		const keysToRemove: string[] = [];
		for (let i = 0; i < window.sessionStorage.length; i++) {
			const key = window.sessionStorage.key(i);
			if (key?.startsWith(targetPrefix)) {
				keysToRemove.push(key);
			}
		}
		keysToRemove.forEach(k => window.sessionStorage.removeItem(k));
	} catch {
		// Ignore session storage errors
	}
}
