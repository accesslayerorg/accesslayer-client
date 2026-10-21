/**
 * Exit-notice utilities (#1246).
 *
 * A held key position can enter one of two distinct exit-notice states:
 *  - "Deprecation" (`DeprecationFields.deprecated`): trading has ceased,
 *    but there is no guaranteed terminal buyback window — see
 *    `keyDeprecation.utils.ts`.
 *  - "Retirement" (`isRetiring`): a stronger, terminal state with a
 *    guaranteed creator buyback at a fixed price for a fixed notice window
 *    (`retirementBuybackPriceStroops` / `retirementNoticeExpiresAt`).
 *
 * A key is never shown as both at once — retirement takes priority, since
 * it is the stricter, time-bounded state a holder needs to act on before
 * the notice window closes.
 */

import { isKeyDeprecated, type DeprecationFields } from '@/utils/keyDeprecation.utils';

export type ExitNoticeActionType = 'deprecation' | 'retirement';

export interface ExitNoticeFields extends DeprecationFields {
	isRetiring?: boolean;
	retirementBuybackPriceStroops?: number | null;
	retirementNoticeExpiresAt?: string | null;
}

export interface ExitNotice {
	actionType: ExitNoticeActionType;
	/** Guaranteed buyback price in stroops; only ever populated for retirement. */
	buybackPriceStroops: number | null;
	/** ISO expiry of the notice window; null means no fixed deadline. */
	noticeExpiresAt: string | null;
}

/**
 * Resolves which exit-notice banner (if any) should be shown for a key,
 * and the data it needs. Returns `null` when the key is neither retiring
 * nor deprecated.
 */
export function resolveExitNotice(
	key: ExitNoticeFields | null | undefined
): ExitNotice | null {
	if (key?.isRetiring === true) {
		return {
			actionType: 'retirement',
			buybackPriceStroops: key.retirementBuybackPriceStroops ?? null,
			noticeExpiresAt: key.retirementNoticeExpiresAt ?? null,
		};
	}

	if (isKeyDeprecated(key)) {
		return {
			actionType: 'deprecation',
			buybackPriceStroops: null,
			noticeExpiresAt: null,
		};
	}

	return null;
}

/**
 * Whether a holder has fully exited a position (used to auto-dismiss the
 * exit-notice banner once nothing remains to act on — #1246).
 */
export function hasFullyExitedPosition(
	holdingsCount: number | null | undefined
): boolean {
	return !holdingsCount || holdingsCount <= 0;
}
