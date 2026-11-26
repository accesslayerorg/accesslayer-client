import { describe, expect, it } from 'vitest';
import { isAttestationCurrent } from '../holderAttestation.utils';

describe('holder attestations', () => {
	it('recognizes current and expired attestations', () => {
		expect(isAttestationCurrent({ expiresAt: '2030-01-01T00:00:00Z' }, Date.parse('2029-01-01'))).toBe(true);
		expect(isAttestationCurrent({ expiresAt: '2020-01-01T00:00:00Z' }, Date.parse('2029-01-01'))).toBe(false);
	});
});
