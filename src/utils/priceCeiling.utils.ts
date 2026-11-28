export const PRICE_CEILING_WARNING_THRESHOLD_PERCENT = 5;

export interface PriceCeilingProximity {
	ceilingStroops?: number | null;
	endPriceStroops?: number | null;
	thresholdPercent?: number;
}

export function hasPriceCeiling(
	ceilingStroops?: number | null
): ceilingStroops is number {
	return ceilingStroops != null && Number.isFinite(ceilingStroops) && ceilingStroops > 0;
}

export function isOrderNearPriceCeiling({
	ceilingStroops,
	endPriceStroops,
	thresholdPercent = PRICE_CEILING_WARNING_THRESHOLD_PERCENT,
}: PriceCeilingProximity): boolean {
	if (!hasPriceCeiling(ceilingStroops)) return false;
	if (endPriceStroops == null || !Number.isFinite(endPriceStroops)) return false;

	const warningFloor =
		ceilingStroops * (1 - Math.max(0, thresholdPercent) / 100);
	return endPriceStroops >= warningFloor;
}
