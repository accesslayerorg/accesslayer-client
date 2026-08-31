/** Stellar G-address validation: starts with 'G' followed by 55 base32 characters */
export function isValidStellarAddress(address: string): boolean {
	return /^G[A-Z2-7]{55}$/.test(address.trim());
}

/** Basis points validation: integer between 1 and 10000 (0.01% to 100%) */
export function isValidBps(bps: number): boolean {
	return Number.isInteger(bps) && bps >= 1 && bps <= 10000;
}
