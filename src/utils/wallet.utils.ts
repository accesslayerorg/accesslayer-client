/**
 * Truncates a wallet address for display.
 * e.g. "GBZXN7PIRZGNMHGA728RGRFZAPPWN9G83281XALXZK1234567890ABCD" → "GBZXN7...ABCD"
 */
export function truncateWallet(address: string): string {
	if (!address) return '';
	if (address.length <= 12) return address;
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
