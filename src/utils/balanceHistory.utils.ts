import type {
	BalanceCheckpoint,
	AsOfLookupResult,
	AsOfHoldingItem,
} from '@/types/balanceHistory.types';

export const STELLAR_LEDGER_CLOSE_TIME_MS = 5000;

// Standard reference anchor: Ledger 55,000,000 around early 2026
export const DEFAULT_REFERENCE_LEDGER = 55_000_000;
export const DEFAULT_REFERENCE_TIMESTAMP = new Date('2026-01-01T00:00:00Z').getTime();

/**
 * Converts a target Date or Unix ms timestamp to an estimated Stellar ledger number.
 */
export function timestampToEstimatedLedger(
	targetDate: Date | number,
	referenceLedger: number = DEFAULT_REFERENCE_LEDGER,
	referenceTimestamp: number = DEFAULT_REFERENCE_TIMESTAMP
): number {
	const targetMs = typeof targetDate === 'number' ? targetDate : targetDate.getTime();
	const deltaMs = targetMs - referenceTimestamp;
	const deltaLedgers = Math.floor(deltaMs / STELLAR_LEDGER_CLOSE_TIME_MS);
	return Math.max(1, referenceLedger + deltaLedgers);
}

/**
 * Converts an estimated Stellar ledger back to approximate timestamp in ms.
 */
export function estimatedLedgerToTimestamp(
	ledger: number,
	referenceLedger: number = DEFAULT_REFERENCE_LEDGER,
	referenceTimestamp: number = DEFAULT_REFERENCE_TIMESTAMP
): number {
	const deltaLedgers = ledger - referenceLedger;
	return referenceTimestamp + deltaLedgers * STELLAR_LEDGER_CLOSE_TIME_MS;
}

/**
 * Finds the balance of a single key as of a specific ledger checkpoint.
 *
 * Acceptance Criteria:
 * - Dates/ledgers before the first checkpoint show zero holdings.
 * - Ledgers between checkpoints match the earlier checkpoint balance.
 * - Ledgers after the last checkpoint match the latest checkpoint balance.
 */
export function findBalanceAsOfLedger(
	checkpoints: BalanceCheckpoint[],
	targetLedger: number
): { balance: number; checkpointLedger: number | null } {
	if (!checkpoints || checkpoints.length === 0) {
		return { balance: 0, checkpointLedger: null };
	}

	const sorted = [...checkpoints].sort((a, b) => a.ledger - b.ledger);

	// Dates before the first checkpoint show zero holdings
	if (targetLedger < sorted[0].ledger) {
		return { balance: 0, checkpointLedger: null };
	}

	let currentBalance = 0;
	let lastLedger: number | null = null;

	for (const cp of sorted) {
		if (cp.ledger <= targetLedger) {
			currentBalance = cp.balance;
			lastLedger = cp.ledger;
		} else {
			break;
		}
	}

	return { balance: currentBalance, checkpointLedger: lastLedger };
}

/**
 * Look up holdings across all keys as of an estimated ledger or past date.
 */
export function computeHoldingsAsOfDate(
	checkpoints: BalanceCheckpoint[],
	targetDate: Date | number,
	keyNames: Record<string, string | undefined> = {},
	referenceLedger: number = DEFAULT_REFERENCE_LEDGER,
	referenceTimestamp: number = DEFAULT_REFERENCE_TIMESTAMP
): AsOfLookupResult {
	const dateObj = typeof targetDate === 'number' ? new Date(targetDate) : targetDate;
	const targetTimestamp = dateObj.getTime();
	const estimatedLedger = timestampToEstimatedLedger(
		targetTimestamp,
		referenceLedger,
		referenceTimestamp
	);

	// Group checkpoints by keyId
	const byKey: Record<string, BalanceCheckpoint[]> = {};
	for (const cp of checkpoints) {
		if (!byKey[cp.keyId]) byKey[cp.keyId] = [];
		byKey[cp.keyId].push(cp);
	}

	const holdings: AsOfHoldingItem[] = [];
	let totalBalance = 0;

	for (const [keyId, list] of Object.entries(byKey)) {
		const { balance, checkpointLedger } = findBalanceAsOfLedger(list, estimatedLedger);
		holdings.push({
			keyId,
			keyName: keyNames[keyId] || list[0]?.keyName || keyId,
			balance,
			asOfCheckpointLedger: checkpointLedger,
		});
		totalBalance += balance;
	}

	const approxDateStr = dateObj.toISOString().split('T')[0];
	const approximationNote = `Holdings as of ledger #${estimatedLedger.toLocaleString()} (approx. ${approxDateStr}). Note: Stellar ledger sequences close approximately every 5 seconds; past ledger sequence is estimated relative to network reference checkpoints.`;

	return {
		targetDate: dateObj,
		targetTimestamp,
		estimatedLedger,
		referenceLedger,
		referenceTimestamp,
		approximationNote,
		holdings,
		totalBalance,
	};
}

/**
 * Builds CSV content from balance history checkpoints.
 */
export function exportBalanceHistoryToCsv(checkpoints: BalanceCheckpoint[]): string {
	const sorted = [...checkpoints].sort((a, b) => a.timestamp - b.timestamp);
	const headers = ['Timestamp', 'Date UTC', 'Ledger', 'Key ID', 'Key Name', 'Event', 'Change', 'Balance'];

	const rows = sorted.map(cp => {
		const dateStr = new Date(cp.timestamp).toISOString();
		return [
			cp.timestamp,
			`"${dateStr}"`,
			cp.ledger,
			`"${cp.keyId}"`,
			`"${cp.keyName || cp.keyId}"`,
			cp.eventType,
			cp.change > 0 ? `+${cp.change}` : String(cp.change),
			cp.balance,
		].join(',');
	});

	return [headers.join(','), ...rows].join('\n');
}
