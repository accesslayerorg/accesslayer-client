import { describe, expect, it } from 'vitest';
import {
	createLaunchOrderSecret,
	getLaunchPhaseCountdown,
	getLaunchPhaseState,
	hashLaunchOrder,
	normalizeLaunchAmount,
	parseLaunchOrderBackup,
} from '@/utils/launchCommitReveal.utils';

const launch = {
	launchStartLedger: 100,
	launchCommitEndLedger: 120,
	launchRevealEndLedger: 150,
};

describe('getLaunchPhaseState', () => {
	it('transitions through commit, reveal, and settled at the configured ledgers', () => {
		expect(getLaunchPhaseState(launch, 100)).toEqual({
			phase: 'commit',
			ledgersRemaining: 20,
		});
		expect(getLaunchPhaseState(launch, 120)).toEqual({
			phase: 'reveal',
			ledgersRemaining: 30,
		});
		expect(getLaunchPhaseState(launch, 150)).toEqual({
			phase: 'settled',
			ledgersRemaining: 0,
		});
	});

	it('is inactive outside the configured window and rejects invalid schedules', () => {
		expect(getLaunchPhaseState(launch, 99).phase).toBe('inactive');
		expect(
			getLaunchPhaseState(
				{ ...launch, launchRevealEndLedger: launch.launchCommitEndLedger },
				110
			).phase
		).toBe('inactive');
	});

	it('uses an explicit settlement result even when ledger data is missing', () => {
		expect(getLaunchPhaseState({ launchSettled: true }, null)).toEqual({
			phase: 'settled',
			ledgersRemaining: 0,
		});
	});
});

describe('launch order secret handling', () => {
	it('generates a salted local commitment and validates its backup', () => {
		const secret = createLaunchOrderSecret('key-123', '0xAbC', '1.25');

		expect(secret.salt).toMatch(/^0x[0-9a-f]{64}$/);
		expect(secret.walletAddress).toBe('0xabc');
		expect(secret.commitmentHash).toBe(
			hashLaunchOrder(
				secret.keyId,
				secret.walletAddress,
				secret.amount,
				secret.salt
			)
		);
		expect(parseLaunchOrderBackup(secret, 'key-123', '0xABC')).toMatchObject(
			secret
		);
	});

	it('rejects a backup for a different key or wallet and corrupted commitment', () => {
		const secret = createLaunchOrderSecret('key-123', '0xAbC', '2');

		expect(() =>
			parseLaunchOrderBackup(secret, 'other-key', '0xabc')
		).toThrow('does not match');
		expect(() =>
			parseLaunchOrderBackup(secret, 'key-123', '0xdef')
		).toThrow('does not match');
		expect(() =>
			parseLaunchOrderBackup(
				{ ...secret, commitmentHash: `0x${'0'.repeat(64)}` },
				'key-123',
				'0xabc'
			)
		).toThrow('integrity check');
	});

	it('validates decimal order amounts and estimates time from ledgers', () => {
		expect(normalizeLaunchAmount(' 0.75 ')).toBe('0.75');
		expect(normalizeLaunchAmount('-1')).toBeNull();
		expect(normalizeLaunchAmount('0')).toBeNull();
		expect(normalizeLaunchAmount('1e3')).toBeNull();
		expect(getLaunchPhaseCountdown(13)).toEqual({
			seconds: 65,
			label: '1m 05s',
		});
	});
});
