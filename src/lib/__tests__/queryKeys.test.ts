import { describe, expect, it } from 'vitest';
import { queryKeys } from '../queryKeys';

describe('queryKeys – key shapes', () => {
	it('every static key is an array', () => {
		expect(Array.isArray(queryKeys.creators.all)).toBe(true);
	});

	it('every factory function returns an array', () => {
		expect(Array.isArray(queryKeys.creators.list())).toBe(true);
		expect(Array.isArray(queryKeys.creators.detail('abc'))).toBe(true);
		expect(Array.isArray(queryKeys.creators.holders('abc'))).toBe(true);
		expect(Array.isArray(queryKeys.wallet.holdings('0xabc'))).toBe(true);
		expect(Array.isArray(queryKeys.wallet.activity('0xabc'))).toBe(true);
	});
});

describe('queryKeys – shared prefixes for cache invalidation', () => {
	it('creators.list shares the creators prefix with creators.all', () => {
		expect(queryKeys.creators.list()[0]).toBe(queryKeys.creators.all[0]);
	});

	it('creators.detail shares the creators prefix with creators.all', () => {
		expect(queryKeys.creators.detail('x')[0]).toBe(queryKeys.creators.all[0]);
	});

	it('creators.holders shares the creators prefix with creators.all', () => {
		expect(queryKeys.creators.holders('x')[0]).toBe(
			queryKeys.creators.all[0]
		);
	});

	it('wallet.holdings and wallet.activity share the wallet + address prefix', () => {
		const addr = '0x1234';
		expect(queryKeys.wallet.holdings(addr)[0]).toBe(
			queryKeys.wallet.activity(addr)[0]
		);
		expect(queryKeys.wallet.holdings(addr)[1]).toBe(
			queryKeys.wallet.activity(addr)[1]
		);
	});
});

describe('queryKeys – parameter embedding', () => {
	it('creators.list embeds params at index 2', () => {
		const params = { page: 2, limit: 10 };
		const key = queryKeys.creators.list(params);
		expect(key[2]).toStrictEqual(params);
	});

	it('creators.list uses null when no params given', () => {
		expect(queryKeys.creators.list()[2]).toBeNull();
	});

	it('creators.detail embeds the id at index 2', () => {
		expect(queryKeys.creators.detail('creator-123')[2]).toBe('creator-123');
	});

	it('creators.holders embeds creatorId at index 1', () => {
		expect(queryKeys.creators.holders('creator-456')[1]).toBe('creator-456');
	});

	it('wallet.holdings embeds address at index 1', () => {
		expect(queryKeys.wallet.holdings('0xabc')[1]).toBe('0xabc');
	});

	it('wallet.activity embeds address at index 1', () => {
		expect(queryKeys.wallet.activity('0xabc')[1]).toBe('0xabc');
	});
});
