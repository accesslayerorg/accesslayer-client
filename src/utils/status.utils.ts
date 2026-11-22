import { findMonitoredService } from '@/constants/status';
import type {
	IncidentState,
	ServiceHealth,
	ServiceStatus,
	ServiceUptimeDay,
	StatusIncident,
} from '@/services/status.service';

/**
 * Pure helpers behind the public platform status page (#1051).
 *
 * Everything here is side-effect free so the 30-day uptime math, the status
 * presentation tokens, and the incident formatting can be unit tested
 * without rendering the page.
 */

/** Length of the rolling uptime window rendered by the health grid. */
export const UPTIME_WINDOW_DAYS = 30;

/** Day-level uptime below this is shown as degraded (amber) in the strip. */
export const UPTIME_DEGRADED_THRESHOLD = 99.5;

/** Day-level uptime below this is shown as an outage (red) in the strip. */
export const UPTIME_OUTAGE_THRESHOLD = 95;

export interface UptimeWindowOptions {
	/** Length of the rolling window in days. Defaults to 30. */
	windowDays?: number;
	/** Reference point for "now". Defaults to the current time. */
	now?: Date | number;
}

function toTimestamp(value: Date | number | undefined): number {
	if (value == null) return Date.now();
	return value instanceof Date ? value.getTime() : value;
}

function clampPercentage(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.min(100, Math.max(0, value));
}

/** Parses an API date value into milliseconds, or null when unusable. */
export function parseStatusDate(
	value: string | number | Date | null | undefined
): number | null {
	if (value == null) return null;
	const timestamp =
		value instanceof Date ? value.getTime() : new Date(value).getTime();
	return Number.isFinite(timestamp) ? timestamp : null;
}

/**
 * Local `YYYY-MM-DD` key for a timestamp, matching `ServiceUptimeDay.date`.
 * Local time is intentional: uptime buckets are calendar days in the
 * viewer's timezone, the same way the strip labels them.
 */
export function toUptimeDayKey(
	value: string | number | Date | null | undefined
): string | null {
	const timestamp = parseStatusDate(value);
	if (timestamp == null) return null;

	const date = new Date(timestamp);
	const month = `${date.getMonth() + 1}`.padStart(2, '0');
	const day = `${date.getDate()}`.padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Day keys covered by the rolling window, oldest first and ending with the
 * day that contains `now` — so the last entry is always "today".
 */
export function buildUptimeWindowKeys(
	options: UptimeWindowOptions = {}
): string[] {
	const { windowDays = UPTIME_WINDOW_DAYS, now } = options;
	const cursor = new Date(toTimestamp(now));

	const keys: string[] = [];
	for (let offset = windowDays - 1; offset >= 0; offset -= 1) {
		const day = new Date(cursor);
		// setDate keeps the arithmetic DST-safe.
		day.setDate(cursor.getDate() - offset);
		keys.push(toUptimeDayKey(day) as string);
	}

	return keys;
}

export interface UptimeSeriesPoint {
	/** Calendar day in ISO `YYYY-MM-DD` form. */
	date: string;
	/** Day-level uptime percentage, or null when the API reported nothing. */
	uptimePercentage: number | null;
}

/**
 * Maps a service's daily uptime buckets onto the rolling window, oldest day
 * first. Buckets outside the window are ignored and days the API did not
 * report are returned as `null` rather than assumed healthy.
 */
export function buildUptimeSeries(
	days: ServiceUptimeDay[] | undefined,
	options: UptimeWindowOptions = {}
): UptimeSeriesPoint[] {
	const byDate = new Map<string, number>();

	for (const day of days ?? []) {
		const key = toUptimeDayKey(day.date);
		if (key) byDate.set(key, clampPercentage(day.uptimePercentage));
	}

	return buildUptimeWindowKeys(options).map(date => ({
		date,
		uptimePercentage: byDate.get(date) ?? null,
	}));
}

/**
 * Uptime percentage across the rolling window.
 *
 * Averages the day-level buckets that fall inside the window. Days the API
 * did not report are excluded because they are unknown, not downtime.
 * Returns null when the window holds no reported data.
 */
export function computeUptimePercentageFromDays(
	days: ServiceUptimeDay[] | undefined,
	options: UptimeWindowOptions = {}
): number | null {
	const reported = buildUptimeSeries(days, options).filter(
		(point): point is UptimeSeriesPoint & { uptimePercentage: number } =>
			point.uptimePercentage != null
	);

	if (reported.length === 0) return null;

	const total = reported.reduce(
		(sum, point) => sum + point.uptimePercentage,
		0
	);
	return clampPercentage(total / reported.length);
}

/**
 * Uptime percentage the grid should display for a service: computed from the
 * 30-day buckets when available, otherwise the value the API reported.
 * Returns null when neither source has data.
 */
export function resolveUptimePercentage(
	service: Pick<ServiceHealth, 'dailyUptime' | 'uptimePercentage'>,
	options: UptimeWindowOptions = {}
): number | null {
	const computed = computeUptimePercentageFromDays(service.dailyUptime, options);
	if (computed != null) return computed;

	const reported = service.uptimePercentage;
	return typeof reported === 'number' && Number.isFinite(reported)
		? clampPercentage(reported)
		: null;
}

/** Formats an uptime percentage with fixed precision so the grid never shifts. */
export function formatUptimePercentage(value: number | null | undefined): string {
	if (value == null || !Number.isFinite(value)) return '—';
	return `${value.toFixed(2)}%`;
}

/** Tailwind classes for one day in the uptime strip. */
export function getUptimeBarClass(
	uptimePercentage: number | null
): string {
	if (uptimePercentage == null) return 'bg-muted';
	if (uptimePercentage < UPTIME_OUTAGE_THRESHOLD) return 'bg-red-500';
	if (uptimePercentage < UPTIME_DEGRADED_THRESHOLD) return 'bg-amber-500';
	return 'bg-emerald-500';
}

export interface ServiceStatusMeta {
	/** Short state label, e.g. `Operational`. */
	label: string;
	/** Headline copy for the overall banner. */
	summary: string;
	/** Pill classes for the badge rendered next to a service name. */
	pillClass: string;
	/** Accent text colour for the same state. */
	textClass: string;
}

export const SERVICE_STATUS_META: Record<ServiceStatus, ServiceStatusMeta> = {
	operational: {
		label: 'Operational',
		summary: 'All systems operational',
		pillClass:
			'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
		textClass: 'text-emerald-600 dark:text-emerald-400',
	},
	degraded: {
		label: 'Degraded',
		summary: 'Degraded performance',
		pillClass:
			'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
		textClass: 'text-amber-600 dark:text-amber-400',
	},
	down: {
		label: 'Down',
		summary: 'Major outage',
		pillClass:
			'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
		textClass: 'text-red-600 dark:text-red-400',
	},
};

export function getServiceStatusMeta(status: ServiceStatus): ServiceStatusMeta {
	return SERVICE_STATUS_META[status];
}

/**
 * Worst status across the monitored services — drives the overall banner.
 * An empty list is treated as operational because nothing is reported down.
 */
export function summarizeServiceStatuses(
	services: Pick<ServiceHealth, 'status'>[]
): ServiceStatus {
	if (services.some(service => service.status === 'down')) return 'down';
	if (services.some(service => service.status === 'degraded')) return 'degraded';
	return 'operational';
}

export interface IncidentStateMeta {
	label: string;
	pillClass: string;
}

export const INCIDENT_STATE_META: Record<IncidentState, IncidentStateMeta> = {
	investigating: {
		label: 'Investigating',
		pillClass:
			'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
	},
	identified: {
		label: 'Identified',
		pillClass:
			'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
	},
	monitoring: {
		label: 'Monitoring',
		pillClass:
			'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
	},
	resolved: {
		label: 'Resolved',
		pillClass:
			'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
	},
};

export function getIncidentStateMeta(state: IncidentState): IncidentStateMeta {
	return INCIDENT_STATE_META[state];
}

/** True while an incident has no resolution timestamp. */
export function isIncidentOngoing(
	incident: Pick<StatusIncident, 'resolvedAt'>
): boolean {
	return !incident.resolvedAt;
}

export function getActiveIncidents(incidents: StatusIncident[]): StatusIncident[] {
	return incidents.filter(isIncidentOngoing);
}

/** Newest incident first. Returns a new array so callers never mutate props. */
export function sortIncidentsByRecency(
	incidents: StatusIncident[]
): StatusIncident[] {
	return [...incidents].sort(
		(left, right) =>
			(parseStatusDate(right.startedAt) ?? 0) -
			(parseStatusDate(left.startedAt) ?? 0)
	);
}

/** Compact duration label, e.g. `45m`, `3h 12m`, `2d 4h`. */
export function formatDurationLabel(durationMs: number): string {
	if (!Number.isFinite(durationMs) || durationMs < 0) return '—';

	const totalMinutes = Math.floor(durationMs / 60_000);
	if (totalMinutes < 60) return `${totalMinutes}m`;

	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (hours < 24) return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;

	const days = Math.floor(hours / 24);
	const remainingHours = hours % 24;
	return remainingHours === 0 ? `${days}d` : `${days}d ${remainingHours}h`;
}

/**
 * Time from the incident start to its resolution, or to `now` while the
 * incident is still open.
 */
export function getIncidentDurationLabel(
	incident: Pick<StatusIncident, 'startedAt' | 'resolvedAt'>,
	now?: Date | number
): string {
	const started = parseStatusDate(incident.startedAt);
	if (started == null) return '—';

	const resolved = parseStatusDate(incident.resolvedAt);
	const end = resolved ?? toTimestamp(now);
	return formatDurationLabel(end - started);
}

/**
 * Display name for a service id: the live payload wins, then the static
 * catalog, then the raw id so an unknown service is never hidden.
 */
export function resolveServiceLabel(
	id: string,
	services: Pick<ServiceHealth, 'id' | 'name'>[] = []
): string {
	return (
		services.find(service => service.id === id)?.name ??
		findMonitoredService(id)?.name ??
		id
	);
}

/**
 * Minimal shape check for the status subscribe form. Deliberately simple:
 * the backend owns the authoritative validation, this only stops obvious
 * typos from being posted.
 */
export function isValidSubscriberEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
