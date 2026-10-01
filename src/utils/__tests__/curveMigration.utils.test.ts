import { describe, expect, it } from 'vitest';
import type {
	CurveMigration,
	CurveMigrationParams,
} from '@/types/curveMigration';
import {
	buildCurveMigrationExecuteCall,
	canExecuteCurveMigration,
	EXECUTE_CURVE_MIGRATION_FUNCTION,
	formatCurveMigrationCountdown,
	formatCurveMigrationDate,
	getCurveMigrationApprovalPercent,
	getCurveMigrationExecuteDisabledReason,
	getCurveMigrationParticipationPercent,
	getCurveMigrationTimelockRemainingMs,
	getCurveParamChanges,
	isCurveMigrationTimelockElapsed,
	isCurveMigrationVoteApproved,
	partitionCurveMigrations,
	toTimestampMs,
} from '@/utils/curveMigration.utils';

const NOW = Date.parse('2026-09-26T12:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;

const currentParams: CurveMigrationParams = {
	basePriceStroops: 10_000_000,
	growthFactor: 1.01,
	milestones: [{ supply: 100, exponent: 1 }],
};

const proposedParams: CurveMigrationParams = {
	basePriceStroops: 20_000_000,
	growthFactor: 1.02,
	milestones: [
		{ supply: 100, exponent: 1 },
		{ supply: 500, exponent: 3 },
	],
};

function createMigration(
	overrides: Partial<CurveMigration> = {}
): CurveMigration {
	return {
		id: 'migration-1',
		keyId: 'creator-1',
		title: 'Tighten the curve',
		status: 'pending',
		currentParams,
		proposedParams,
		// Timelock already elapsed relative to NOW.
		timelockEndsAt: '2026-09-26T12:00:00.000Z',
		forVotes: 60,
		againstVotes: 20,
		quorumBps: 4000,
		eligibleVotingWeight: 100,
		totalCirculatingSupply: 100,
		totalVotingWeight: 80,
		...overrides,
	};
}

describe('curve migration timestamp helpers', () => {
	it('normalizes ISO strings, epoch milliseconds, and epoch seconds', () => {
		expect(toTimestampMs('2026-09-26T12:00:00.000Z')).toBe(NOW);
		expect(toTimestampMs(NOW)).toBe(NOW);
		expect(toTimestampMs(Math.floor(NOW / 1000))).toBe(NOW);
	});

	it('returns null for missing or unparseable values', () => {
		expect(toTimestampMs(null)).toBeNull();
		expect(toTimestampMs(undefined)).toBeNull();
		expect(toTimestampMs('not-a-date')).toBeNull();
		expect(toTimestampMs(Number.NaN)).toBeNull();
	});
});

describe('curve migration timelock', () => {
	it('counts down the milliseconds left on a running timelock', () => {
		const migration = createMigration({
			timelockEndsAt: new Date(NOW + 2 * HOUR_MS).toISOString(),
		});

		expect(getCurveMigrationTimelockRemainingMs(migration, NOW)).toBe(2 * HOUR_MS);
		expect(isCurveMigrationTimelockElapsed(migration, NOW)).toBe(false);
	});

	it('treats a passed timelock as elapsed and never reports negative time', () => {
		const migration = createMigration({
			timelockEndsAt: new Date(NOW - HOUR_MS).toISOString(),
		});

		expect(getCurveMigrationTimelockRemainingMs(migration, NOW)).toBe(0);
		expect(isCurveMigrationTimelockElapsed(migration, NOW)).toBe(true);
	});

	it('treats a missing timelock as elapsed instead of NaN', () => {
		const migration = createMigration({
			timelockEndsAt: undefined as unknown as string,
		});

		expect(getCurveMigrationTimelockRemainingMs(migration, NOW)).toBe(0);
		expect(isCurveMigrationTimelockElapsed(migration, NOW)).toBe(true);
	});

	it('formats the countdown as HH:MM:SS and reads "Ready" once elapsed', () => {
		expect(formatCurveMigrationCountdown(HOUR_MS)).toBe('01:00:00');
		expect(formatCurveMigrationCountdown(0)).toBe('Ready');
		expect(formatCurveMigrationCountdown(-5)).toBe('Ready');
		expect(formatCurveMigrationCountdown(Number.NaN)).toBe('Ready');
	});

	it('formats the execution date and falls back to a dash', () => {
		expect(formatCurveMigrationDate('2027-03-12T00:00:00.000Z')).toContain('2027');
		expect(formatCurveMigrationDate(null)).toBe('—');
		expect(formatCurveMigrationDate('nope')).toBe('—');
	});
});

describe('curve migration vote status', () => {
	it('reports the share of cast weight that voted for', () => {
		expect(getCurveMigrationApprovalPercent(createMigration())).toBe(75);
	});

	it('reports 0% approval before any weight is cast', () => {
		expect(
			getCurveMigrationApprovalPercent(
				createMigration({ forVotes: 0, againstVotes: 0 })
			)
		).toBe(0);
	});

	it('measures participation against the eligible weight', () => {
		expect(getCurveMigrationParticipationPercent(createMigration())).toBe(80);
		expect(
			getCurveMigrationParticipationPercent(
				createMigration({ eligibleVotingWeight: undefined, totalCirculatingSupply: 200 })
			)
		).toBe(40);
	});

	it('approves only when quorum is met and for-votes outweigh against', () => {
		expect(isCurveMigrationVoteApproved(createMigration())).toBe(true);
		expect(
			isCurveMigrationVoteApproved(
				createMigration({ forVotes: 20, againstVotes: 60 })
			)
		).toBe(false);
		expect(
			isCurveMigrationVoteApproved(
				createMigration({ totalVotingWeight: 20 })
			)
		).toBe(false);
	});
});

describe('curve migration execution gate', () => {
	it('allows execution only once the timelock and vote conditions both hold', () => {
		expect(canExecuteCurveMigration(createMigration(), NOW)).toBe(true);
	});

	it('blocks execution while the timelock is still running', () => {
		const migration = createMigration({
			timelockEndsAt: new Date(NOW + HOUR_MS).toISOString(),
		});

		expect(canExecuteCurveMigration(migration, NOW)).toBe(false);
		expect(getCurveMigrationExecuteDisabledReason(migration, NOW)).toMatch(
			/timelock/i
		);
	});

	it('blocks execution when the vote has not carried the migration', () => {
		const migration = createMigration({ totalVotingWeight: 10 });

		expect(canExecuteCurveMigration(migration, NOW)).toBe(false);
		expect(getCurveMigrationExecuteDisabledReason(migration, NOW)).toMatch(
			/quorum/i
		);
	});

	it('has no disabled reason for an executable migration', () => {
		expect(getCurveMigrationExecuteDisabledReason(createMigration(), NOW)).toBeNull();
	});

	it('refuses migrations that are no longer pending', () => {
		for (const status of ['executed', 'rejected', 'cancelled', 'expired'] as const) {
			const migration = createMigration({ status });
			expect(canExecuteCurveMigration(migration, NOW)).toBe(false);
			expect(
				getCurveMigrationExecuteDisabledReason(migration, NOW)
			).toMatch(/no longer pending/i);
		}
	});
});

describe('curve param diff', () => {
	it('flags only the parameters the migration actually changes', () => {
		const changes = getCurveParamChanges(currentParams, proposedParams);

		expect(changes.map(change => change.field)).toEqual([
			'basePriceStroops',
			'growthFactor',
			'milestones',
		]);
		expect(changes.every(change => change.changed)).toBe(true);
	});

	it('reports unchanged parameters and renders their values', () => {
		const changes = getCurveParamChanges(proposedParams, proposedParams);

		expect(changes.every(change => !change.changed)).toBe(true);
		expect(changes[0].from).toBe(changes[0].to);
		expect(changes[2].to).toBe('2 tiers');
	});

	it('treats missing params as unknown rather than throwing', () => {
		const changes = getCurveParamChanges(null, undefined);

		expect(changes).toHaveLength(3);
		expect(changes[0].from).toBe('—');
		expect(changes[1].from).toBe('—');
		expect(changes[2].from).toBe('None');
		expect(changes.every(change => change.to === change.from)).toBe(true);
		expect(changes.every(change => !change.changed)).toBe(true);
	});
});

describe('partitionCurveMigrations', () => {
	it('splits pending from executed and drops unexecuted terminal records', () => {
		const { pending, executed } = partitionCurveMigrations([
			createMigration({ id: 'executed-1', status: 'executed', executedAt: '2026-01-01T00:00:00.000Z' }),
			createMigration({ id: 'rejected-1', status: 'rejected' }),
			createMigration({ id: 'pending-1' }),
		]);

		expect(pending.map(migration => migration.id)).toEqual(['pending-1']);
		expect(executed.map(migration => migration.id)).toEqual(['executed-1']);
	});

	it('orders pending by soonest timelock and history by newest execution', () => {
		const { pending, executed } = partitionCurveMigrations([
			createMigration({ id: 'late', timelockEndsAt: '2026-09-28T12:00:00.000Z' }),
			createMigration({ id: 'early', timelockEndsAt: '2026-09-27T12:00:00.000Z' }),
			createMigration({ id: 'older', status: 'executed', executedAt: '2026-01-01T00:00:00.000Z' }),
			createMigration({ id: 'newer', status: 'executed', executedAt: '2026-05-05T00:00:00.000Z' }),
		]);

		expect(pending.map(migration => migration.id)).toEqual(['early', 'late']);
		expect(executed.map(migration => migration.id)).toEqual(['newer', 'older']);
	});

	it('tolerates a missing or malformed list', () => {
		expect(partitionCurveMigrations(undefined)).toEqual({
			pending: [],
			executed: [],
		});
	});
});

describe('buildCurveMigrationExecuteCall', () => {
	it('builds the execute_curve_migration contract call', () => {
		expect(
			buildCurveMigrationExecuteCall({
				creatorId: 'creator-1',
				migrationId: 'migration-1',
			})
		).toEqual({
			functionName: 'execute_curve_migration',
			args: { creatorId: 'creator-1', migrationId: 'migration-1' },
		});
		expect(EXECUTE_CURVE_MIGRATION_FUNCTION).toBe('execute_curve_migration');
	});
});
