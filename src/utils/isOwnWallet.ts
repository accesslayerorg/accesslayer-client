/**
 * Returns true when the connected wallet address matches the creator's
 * address.  Both arguments are compared case-insensitively so that
 * mixed-case Stellar / EVM addresses are handled correctly.
 *
 * Returns false when either address is missing — callers should never
 * see an "own wallet" state unless both sides are present.
 */
export function isOwnWallet(
	connectedAddress: string | null | undefined,
	creatorAddress: string | null | undefined
): boolean {
	if (!connectedAddress || !creatorAddress) return false;
	return connectedAddress.toLowerCase() === creatorAddress.toLowerCase();
}
