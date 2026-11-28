import { describe, it, expect } from 'vitest';
import {
	findBalanceAsOfLedger,
	computeHoldingsAsOfDate,
	timestampToEstimatedLedger,
	DEFAULT_REFERENCE_LEDGER,
	DEFAULT_REFERENCE_TIMESTAMP,
	exportBalanceHistoryToCsv,
} from '../balanceHistory.utils';
import type { BalanceCheckpoint } from '@/types/balanceHistory.types';

describe('balanceHistory.utils (#1446)', () => {
	const mockCheckpoints: BalanceCheckpoint[] = [
		{
			id: 'cp-1',
			ledger: 1000,
			timestamp: 1704067200000, // Jan 1 2024
			keyId: 'alpha',
			keyName: 'Alpha Key',
			balance: 10,
			change: 10,
			eventType: 'buy',
		},
		{
			id: 'cp-2',
			ledger: 2000,
			timestamp: 1704153600000, // Jan 2 2024
			keyId: 'alpha',
			keyName: 'Alpha Key',
			balance: 25,
			change: 15,
			eventType: 'buy',
		},
		{
			id: 'cp-3',
			ledger: 3000,
			timestamp: 1704240000000, // Jan 3 2024
			keyId: 'alpha',
			keyName: 'Alpha Key',
			balance: 18,
			change: -7,
			eventType: 'sell',
		},
	];

	it('converts timestamps to estimated Stellar ledgers', () => {
		expect(
			timestampToEstimatedLedger(DEFAULT_REFERENCE_TIMESTAMP + 10_000)
		).toBe(DEFAULT_REFERENCE_LEDGER + 2);
	});

	it('returns ZERO holdings for ledgers before the first checkpoint', () => {
		const result = findBalanceAsOfLedger(mockCheckpoints, 500);
		expect(result.balance).toBe(0);
		expect(result.checkpointLedger).toBeNull();
	});

	it('matches earlier checkpoint for ledgers between checkpoints', () => {
		// Between cp-1 (1000) and cp-2 (2000)
		const res1 = findBalanceAsOfLedger(mockCheckpoints, 1500);
		expect(res1.balance).toBe(10);
		expect(res1.checkpointLedger).toBe(1000);

		// Exactly at cp-2 (2000)
		const res2 = findBalanceAsOfLedger(mockCheckpoints, 2000);
		expect(res2.balance).toBe(25);
		expect(res2.checkpointLedger).toBe(2000);

		// Between cp-2 (2000) and cp-3 (3000)
		const res3 = findBalanceAsOfLedger(mockCheckpoints, 2500);
		expect(res3.balance).toBe(25);
		expect(res3.checkpointLedger).toBe(2000);
	});

	it('matches latest checkpoint for ledgers after the last checkpoint', () => {
		const result = findBalanceAsOfLedger(mockCheckpoints, 5000);
		expect(result.balance).toBe(18);
		expect(result.checkpointLedger).toBe(3000);
	});

	it('converts date to estimated ledger and includes approximation note with ledger used', () => {
		const targetDate = new Date('2026-02-01T00:00:00Z');
		const result = computeHoldingsAsOfDate(mockCheckpoints, targetDate);

		expect(result.estimatedLedger).toBeGreaterThan(0);
		expect(result.approximationNote).toContain(
			`ledger #${result.estimatedLedger.toLocaleString()}`
		);
		expect(result.approximationNote).toContain('approximately every 5 seconds');
	});

	it('generates CSV export string matching checkpoint data', () => {
		const csv = exportBalanceHistoryToCsv(mockCheckpoints);

		expect(csv).toContain('Date UTC,Ledger,Key ID,Key Name,Event,Change,Balance');
		expect(csv).toContain('1000,"alpha","Alpha Key",buy,+10,10');
		expect(csv).toContain('2000,"alpha","Alpha Key",buy,+15,25');
		expect(csv).toContain('3000,"alpha","Alpha Key",sell,-7,18');
	});
});
