import { describe, expect, it } from 'vitest';
import {
	getWalletEvent,
	isBackgroundTab,
	isCrossTabMessage,
	isSensitivePath,
	normalizeAddress,
	parseCrossTabMessage,
} from '@/utils/crossTabSync.utils';

describe('cross-tab sync utilities (#1412)', () => {
	it('derives connect, disconnect, account, and network events', () => {
		expect(
			getWalletEvent(
				{ isConnected: false, address: null, chainId: null },
				{ isConnected: true, address: '0xABC', chainId: 1 }
			)
		).toBe('connect');
		expect(
			getWalletEvent(
				{ isConnected: true, address: '0xABC', chainId: 1 },
				{ isConnected: false, address: null, chainId: null }
			)
		).toBe('disconnect');
		expect(
			getWalletEvent(
				{ isConnected: true, address: '0xABC', chainId: 1 },
				{ isConnected: true, address: '0xDEF', chainId: 1 }
			)
		).toBe('account_change');
		expect(
			getWalletEvent(
				{ isConnected: true, address: '0xABC', chainId: 1 },
				{ isConnected: true, address: '0xabc', chainId: 137 }
			)
		).toBe('network_change');
		expect(
			getWalletEvent(
				{ isConnected: true, address: '0xABC', chainId: 1 },
				{ isConnected: true, address: '0xabc', chainId: 1 }
			)
		).toBeNull();
	});

	it('normalizes addresses and parses only valid messages', () => {
		expect(normalizeAddress(' 0xAbC ')).toBe('0xabc');
		expect(normalizeAddress(null)).toBeNull();
		expect(
			isCrossTabMessage({
				id: '1',
				tabId: '2',
				type: 'connect',
				address: null,
				chainId: 1,
				timestamp: 10,
			})
		).toBe(true);
		expect(isCrossTabMessage({ id: '1', type: 'connect' })).toBe(false);
		expect(parseCrossTabMessage('not json')).toBeNull();
	});

	it('identifies sensitive paths and background tabs', () => {
		expect(isSensitivePath('/profile/keys')).toBe(true);
		expect(isSensitivePath('/learn/bonding-curve')).toBe(false);
		expect(isBackgroundTab()).toBe(false);
	});
});
