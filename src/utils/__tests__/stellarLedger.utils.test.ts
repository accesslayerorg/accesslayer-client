import { describe, it, expect } from 'vitest';
import { ledgerToTimestamp } from '../stellarLedger.utils';

describe('ledgerToTimestamp', () => {
	it('returns correct estimated Date for ledger in the past', () => {
		const referenceLedger = 1000;
		const referenceTimestamp = Date.now();
		const pastLedger = 900; // 100 ledgers before reference

		const result = ledgerToTimestamp(pastLedger, referenceLedger, referenceTimestamp);
		const expectedTimestamp = referenceTimestamp - 100 * 5000; // 100 * 5 seconds in ms

		expect(result.getTime()).toBe(expectedTimestamp);
	});

	it('returns correct estimated Date for ledger in the future', () => {
		const referenceLedger = 1000;
		const referenceTimestamp = Date.now();
		const futureLedger = 1100; // 100 ledgers after reference

		const result = ledgerToTimestamp(futureLedger, referenceLedger, referenceTimestamp);
		const expectedTimestamp = referenceTimestamp + 100 * 5000; // 100 * 5 seconds in ms

		expect(result.getTime()).toBe(expectedTimestamp);
	});

	it('returns exactly the reference timestamp when ledger equals reference', () => {
		const referenceLedger = 1000;
		const referenceTimestamp = Date.now();

		const result = ledgerToTimestamp(referenceLedger, referenceLedger, referenceTimestamp);

		expect(result.getTime()).toBe(referenceTimestamp);
	});
});
