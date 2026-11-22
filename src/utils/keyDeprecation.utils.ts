/**
 * Key deprecation utilities for the portfolio page (#871).
 *
 * A creator key can be marked `deprecated` (e.g. the creator left the
 * platform, or the key was superseded) — held positions in a deprecated key
 * can no longer be bought or sold on the open market, but holders can redeem
 * their position for its current value.
 */

import { resolveCreatorKeyPriceStroops } from '@/utils/keyPriceDisplay.utils';
import type { CreatorKeyPriceFields } from '@/utils/keyPriceDisplay.utils';

export interface DeprecationFields {
	/** Whether this key has been marked deprecated by the platform/creator. */
	deprecated?: boolean;
	/** Optional human-readable reason surfaced in the deprecation notice. */
	deprecationReason?: string | null;
}

/** Whether a key (creator record or held position) is deprecated. */
export function isKeyDeprecated(key: DeprecationFields | null | undefined): boolean {
	return key?.deprecated === true;
}

export interface RedeemEstimate {
	/** Quantity of keys being redeemed. */
	quantity: number;
	/** Per-key price in stroops at time of redemption. */
	keyPriceStroops: number;
	/** Total redemption value in stroops (quantity * keyPriceStroops). */
	totalValueStroops: number;
}

/**
 * Estimates the redemption value for a deprecated key position: quantity
 * held multiplied by the last-known per-key price. Returns `null` when the
 * estimate cannot be computed (no quantity or no usable price).
 */
export function estimateRedeemValue(
	quantity: number | null | undefined,
	priceFields: CreatorKeyPriceFields
): RedeemEstimate | null {
	if (quantity == null || !Number.isFinite(quantity) || quantity <= 0) {
		return null;
	}

	const keyPriceStroops = resolveCreatorKeyPriceStroops(priceFields);
	if (keyPriceStroops == null || keyPriceStroops < 0) {
		return null;
	}

	return {
		quantity,
		keyPriceStroops,
		totalValueStroops: keyPriceStroops * quantity,
	};
}
