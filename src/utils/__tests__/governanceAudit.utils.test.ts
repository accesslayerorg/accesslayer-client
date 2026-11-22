import { describe, expect, it } from 'vitest';
import {
	formatCountdown,
	getCountdownParts,
	normalizeGovernanceAdminState,
	normalizeGovernanceEventsPage,
	shortenValue,
	toIsoTimestamp,
} from '@/utils/governanceAudit.utils';

describe('governanceAudit.utils', () => {
	it('normalises an events page and drops unknown types', () => {
		const page = normalizeGovernanceEventsPage({
			items: [
				{
					id: 'a',
					type: 'CONFIG_CHANGE',
					actor: 'GACTOR',
					target: 'fee_bps',
					timestamp: 1_763_812_800,
					tx_hash: 'abc',
				},
				{ id: 'b', type: 'mystery', actor: 'GACTOR' },
			],
			next_cursor: 'cursor-2',
		});

		expect(page.nextCursor).toBe('cursor-2');
		expect(page.items).toEqual([
			{
				id: 'a',
				type: 'config_change',
				actor: 'GACTOR',
				target: 'fee_bps',
				timestamp: new Date(1_763_812_800_000).toISOString(),
				txHash: 'abc',
				details: null,
			},
		]);
	});

	it('accepts a bare array payload with no cursor', () => {
		const page = normalizeGovernanceEventsPage([
			{ type: 'pause', actor: 'G1', txHash: 'h1', timestamp: '2026-01-01' },
		]);
		expect(page.items[0]).toMatchObject({ id: 'h1-pause', target: null });
		expect(page.nextCursor).toBeNull();
	});

	it('normalises admin state including a nested pending transfer', () => {
		expect(
			normalizeGovernanceAdminState({
				admin: 'GCURRENT',
				pending: { admin: 'GNEXT', expiresAt: '2026-12-01T00:00:00Z' },
			})
		).toEqual({
			currentAdmin: 'GCURRENT',
			pendingAdmin: 'GNEXT',
			pendingExpiresAt: '2026-12-01T00:00:00.000Z',
		});
		expect(normalizeGovernanceAdminState({ currentAdmin: 'G' })).toEqual({
			currentAdmin: 'G',
			pendingAdmin: null,
			pendingExpiresAt: null,
		});
	});

	it('builds and formats countdown parts, clamping at zero', () => {
		const now = Date.UTC(2026, 0, 1);
		const parts = getCountdownParts(
			new Date(
				now + (2 * 86_400 + 3 * 3600 + 4 * 60 + 5) * 1000
			).toISOString(),
			now
		);
		expect(formatCountdown(parts)).toBe('2d 03h 04m 05s');
		expect(
			formatCountdown(
				getCountdownParts(new Date(now + 65_000).toISOString(), now)
			)
		).toBe('00h 01m 05s');
		expect(
			getCountdownParts(new Date(now - 1).toISOString(), now).totalMs
		).toBe(0);
	});

	it('shortens long values and leaves short ones alone', () => {
		expect(shortenValue('GABCDEFGHIJKLMNOP')).toBe('GABC…MNOP');
		expect(shortenValue('GABC')).toBe('GABC');
	});

	it('returns null for invalid timestamps', () => {
		expect(toIsoTimestamp('not a date')).toBeNull();
		expect(toIsoTimestamp(null)).toBeNull();
	});
});
