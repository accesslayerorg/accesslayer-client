import { describe, expect, it } from 'vitest';
import type {
	ServiceUptimeDay,
	StatusIncident,
} from '@/services/status.service';
import {
	UPTIME_WINDOW_DAYS,
	buildUptimeSeries,
	buildUptimeWindowKeys,
	computeUptimePercentageFromDays,
	formatDurationLabel,
	formatUptimePercentage,
	getActiveIncidents,
	getIncidentDurationLabel,
	getIncidentStateMeta,
	getServiceStatusMeta,
	getUptimeBarClass,
	isIncidentOngoing,
	isValidSubscriberEmail,
	resolveServiceLabel,
	resolveUptimePercentage,
	sortIncidentsByRecency,
	summarizeServiceStatuses,
	toUptimeDayKey,
} from './status.utils';

/** Local noon so the calendar day is stable in every timezone. */
const NOW = new Date(2026, 8, 28, 12, 0, 0);

function dayKey(daysAgo: number): string {
	const date = new Date(2026, 8, 28 - daysAgo, 12, 0, 0);
	return toUptimeDayKey(date) as string;
}

function uptimeDay(daysAgo: number, uptimePercentage: number): ServiceUptimeDay {
	return { date: dayKey(daysAgo), uptimePercentage };
}

/** `count` days inside the window, all at the same uptime. */
function uptimeDaysAt(count: number, uptimePercentage: number): ServiceUptimeDay[] {
	return Array.from({ length: count }, (_, index) =>
		uptimeDay(index, uptimePercentage)
	);
}

const windowOptions = { now: NOW };

describe('status utils', () => {
	describe('buildUptimeWindowKeys', () => {
		it('returns exactly 30 days, oldest first, ending today', () => {
			const keys = buildUptimeWindowKeys(windowOptions);

			expect(keys).toHaveLength(UPTIME_WINDOW_DAYS);
			expect(keys[0]).toBe(dayKey(29));
			expect(keys[keys.length - 1]).toBe(dayKey(0));
		});

		it('honours a custom window length', () => {
			const keys = buildUptimeWindowKeys({ now: NOW, windowDays: 7 });

			expect(keys).toHaveLength(7);
			expect(keys[0]).toBe(dayKey(6));
			expect(keys[6]).toBe(dayKey(0));
		});

		it('crosses month boundaries correctly', () => {
			const keys = buildUptimeWindowKeys({
				now: new Date(2026, 0, 2, 12, 0, 0),
				windowDays: 3,
			});

			expect(keys).toEqual(['2025-12-31', '2026-01-01', '2026-01-02']);
		});
	});

	describe('buildUptimeSeries', () => {
		it('maps reported buckets onto the window and fills gaps with null', () => {
			const series = buildUptimeSeries(
				[uptimeDay(0, 100), uptimeDay(2, 50)],
				windowOptions
			);

			expect(series).toHaveLength(UPTIME_WINDOW_DAYS);
			expect(series[29]).toEqual({ date: dayKey(0), uptimePercentage: 100 });
			expect(series[28].uptimePercentage).toBeNull();
			expect(series[27]).toEqual({ date: dayKey(2), uptimePercentage: 50 });
		});

		it('drops buckets outside the rolling window', () => {
			const series = buildUptimeSeries([uptimeDay(45, 0)], windowOptions);

			expect(series.every(point => point.uptimePercentage === null)).toBe(true);
		});

		it('returns an all-null window when no history is reported', () => {
			const series = buildUptimeSeries(undefined, windowOptions);

			expect(series).toHaveLength(UPTIME_WINDOW_DAYS);
			expect(series.every(point => point.uptimePercentage === null)).toBe(true);
		});
	});

	describe('computeUptimePercentageFromDays', () => {
		it('returns null when no day falls in the window', () => {
			expect(
				computeUptimePercentageFromDays([uptimeDay(40, 12)], windowOptions)
			).toBeNull();
			expect(computeUptimePercentageFromDays([], windowOptions)).toBeNull();
			expect(computeUptimePercentageFromDays(undefined, windowOptions)).toBeNull();
		});

		it('averages the 30 day buckets', () => {
			const days = [...uptimeDaysAt(29, 100), uptimeDay(29, 90)];

			expect(
				computeUptimePercentageFromDays(days, windowOptions)
			).toBeCloseTo(99.6667, 3);
		});

		it('ignores days that were not reported instead of counting them down', () => {
			expect(
				computeUptimePercentageFromDays([uptimeDay(0, 98)], windowOptions)
			).toBe(98);
		});

		it('ignores buckets older than the window', () => {
			const days = [uptimeDay(45, 0), ...uptimeDaysAt(30, 100)];

			expect(computeUptimePercentageFromDays(days, windowOptions)).toBe(100);
		});

		it('clamps out-of-range day values to 0-100', () => {
			expect(
				computeUptimePercentageFromDays([uptimeDay(0, 140)], windowOptions)
			).toBe(100);
			expect(
				computeUptimePercentageFromDays([uptimeDay(0, -20)], windowOptions)
			).toBe(0);
		});
	});

	describe('resolveUptimePercentage', () => {
		it('prefers the computed 30 day window over the reported value', () => {
			expect(
				resolveUptimePercentage(
					{
						dailyUptime: uptimeDaysAt(30, 100),
						uptimePercentage: 42,
					},
					windowOptions
				)
			).toBe(100);
		});

		it('falls back to the reported value when no buckets exist', () => {
			expect(
				resolveUptimePercentage({ uptimePercentage: 97.25 }, windowOptions)
			).toBe(97.25);
		});

		it('clamps the reported value and rejects non-finite numbers', () => {
			expect(
				resolveUptimePercentage({ uptimePercentage: 130 }, windowOptions)
			).toBe(100);
			expect(
				resolveUptimePercentage({ uptimePercentage: Number.NaN }, windowOptions)
			).toBeNull();
		});

		it('returns null when nothing is reported', () => {
			expect(resolveUptimePercentage({}, windowOptions)).toBeNull();
		});
	});

	describe('formatUptimePercentage', () => {
		it('renders two decimals', () => {
			expect(formatUptimePercentage(99.983)).toBe('99.98%');
			expect(formatUptimePercentage(100)).toBe('100.00%');
		});

		it('renders a placeholder when there is no value', () => {
			expect(formatUptimePercentage(null)).toBe('—');
			expect(formatUptimePercentage(undefined)).toBe('—');
			expect(formatUptimePercentage(Number.NaN)).toBe('—');
		});
	});

	describe('getUptimeBarClass', () => {
		it('maps day uptime onto the strip colours', () => {
			expect(getUptimeBarClass(null)).toBe('bg-muted');
			expect(getUptimeBarClass(100)).toBe('bg-emerald-500');
			expect(getUptimeBarClass(99.5)).toBe('bg-emerald-500');
			expect(getUptimeBarClass(99.49)).toBe('bg-amber-500');
			expect(getUptimeBarClass(95)).toBe('bg-amber-500');
			expect(getUptimeBarClass(94.9)).toBe('bg-red-500');
		});
	});

	describe('service status presentation', () => {
		it('labels each state', () => {
			expect(getServiceStatusMeta('operational').label).toBe('Operational');
			expect(getServiceStatusMeta('degraded').label).toBe('Degraded');
			expect(getServiceStatusMeta('down').label).toBe('Down');
		});

		it('summarizes the worst state across services', () => {
			expect(summarizeServiceStatuses([])).toBe('operational');
			expect(
				summarizeServiceStatuses([
					{ status: 'operational' },
					{ status: 'operational' },
				])
			).toBe('operational');
			expect(
				summarizeServiceStatuses([
					{ status: 'operational' },
					{ status: 'degraded' },
				])
			).toBe('degraded');
			expect(
				summarizeServiceStatuses([
					{ status: 'degraded' },
					{ status: 'down' },
				])
			).toBe('down');
		});
	});

	describe('incident helpers', () => {
		const resolved = {
			id: 'inc-1',
			title: 'Indexer lag',
			status: 'resolved' as const,
			affectedServiceIds: ['indexer'],
			startedAt: '2026-09-20T10:00:00.000Z',
			resolvedAt: '2026-09-20T12:30:00.000Z',
		};

		const ongoing = {
			id: 'inc-2',
			title: 'Elevated RPC latency',
			status: 'investigating' as const,
			affectedServiceIds: ['contract-rpc'],
			startedAt: '2026-09-27T08:00:00.000Z',
			resolvedAt: null,
		};

		it('detects ongoing incidents', () => {
			expect(isIncidentOngoing(resolved)).toBe(false);
			expect(isIncidentOngoing(ongoing)).toBe(true);
			expect(getActiveIncidents([resolved, ongoing])).toEqual([ongoing]);
		});

		it('sorts incidents newest first without mutating the input', () => {
			const input: StatusIncident[] = [resolved, ongoing];
			const sorted = sortIncidentsByRecency(input);

			expect(sorted.map(incident => incident.id)).toEqual(['inc-2', 'inc-1']);
			expect(input[0].id).toBe('inc-1');
		});

		it('formats durations compactly', () => {
			expect(formatDurationLabel(30_000)).toBe('0m');
			expect(formatDurationLabel(45 * 60_000)).toBe('45m');
			expect(formatDurationLabel(3 * 3_600_000 + 12 * 60_000)).toBe('3h 12m');
			expect(formatDurationLabel(2 * 3_600_000)).toBe('2h');
			expect(formatDurationLabel(2 * 86_400_000 + 4 * 3_600_000)).toBe('2d 4h');
			expect(formatDurationLabel(-1)).toBe('—');
		});

		it('measures resolved incidents and open incidents separately', () => {
			expect(getIncidentDurationLabel(resolved)).toBe('2h 30m');
			expect(
				getIncidentDurationLabel(ongoing, new Date('2026-09-27T10:15:00.000Z'))
			).toBe('2h 15m');
			expect(getIncidentDurationLabel({ startedAt: 'nonsense' })).toBe('—');
		});

		it('labels incident states', () => {
			expect(getIncidentStateMeta('investigating').label).toBe('Investigating');
			expect(getIncidentStateMeta('resolved').label).toBe('Resolved');
		});

		it('resolves affected service names from the payload, the catalog, or the id', () => {
			expect(
				resolveServiceLabel('contract-rpc', [
					{ id: 'contract-rpc', name: 'Soroban RPC' },
				])
			).toBe('Soroban RPC');
			expect(resolveServiceLabel('indexer')).toBe('Indexer');
			expect(resolveServiceLabel('mystery-service')).toBe('mystery-service');
		});
	});

	describe('isValidSubscriberEmail', () => {
		it('accepts well formed addresses', () => {
			expect(isValidSubscriberEmail('fan@example.com')).toBe(true);
			expect(isValidSubscriberEmail('  ops+status@sub.example.co  ')).toBe(true);
		});

		it('rejects malformed addresses', () => {
			expect(isValidSubscriberEmail('')).toBe(false);
			expect(isValidSubscriberEmail('fan@example')).toBe(false);
			expect(isValidSubscriberEmail('fan example.com')).toBe(false);
			expect(isValidSubscriberEmail('@example.com')).toBe(false);
		});
	});
});
