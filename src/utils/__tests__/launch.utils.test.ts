import { describe, expect, it } from 'vitest';
import type { Course } from '@/services/course.service';
import { LAUNCH_WINDOW_MS } from '@/utils/launchPenalty.utils';
import {
	filterLaunches,
	getCalendarMonthDays,
	getLaunchCountdownState,
	getLaunchStartMs,
	toLaunch,
	toLaunches,
	type LaunchTab,
} from '@/utils/launch.utils';

const NOW = new Date('2026-06-10T12:00:00Z').getTime();

function course(id: string, overrides: Partial<Course> = {}): Course {
	return {
		id,
		title: `Key ${id}`,
		description: '',
		price: 1,
		instructorId: `creator-${id}`,
		category: 'Art',
		level: 'BEGINNER',
		...overrides,
	};
}

describe('launch utilities (#1409)', () => {
	it('uses the nearest future launch window, then the most recent past date', () => {
		expect(
			getLaunchStartMs(
				course('a', {
					createdAt: '2026-06-01T00:00:00Z',
					publicLaunchDate: '2026-06-20T00:00:00Z',
					auctionEndsAt: '2026-06-15T00:00:00Z',
				}),
				NOW
			)
		).toBe(new Date('2026-06-15T00:00:00Z').getTime());
		expect(
			getLaunchStartMs(course('b', { createdAt: '2026-06-01T00:00:00Z' }), NOW)
		).toBe(new Date('2026-06-01T00:00:00Z').getTime());
	});

	it('classifies launches by their start time and launch window', () => {
		const launches = toLaunches(
			[
				course('upcoming', { publicLaunchDate: '2026-06-20T00:00:00Z' }),
				course('live', { createdAt: '2026-06-09T00:00:00Z' }),
				course('recent', {
					createdAt: new Date(NOW - LAUNCH_WINDOW_MS - 1000).toISOString(),
				}),
			],
			NOW
		);

		expect(launches.map(launch => launch.phase)).toEqual([
			'upcoming',
			'live',
			'recent',
		]);
	});

	it('filters and orders each tab', () => {
		const launches = toLaunches(
			[
				course('later', { createdAt: '2026-07-01T00:00:00Z' }),
				course('sooner', { createdAt: '2026-06-15T00:00:00Z' }),
				course('new-live', { createdAt: '2026-06-09T00:00:00Z' }),
				course('old-live', { createdAt: '2026-06-08T00:00:00Z' }),
				course('recent', { createdAt: '2026-05-01T00:00:00Z' }),
			],
			NOW
		);

		const expected: Record<LaunchTab, string[]> = {
			upcoming: ['sooner', 'later'],
			live: ['new-live', 'old-live'],
			recent: ['recent'],
		};
		for (const tab of ['upcoming', 'live', 'recent'] as LaunchTab[]) {
			expect(filterLaunches(launches, tab, NOW).map(item => item.id)).toEqual(
				expected[tab]
			);
		}
	});

	it('moves a launch from upcoming to live when its countdown reaches zero', () => {
		const startMs = NOW + 5000;
		const launch = toLaunch(course('flip', { auctionEndsAt: new Date(startMs).toISOString() }), NOW);
		expect(launch).not.toBeNull();
		expect(filterLaunches([launch!], 'upcoming', NOW)).toHaveLength(1);
		expect(filterLaunches([launch!], 'live', NOW)).toHaveLength(0);

		const after = NOW + 6000;
		expect(getLaunchCountdownState(startMs, after)).toMatchObject({
			remainingMs: 0,
			label: null,
			isLive: true,
		});
		expect(filterLaunches([launch!], 'upcoming', after)).toHaveLength(0);
		expect(filterLaunches([launch!], 'live', after)).toHaveLength(1);
	});

	it('places launches on the correct calendar day', () => {
		const launch = toLaunch(
			course('cal', { createdAt: '2026-06-15T10:00:00Z' }),
			NOW
		)!;
		const days = getCalendarMonthDays(new Date(2026, 5, 1), [launch]);
		const day = days.find(item => item.date.toDateString() === new Date('2026-06-15T10:00:00Z').toDateString());
		expect(day?.launches.map(item => item.id)).toEqual(['cal']);
		expect(days.filter(item => item.launches.length > 0)).toHaveLength(1);
	});
});
