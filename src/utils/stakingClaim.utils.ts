/**
 * `unlockLedger` is the unix timestamp (in seconds) at which a staked key's
 * lock period expires and it becomes claimable, mirroring the contract's
 * `unlock_ledger` field.
 */
export function computeRemainingClaimSeconds(
	unlockLedger: number,
	nowMs: number = Date.now()
): number {
	const remaining = Math.ceil((unlockLedger * 1000 - nowMs) / 1000);
	return remaining > 0 ? remaining : 0;
}
