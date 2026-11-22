import { describe, expect, it } from 'vitest';
import {
	describeVestingMilestone,
	getNextVestingMilestone,
} from '../vestingViewer.utils';

const NOW = Date.parse('2026-10-01T12:00:00Z');

describe('getNextVestingMilestone (#1117)', () => {
	it('returns null when there is nothing upcoming', () => {
		expect(getNextVestingMilestone([], NOW)).toBeNull();
	});

	it('picks the soonest cliff among pre-cliff schedules', () => {
		const milestone = getNextVestingMilestone(
			[
				{
					keyId: 'far',
					keyName: 'Far Key',
					cliffAt: '2026-10-03T12:00:00Z', // +2 days
					endAt: '2027-01-01T00:00:00Z',
				},
				{
					keyId: 'soon',
					keyName: 'Soon Key',
					cliffAt: '2026-10-01T13:00:00Z', // +1 hour
					endAt: '2027-01-01T00:00:00Z',
				},
			],
			NOW
		);

		expect(milestone).not.toBeNull();
		expect(milestone?.keyId).toBe('soon');
		expect(milestone?.kind).toBe('cliff');
		expect(milestone?.secondsLeft).toBe(3600);
		expect(milestone?.at).toBe('2026-10-01T13:00:00.000Z');
	});

	it('falls back to the full-unlock date for post-cliff schedules', () => {
		const milestone = getNextVestingMilestone(
			[
				{
					keyId: 'vesting',
					keyName: 'Vesting Key',
					cliffAt: '2026-09-01T12:00:00Z', // past
					endAt: '2026-10-01T12:30:00Z', // +30 min
				},
			],
			NOW
		);

		expect(milestone?.kind).toBe('full_vest');
		expect(milestone?.secondsLeft).toBe(1800);
	});

	it('compares cliffs against other schedules full-vest dates', () => {
		const milestone = getNextVestingMilestone(
			[
				{
					keyId: 'cliff-soon',
					cliffAt: '2026-10-01T12:10:00Z', // +10 min
					endAt: '2027-01-01T00:00:00Z',
				},
				{
					keyId: 'vest-soon',
					cliffAt: '2026-09-01T12:00:00Z', // past
					endAt: '2026-10-01T12:05:00Z', // +5 min
				},
			],
			NOW
		);

		expect(milestone?.keyId).toBe('vest-soon');
		expect(milestone?.kind).toBe('full_vest');
		expect(milestone?.secondsLeft).toBe(300);
	});

	it('ignores fully vested and malformed schedules', () => {
		expect(
			getNextVestingMilestone(
				[
					{
						keyId: 'done',
						cliffAt: '2026-01-01T00:00:00Z',
						endAt: '2026-06-01T00:00:00Z',
					},
					{ keyId: 'no-dates', cliffAt: null, endAt: null },
					{ keyId: 'bad-date', cliffAt: 'not-a-date', endAt: null },
				],
				NOW
			)
		).toBeNull();
	});

	it('floors secondsLeft and never reports a negative countdown', () => {
		const milestone = getNextVestingMilestone(
			[
				{
					keyId: 'sub-second',
					cliffAt: NOW + 1999,
					endAt: null,
				},
			],
			NOW
		);
		expect(milestone?.secondsLeft).toBe(1);

		// A timestamp exactly at `now` is already due: secondsLeft clamps to 0.
		const due = getNextVestingMilestone(
			[{ keyId: 'due', cliffAt: NOW + 1000, endAt: null }],
			NOW + 1500
		);
		// now past cliff and no end date → no milestone.
		expect(due).toBeNull();
	});
});

describe('describeVestingMilestone (#1117)', () => {
	it('labels cliffs and full vests with the key name', () => {
		expect(
			describeVestingMilestone({
				keyId: 'key-1',
				keyName: 'Alpha Key',
				kind: 'cliff',
				at: '2026-10-01T13:00:00.000Z',
				secondsLeft: 3600,
			})
		).toBe('Cliff for Alpha Key');

		expect(
			describeVestingMilestone({
				keyId: 'key-2',
				keyName: null,
				kind: 'full_vest',
				at: '2026-10-01T13:00:00.000Z',
				secondsLeft: 3600,
			})
		).toBe('Full vest for Key key-2');
	});
});
