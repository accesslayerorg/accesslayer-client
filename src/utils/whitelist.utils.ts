/**
 * Whitelist validation and parsing utilities for early access creator keys (#1031).
 */

/**
 * Validates whether a given string is a valid Stellar public key (G-address).
 * Stellar public keys are 56 characters long, start with 'G', and are encoded
 * in RFC 4648 Base32 (A-Z, 2-7).
 */
export function isValidStellarAddress(address: string): boolean {
	if (!address) return false;
	const trimmed = address.trim();
	return /^G[A-Z2-7]{55}$/.test(trimmed);
}

export interface WhitelistParseResult {
	/** Valid, de-duplicated Stellar addresses in order of appearance. */
	valid: string[];
	/** Non-empty entries that failed Stellar address validation. */
	invalid: string[];
	/** Valid addresses that appeared more than once in the input. */
	duplicates: string[];
}

/**
 * Parses batch whitelist input from newline-separated text (#1031).
 *
 * Each line is trimmed and validated against the Stellar address format.
 * Duplicate valid addresses are filtered out while preserving the first occurrence.
 */
export function parseBatchWhitelist(input: string): WhitelistParseResult {
	if (!input) {
		return { valid: [], invalid: [], duplicates: [] };
	}

	const lines = input.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
	const seen = new Set<string>();
	const valid: string[] = [];
	const invalid: string[] = [];
	const duplicates: string[] = [];

	for (const line of lines) {
		if (!isValidStellarAddress(line)) {
			invalid.push(line);
			continue;
		}

		if (seen.has(line)) {
			duplicates.push(line);
			continue;
		}

		seen.add(line);
		valid.push(line);
	}

	return { valid, invalid, duplicates };
}

/**
 * Formats an ISO date string into a user-friendly date format for the whitelist table.
 */
export function formatWhitelistDate(isoString: string): string {
	if (!isoString) return '—';
	try {
		const date = new Date(isoString);
		if (isNaN(date.getTime())) return isoString;
		return date.toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	} catch {
		return isoString;
	}
}

/**
 * Truncates a Stellar wallet address for display while preserving start and end characters.
 */
export function truncateAddress(address: string, start = 6, end = 6): string {
	if (!address || address.length <= start + end) return address;
	return `${address.slice(0, start)}…${address.slice(-end)}`;
}
