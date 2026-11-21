export function parsePositivePrice(value: string): number | null {
	const normalized = value.trim();
	if (!normalized) return null;
	const parsed = Number(normalized);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function isValidPriceAlertPrice(value: string): boolean {
	return parsePositivePrice(value) !== null;
}
