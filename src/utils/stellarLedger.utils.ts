/**
 * Converts a Stellar ledger sequence number to an estimated UTC timestamp.
 * Uses Stellar's ~5 second ledger time for estimation.
 *
 * @param ledger - The ledger sequence number to convert
 * @param referenceLedger - A known ledger sequence number with a known timestamp
 * @param referenceTimestamp - The timestamp (in ms) corresponding to the reference ledger
 * @returns Estimated Date for the target ledger
 */
export function ledgerToTimestamp(
	ledger: number,
	referenceLedger: number,
	referenceTimestamp: number
): Date {
	const LEDGER_TIME_MS = 5000; // 5 seconds per ledger in milliseconds
	const ledgerDelta = ledger - referenceLedger;
	const timeDelta = ledgerDelta * LEDGER_TIME_MS;
	const estimatedTimestamp = referenceTimestamp + timeDelta;
	return new Date(estimatedTimestamp);
}
