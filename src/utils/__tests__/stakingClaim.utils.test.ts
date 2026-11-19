import { describe, expect, it } from 'vitest';
import { computeRemainingClaimSeconds } from '../stakingClaim.utils';

describe('computeRemainingClaimSeconds', () => {
	const nowMs = 1_700_000_000_000;

	it('returns the seconds remaining when unlockLedger is in the future', () => {
		const unlockLedger = nowMs / 1000 + 3661;
		expect(computeRemainingClaimSeconds(unlockLedger, nowMs)).toBe(3661);
	});

	it('returns 0 when unlockLedger has already passed', () => {
		const unlockLedger = nowMs / 1000 - 1;
		expect(computeRemainingClaimSeconds(unlockLedger, nowMs)).toBe(0);
	});

	it('returns 0 exactly at expiry', () => {
		const unlockLedger = nowMs / 1000;
		expect(computeRemainingClaimSeconds(unlockLedger, nowMs)).toBe(0);
	});
});
