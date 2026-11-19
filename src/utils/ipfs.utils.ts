/**
 * IPFS URL resolution utilities for creator metadata images (#1033).
 */

export function resolveIpfsUrl(uriOrCid: string | null | undefined): string | null {
	if (!uriOrCid) return null;
	const trimmed = uriOrCid.trim();
	if (!trimmed) return null;

	if (
		trimmed.startsWith('http://') ||
		trimmed.startsWith('https://') ||
		trimmed.startsWith('data:')
	) {
		return trimmed;
	}
	if (trimmed.startsWith('ipfs://')) {
		const hash = trimmed.replace('ipfs://', '').replace(/^ipfs\//, '');
		return `https://ipfs.io/ipfs/${hash}`;
	}
	// If it matches a raw IPFS CID format (Qm... or bafy...) or is non-empty string without spaces
	if (
		/^(Qm[1-9A-Za-z]{44}|bafy[1-9A-Za-z]{55,})$/.test(trimmed) ||
		(!/\s/.test(trimmed) && trimmed.length > 10)
	) {
		return `https://ipfs.io/ipfs/${trimmed}`;
	}
	return trimmed;
}
