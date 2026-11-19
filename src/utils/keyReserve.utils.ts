/** Reserve backing a creator key, as returned by GET /keys/:key_id/reserve (#1208). */
export interface KeyReserve {
	/** Protocol reserve accrued for the key, in stroops. */
	reserveStroops: number;
	/** Current market cap of the key, in stroops. Null when unknown. */
	marketCapStroops: number | null;
}

/** Reserves below this share of market cap are flagged as low (#1208). */
export const LOW_RESERVE_RATIO = 0.1;

export const RESERVE_TOOLTIP_TEXT =
	'The protocol reserve is a liquidity backstop funded by trading fees. It backs sells on the bonding curve and helps keep the key price stable.';

export interface KeyReserveStatus {
	/** False for keys that have not accrued any reserve yet. */
	visible: boolean;
	/** True when the reserve is below LOW_RESERVE_RATIO of market cap. */
	isLow: boolean;
	/** Reserve as a share of market cap, or null when market cap is unknown. */
	ratio: number | null;
}

/** Decides whether to show the reserve chip and whether to warn (#1208). */
export function getKeyReserveStatus(
	reserve: KeyReserve | null | undefined
): KeyReserveStatus {
	const reserveStroops = reserve?.reserveStroops;
	if (
		reserveStroops == null ||
		!Number.isFinite(reserveStroops) ||
		reserveStroops <= 0
	) {
		return { visible: false, isLow: false, ratio: null };
	}

	const marketCap = reserve?.marketCapStroops;
	if (marketCap == null || !Number.isFinite(marketCap) || marketCap <= 0) {
		return { visible: true, isLow: false, ratio: null };
	}

	const ratio = reserveStroops / marketCap;
	return { visible: true, isLow: ratio < LOW_RESERVE_RATIO, ratio };
}
