import { BaseApiService, type APIResponse } from './api.service';

/** Current health state rendered by the service health grid (#1051). */
export type ServiceStatus = 'operational' | 'degraded' | 'down';

/** Lifecycle state of a published incident. */
export type IncidentState =
	| 'investigating'
	| 'identified'
	| 'monitoring'
	| 'resolved';

/** A single calendar day of uptime history for a service. */
export interface ServiceUptimeDay {
	/** Calendar day the bucket covers, in ISO `YYYY-MM-DD` form. */
	date: string;
	/** Percentage of successful checks for that day (0–100). */
	uptimePercentage: number;
}

/** Health of one monitored service. */
export interface ServiceHealth {
	id: string;
	name: string;
	/** What the service powers, shown under the service name. */
	description?: string;
	status: ServiceStatus;
	/**
	 * 30-day uptime percentage (0–100) as reported by the API. Callers that
	 * render the 30-day window should prefer
	 * `resolveUptimePercentage(service)`, which computes the window from
	 * `dailyUptime` when the API provides per-day buckets.
	 */
	uptimePercentage?: number;
	/** Per-day uptime buckets backing the 30-day history strip. */
	dailyUptime?: ServiceUptimeDay[];
	/** Latest measured response time in milliseconds, when reported. */
	responseTimeMs?: number;
}

/** One published update on an incident timeline. */
export interface IncidentUpdate {
	message: string;
	createdAt: string;
	state?: IncidentState;
}

/** A single entry in the incident log. */
export interface StatusIncident {
	id: string;
	title: string;
	status: IncidentState;
	/** Ids of the services affected by this incident. */
	affectedServiceIds: string[];
	/** ISO 8601 timestamp when the incident started. */
	startedAt: string;
	/** ISO 8601 timestamp when the incident was resolved, or null while open. */
	resolvedAt?: string | null;
	/** Short description of the impact. */
	summary?: string;
	/** Chronological updates published on the incident. */
	updates?: IncidentUpdate[];
}

/** Snapshot returned by `GET /status`. */
export interface PlatformStatus {
	services: ServiceHealth[];
	incidents: StatusIncident[];
	/** ISO 8601 timestamp of when the backend produced this snapshot. */
	updatedAt: string;
}

type RawRecord = Record<string, unknown>;

function asRecord(value: unknown): RawRecord | null {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
		? (value as RawRecord)
		: null;
}

function firstString(...values: unknown[]): string | undefined {
	for (const value of values) {
		if (typeof value === 'string' && value.trim() !== '') return value.trim();
	}
	return undefined;
}

function firstNumber(...values: unknown[]): number | undefined {
	for (const value of values) {
		const parsed = typeof value === 'string' ? Number(value) : value;
		if (typeof parsed === 'number' && Number.isFinite(parsed)) return parsed;
	}
	return undefined;
}

function firstArray(...values: unknown[]): unknown[] | undefined {
	for (const value of values) {
		if (Array.isArray(value)) return value;
	}
	return undefined;
}

function normalizeTimestamp(...values: unknown[]): string | undefined {
	for (const value of values) {
		if (typeof value !== 'string' && typeof value !== 'number') continue;
		if (typeof value === 'string' && value.trim() === '') continue;

		const parsed = new Date(value);
		if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
	}
	return undefined;
}

function normalizeKey(value: unknown): string {
	return typeof value === 'string'
		? value.trim().toLowerCase().replace(/[\s-]+/g, '_')
		: '';
}

const OPERATIONAL_ALIASES = new Set([
	'operational',
	'up',
	'ok',
	'healthy',
	'online',
	'available',
]);

const DEGRADED_ALIASES = new Set([
	'degraded',
	'degraded_performance',
	'partial_outage',
	'maintenance',
	'under_maintenance',
	'warning',
	'slow',
]);

/**
 * Maps a raw status value onto the three states the grid renders.
 *
 * Unknown or missing values degrade conservatively: the status page never
 * claims a service is healthy when the backend did not say so.
 */
export function normalizeServiceStatus(value: unknown): ServiceStatus {
	const key = normalizeKey(value);
	if (!key) return 'degraded';
	if (OPERATIONAL_ALIASES.has(key)) return 'operational';
	if (DEGRADED_ALIASES.has(key)) return 'degraded';
	return 'down';
}

const INCIDENT_STATE_BY_ALIAS = new Map<string, IncidentState>([
	['investigating', 'investigating'],
	['identified', 'identified'],
	['monitoring', 'monitoring'],
	['observing', 'monitoring'],
	['resolved', 'resolved'],
	['closed', 'resolved'],
	['completed', 'resolved'],
	['postmortem', 'resolved'],
]);

/** Maps a raw incident state onto the lifecycle states the log renders. */
export function normalizeIncidentState(
	value: unknown,
	resolvedAt?: string | null
): IncidentState {
	const mapped = INCIDENT_STATE_BY_ALIAS.get(normalizeKey(value));
	if (mapped) return mapped;
	return resolvedAt ? 'resolved' : 'investigating';
}

function normalizeUptimeDay(value: unknown): ServiceUptimeDay | null {
	const record = asRecord(value);
	if (!record) return null;

	const date = firstString(record.date, record.day, record.timestamp);
	const percentage = firstNumber(
		record.uptimePercentage,
		record.uptime_percentage,
		record.uptime,
		record.percentage
	);
	if (!date || percentage == null) return null;

	return {
		date,
		uptimePercentage: Math.min(100, Math.max(0, percentage)),
	};
}

function normalizeService(value: unknown, index: number): ServiceHealth | null {
	const record = asRecord(value);
	if (!record) return null;

	const id =
		firstString(record.id, record.slug, record.key, record.serviceId) ??
		`service-${index + 1}`;
	const days = firstArray(
		record.dailyUptime,
		record.daily_uptime,
		record.days,
		record.history
	)
		?.map(normalizeUptimeDay)
		.filter((day): day is ServiceUptimeDay => day !== null);

	return {
		id,
		name: firstString(record.name, record.label, record.title) ?? id,
		description: firstString(record.description, record.summary),
		status: normalizeServiceStatus(
			record.status ?? record.state ?? record.health
		),
		uptimePercentage: firstNumber(
			record.uptimePercentage,
			record.uptime_percentage,
			record.uptime30d,
			record.uptime
		),
		dailyUptime: days && days.length > 0 ? days : undefined,
		responseTimeMs: firstNumber(
			record.responseTimeMs,
			record.response_time_ms,
			record.latencyMs,
			record.responseTime
		),
	};
}

function normalizeAffectedServiceIds(record: RawRecord): string[] {
	const raw = firstArray(
		record.affectedServiceIds,
		record.affected_services,
		record.affectedServices,
		record.serviceIds,
		record.services
	);
	if (!raw) return [];

	const ids = raw
		.map(entry => {
			if (typeof entry === 'string') return entry.trim();
			const nested = asRecord(entry);
			return nested
				? firstString(nested.id, nested.slug, nested.name)
				: undefined;
		})
		.filter((id): id is string => Boolean(id));

	return Array.from(new Set(ids));
}

function normalizeIncidentUpdate(value: unknown): IncidentUpdate | null {
	const record = asRecord(value);
	if (!record) return null;

	const message = firstString(
		record.message,
		record.body,
		record.description,
		record.text
	);
	const createdAt = normalizeTimestamp(
		record.createdAt,
		record.created_at,
		record.timestamp,
		record.at
	);
	if (!message || !createdAt) return null;

	const state =
		record.state ?? record.status;
	return {
		message,
		createdAt,
		state: state == null ? undefined : normalizeIncidentState(state),
	};
}

function normalizeIncident(value: unknown, index: number): StatusIncident | null {
	const record = asRecord(value);
	if (!record) return null;

	const startedAt = normalizeTimestamp(
		record.startedAt,
		record.started_at,
		record.startTime,
		record.createdAt
	);
	if (!startedAt) return null;

	const resolvedAt =
		normalizeTimestamp(
			record.resolvedAt,
			record.resolved_at,
			record.resolvedTime,
			record.endedAt
		) ?? null;

	const updates = firstArray(record.updates)
		?.map(normalizeIncidentUpdate)
		.filter((update): update is IncidentUpdate => update !== null);

	return {
		id:
			firstString(record.id, record.incidentId, record.slug) ??
			`incident-${index + 1}`,
		title:
			firstString(record.title, record.name, record.summary) ??
			'Untitled incident',
		status: normalizeIncidentState(
			record.status ?? record.state,
			resolvedAt
		),
		affectedServiceIds: normalizeAffectedServiceIds(record),
		startedAt,
		resolvedAt,
		summary: firstString(record.summary, record.description),
		updates: updates && updates.length > 0 ? updates : undefined,
	};
}

/** Normalizes an unknown `GET /status` payload into the client's shape. */
export function normalizePlatformStatus(payload: unknown): PlatformStatus {
	const record = asRecord(payload) ?? {};

	const services = (firstArray(record.services) ?? [])
		.map(normalizeService)
		.filter((service): service is ServiceHealth => service !== null);

	const incidents = (firstArray(record.incidents) ?? [])
		.map(normalizeIncident)
		.filter((incident): incident is StatusIncident => incident !== null);

	return {
		services,
		incidents,
		updatedAt:
			normalizeTimestamp(record.updatedAt, record.updated_at) ??
			new Date().toISOString(),
	};
}

class StatusService extends BaseApiService {
	/** Public platform snapshot — GET /status */
	async getPlatformStatus(): Promise<PlatformStatus> {
		try {
			const response =
				await this.api.get<APIResponse<unknown>>('/status');

			return normalizePlatformStatus(response.data?.data);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Register an email address for incident notifications —
	 * POST /status/subscribe with `{ email }`.
	 */
	async subscribeToStatusUpdates(email: string): Promise<string> {
		try {
			const response = await this.api.post<
				APIResponse<{ message?: string } | undefined>
			>('/status/subscribe', { email: email.trim() });

			return (
				response.data?.data?.message ??
				response.data?.message ??
				'You are subscribed to platform status updates.'
			);
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const statusService = new StatusService();
