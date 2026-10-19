import { describe, expect, it } from 'vitest';
import {
	buildAirdropClaimRecord,
	computeTotalAllocation,
	getAirdropClaimHistoryStorageKey,
	getClaimedAirdropIds,
	getUnclaimedAirdrops,
	groupAirdropsByKey,
	loadAirdropClaimHistory,
	saveAirdropClaimHistory,
	type AirdropAllocation,
	type AirdropClaimRecord,
} from '../airdropClaim.utils';

function makeAirdrop(overrides: Partial<AirdropAllocation> = {}): AirdropAllocation {
	return {
		id: 'airdrop-1',
		keyId: 'key-1',
		keyName: 'Alice',
		snapshotDate: '2026-09-01T00:00:00Z',
		totalDistributed: 10_000,
		userAllocation: 25,
		...overrides,
	};
}

function makeRecord(overrides: Partial<AirdropClaimRecord> = {}): AirdropClaimRecord {
	return {
		id: 'airdrop-1',
		keyId: 'key-1',
		keyName: 'Alice',
		amount: 25,
		timestamp: 1_000,
		transactionHash: 'a'.repeat(64),
		...overrides,
	};
}

function createMemoryStorage() {
	const store = new Map<string, string>();
	return {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => {
			store.set(key, value);
		},
	};
}

describe('computeTotalAllocation', () => {
	it('sums user allocations', () => {
		expect(
			computeTotalAllocation([
				makeAirdrop({ id: 'a', userAllocation: 10 }),
				makeAirdrop({ id: 'b', userAllocation: 15.5 }),
			])
		).toBe(25.5);
	});

	it('ignores missing and non-positive allocations', () => {
		expect(
			computeTotalAllocation([
				makeAirdrop({ id: 'a', userAllocation: 0 }),
				makeAirdrop({ id: 'b', userAllocation: Number.NaN }),
			])
		).toBe(0);
		expect(computeTotalAllocation([])).toBe(0);
	});
});

describe('claim history storage', () => {
	it('uses a wallet-scoped storage key', () => {
		expect(getAirdropClaimHistoryStorageKey('GABC')).toBe(
			'accesslayer:airdrop_claim_history:GABC'
		);
	});

	it('round-trips records newest first', () => {
		const storage = createMemoryStorage();
		const records = [
			makeRecord({ id: 'a', timestamp: 100 }),
			makeRecord({ id: 'b', timestamp: 300 }),
		];
		saveAirdropClaimHistory('GABC', records, storage);
		expect(loadAirdropClaimHistory('GABC', storage)).toEqual([
			makeRecord({ id: 'b', timestamp: 300 }),
			makeRecord({ id: 'a', timestamp: 100 }),
		]);
	});

	it('returns [] for corrupt or missing payloads', () => {
		const storage = createMemoryStorage();
		expect(loadAirdropClaimHistory('GABC', storage)).toEqual([]);
		storage.setItem('accesslayer:airdrop_claim_history:GABC', '{not json');
		expect(loadAirdropClaimHistory('GABC', storage)).toEqual([]);
		storage.setItem(
			'accesslayer:airdrop_claim_history:GABC',
			JSON.stringify({ nope: true })
		);
		expect(loadAirdropClaimHistory('GABC', storage)).toEqual([]);
	});

	it('filters out malformed records', () => {
		const storage = createMemoryStorage();
		storage.setItem(
			'accesslayer:airdrop_claim_history:GABC',
			JSON.stringify([
				makeRecord(),
				{ id: 'bad' },
				null,
				makeRecord({ id: 'ok', timestamp: 50 }),
			])
		);
		expect(loadAirdropClaimHistory('GABC', storage)).toHaveLength(2);
	});
});

describe('getClaimedAirdropIds / getUnclaimedAirdrops', () => {
	it('excludes already-claimed airdrops and preserves order', () => {
		const allocations = [
			makeAirdrop({ id: 'a' }),
			makeAirdrop({ id: 'b' }),
			makeAirdrop({ id: 'c' }),
		];
		const history = [makeRecord({ id: 'b' })];
		expect(getUnclaimedAirdrops(allocations, history).map(a => a.id)).toEqual([
			'a',
			'c',
		]);
		expect([...getClaimedAirdropIds(history)]).toEqual(['b']);
	});
});

describe('groupAirdropsByKey', () => {
	it('groups by keyId and sorts each group by snapshot date descending', () => {
		const allocations = [
			makeAirdrop({
				id: 'a1',
				keyId: 'key-1',
				keyName: 'Alice',
				snapshotDate: '2026-08-01T00:00:00Z',
			}),
			makeAirdrop({
				id: 'b1',
				keyId: 'key-2',
				keyName: 'Bob',
				snapshotDate: '2026-07-01T00:00:00Z',
			}),
			makeAirdrop({
				id: 'a2',
				keyId: 'key-1',
				keyName: 'Alice',
				snapshotDate: '2026-09-01T00:00:00Z',
			}),
		];

		const groups = groupAirdropsByKey(allocations);
		expect(groups).toHaveLength(2);
		expect(groups[0].keyId).toBe('key-1');
		expect(groups[0].keyName).toBe('Alice');
		expect(groups[0].airdrops.map(a => a.id)).toEqual(['a2', 'a1']);
		expect(groups[1].keyId).toBe('key-2');
		expect(groups[1].airdrops.map(a => a.id)).toEqual(['b1']);
	});

	it('returns an empty list for no allocations', () => {
		expect(groupAirdropsByKey([])).toEqual([]);
	});
});

describe('buildAirdropClaimRecord', () => {
	it('builds a history record from an allocation and submission result', () => {
		expect(
			buildAirdropClaimRecord(makeAirdrop(), 'deadbeef', 1234)
		).toEqual({
			id: 'airdrop-1',
			keyId: 'key-1',
			keyName: 'Alice',
			amount: 25,
			timestamp: 1234,
			transactionHash: 'deadbeef',
		});
	});

	it('clamps non-positive allocations to 0', () => {
		expect(
			buildAirdropClaimRecord(
				makeAirdrop({ userAllocation: -5 }),
				'hash',
				1
			).amount
		).toBe(0);
	});
});
