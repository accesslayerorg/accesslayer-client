import { describe, expect, it } from 'vitest';
import { getKeyReserveStatus } from '@/utils/keyReserve.utils';

describe('getKeyReserveStatus', () => {
	it('hides the chip when no reserve has accrued', () => {
		expect(getKeyReserveStatus(null).visible).toBe(false);
		expect(
			getKeyReserveStatus({ reserveStroops: 0, marketCapStroops: 1_000 })
				.visible
		).toBe(false);
	});

	it('warns when the reserve is below 10% of market cap', () => {
		expect(
			getKeyReserveStatus({ reserveStroops: 99, marketCapStroops: 1_000 })
		).toEqual({ visible: true, isLow: true, ratio: 0.099 });
	});

	it('does not warn at or above the 10% threshold', () => {
		expect(
			getKeyReserveStatus({ reserveStroops: 100, marketCapStroops: 1_000 })
				.isLow
		).toBe(false);
		expect(
			getKeyReserveStatus({ reserveStroops: 500, marketCapStroops: 1_000 })
				.isLow
		).toBe(false);
	});

	it('shows the balance without a warning when market cap is unknown', () => {
		expect(
			getKeyReserveStatus({ reserveStroops: 100, marketCapStroops: null })
		).toEqual({ visible: true, isLow: false, ratio: null });
	});
});
