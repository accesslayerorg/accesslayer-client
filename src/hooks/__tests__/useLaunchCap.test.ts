import { describe, expect, it } from 'vitest';
import {
	calculateCurrentLaunchCap,
	remainingLaunchAllowance,
	useLaunchCapStore,
	type LaunchCapData,
} from '../useLaunchCap';

const base: LaunchCapData = {
	keyId: 'key-1',
	wallet: 'GTEST',
	currentCap: 20,
	purchasedAmount: 7,
	remainingAllowance: 13,
	windowStart: 1000,
	windowEnd: 5000,
	initialCap: 10,
	finalCap: 30,
	isExempt: false,
	exemptionReason: null,
};

describe('useLaunchCap', () => {
	it('calculates remaining allowance from cumulative purchases', () => {
		useLaunchCapStore.setState({ purchases: {} });
		useLaunchCapStore.getState().recordPurchase('key-1', 'GTEST', 5);
		useLaunchCapStore.getState().recordPurchase('key-1', 'GTEST', 2);
		expect(useLaunchCapStore.getState().purchases['key-1:GTEST']).toBe(7);
		expect(remainingLaunchAllowance(base)).toBe(13);
	});

	it('ramps the cap over the launch window', () => {
		expect(calculateCurrentLaunchCap(10, 30, 1000, 5000, 1000)).toBe(10);
		expect(calculateCurrentLaunchCap(10, 30, 1000, 5000, 3000)).toBe(20);
		expect(calculateCurrentLaunchCap(10, 30, 1000, 5000, 5000)).toBe(30);
	});
});
