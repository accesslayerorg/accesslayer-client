import { describe, it, expect } from 'vitest';
import { ledgerToTimestamp } from '../stellarLedger.utils';

describe('ledgerToTimestamp - Integration Test with Known Values', () => {
	// A known reference point: ledger 50000000 and some arbitrary timestamp.
	const KNOWN_REFERENCE_LEDGER = 50000000;
	// e.g. 2024-01-01T00:00:00.000Z
	const KNOWN_REFERENCE_TIMESTAMP = new Date('2024-01-01T00:00:00.000Z').getTime();

	it('returns exactly the reference timestamp when ledger equals reference', () => {
		const result = ledgerToTimestamp(
			KNOWN_REFERENCE_LEDGER,
			KNOWN_REFERENCE_LEDGER,
			KNOWN_REFERENCE_TIMESTAMP
		);
		expect(result.getTime()).toBe(KNOWN_REFERENCE_TIMESTAMP);
	});

	it('returns correctly estimated future date (100 ledgers ahead)', () => {
		const futureLedger = KNOWN_REFERENCE_LEDGER + 100;
		const result = ledgerToTimestamp(
			futureLedger,
			KNOWN_REFERENCE_LEDGER,
			KNOWN_REFERENCE_TIMESTAMP
		);
		const expectedTimestamp = KNOWN_REFERENCE_TIMESTAMP + 100 * 5000;
		expect(result.getTime()).toBe(expectedTimestamp);
	});

	it('returns correctly estimated past date (100 ledgers behind)', () => {
		const pastLedger = KNOWN_REFERENCE_LEDGER - 100;
		const result = ledgerToTimestamp(
			pastLedger,
			KNOWN_REFERENCE_LEDGER,
			KNOWN_REFERENCE_TIMESTAMP
		);
		const expectedTimestamp = KNOWN_REFERENCE_TIMESTAMP - 100 * 5000;
		expect(result.getTime()).toBe(expectedTimestamp);
	});
});
