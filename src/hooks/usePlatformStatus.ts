import { useQuery } from '@tanstack/react-query';
import { statusService } from '@/services/status.service';
import { queryKeys } from '@/lib/queryKeys';

/** Auto-refresh interval required by #1051 — the page polls every 60 seconds. */
export const STATUS_REFETCH_INTERVAL_MS = 60 * 1_000;

/** Go stale just before the poll fires so the refresh lands on schedule. */
const STATUS_STALE_TIME_MS = 55 * 1_000;

/** Overall platform state reported by the status endpoint. */
export type PlatformOverallState =
	| 'operational'
	| 'degraded'
	| 'partial_outage'
	| 'maintenance';

/** Normalized state for an individual platform component. */
export interface PlatformComponentState {
	/** Stable component identifier (e.g. `indexer`, `api`, `prices`). */
	id: string;
	/** Human-readable component name. */
	name: string;
	/** Normalized component status. */
	status: PlatformOverallState;
	/** Optional human-readable detail for the component. */
	description?: string;
}

/** Normalized indexer lag information, when reported. */
export interface IndexerLagState {
	/** Whether the indexer is currently lagging behind the chain head. */
	isLagging: boolean;
	/** Lag in seconds, when known. */
	lagSeconds?: number;
	/** Lag in blocks, when known. */
	lagBlocks?: number;
	/** Note explaining that balances and prices may be delayed. */
	note?: string;
}

/** Normalized maintenance window information, when scheduled or active. */
export interface MaintenanceState {
	/** Whether maintenance is currently active. */
	isActive: boolean;
	/** ISO timestamp for when maintenance is expected to end, when known. */
	expectedEndTime?: string;
	/** Human-readable maintenance message. */
	message?: string;
}

/** Normalized platform status snapshot consumed by the UI. */
export interface NormalizedPlatformStatus {
	/** Overall platform state. */
	overall: PlatformOverallState;
	/** Normalized component states. */
	components: PlatformComponentState[];
	/** Indexer lag information, when reported. */
	indexerLag?: IndexerLagState;
	/** Maintenance window information, when reported. */
	maintenance?: MaintenanceState;
	/** ISO timestamp of when the snapshot was last updated, when known. */
	updatedAt?: string;
}

/** Result returned by {@link usePlatformStatus}. */
export interface UsePlatformStatusResult {
	/** Last known good normalized status, or `undefined` before first success. */
	status: NormalizedPlatformStatus | undefined;
	/** Whether the initial fetch is still in flight. */
	isLoading: boolean;
	/**
	 * Whether the most recent fetch failed. Kept separate from `status` so a
	 * transient failure never surfaces a false outage — the last known good
	 * snapshot is retained.
	 */
	isError: boolean;
	/** The error from the most recent failed fetch, when applicable. */
	error: unknown;
	/** Whether the platform is currently operational. */
	isOperational: boolean;
	/** Whether the platform is currently degraded. */
	isDegraded: boolean;
	/** Whether the platform is currently in a partial outage. */
	isPartialOutage: boolean;
	/** Whether maintenance is currently active. */
	isUnderMaintenance: boolean;
	/** Whether trading should be disabled (maintenance active). */
	isTradingDisabled: boolean;
}

const DEFAULT_NOTE =
	'Balances and prices may be delayed while the indexer catches up.';

const KNOWN_STATES: readonly PlatformOverallState[] = [
	'operational',
	'degraded',
	'partial_outage',
	'maintenance',
];

function normalizeState(value: unknown): PlatformOverallState {
	if (typeof value !== 'string') {
		return 'operational';
	}
	const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
	switch (normalized) {
		case 'operational':
		case 'ok':
		case 'up':
		case 'healthy':
			return 'operational';
		case 'degraded':
		case 'degraded_performance':
		case 'warning':
			return 'degraded';
		case 'partial_outage':
		case 'outage':
		case 'down':
		case 'major_outage':
			return 'partial_outage';
		case 'maintenance':
		case 'under_maintenance':
		case 'scheduled_maintenance':
			return 'maintenance';
		default:
			return 'operational';
	}
}

function isKnownState(value: unknown): value is PlatformOverallState {
	return (
		typeof value === 'string' &&
		KNOWN_STATES.includes(value as PlatformOverallState)
	);
}

function toNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return undefined;
}

function toStringOrUndefined(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function normalizeComponent(raw: unknown, index: number): PlatformComponentState {
	const record =
		raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
	const id =
		toStringOrUndefined(record.id) ??
		toStringOrUndefined(record.key) ??
		toStringOrUndefined(record.name) ??
		`component-${index}`;
	const name = toStringOrUndefined(record.name) ?? id;
	return {
		id,
		name,
		status: normalizeState(record.status ?? record.state),
		description:
			toStringOrUndefined(record.description) ??
			toStringOrUndefined(record.detail),
	};
}

function normalizeIndexerLag(
	raw: unknown,
	components: PlatformComponentState[],
): IndexerLagState | undefined {
	const record =
		raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : undefined;

	const indexerComponent = components.find(
		(component) => component.id.toLowerCase() === 'indexer',
	);

	const lagSeconds = record ? toNumber(record.lagSeconds ?? record.lag_seconds) : undefined;
	const lagBlocks = record ? toNumber(record.lagBlocks ?? record.lag_blocks) : undefined;
	const explicitLagging =
		record && typeof record.isLagging === 'boolean'
			? record.isLagging
			: record && typeof record.lagging === 'boolean'
				? record.lagging
				: undefined;

	const isLagging =
		explicitLagging ??
		(indexerComponent ? indexerComponent.status !== 'operational' : false) ??
		false;

	if (!record && !indexerComponent) {
		return undefined;
	}

	if (!isLagging && lagSeconds === undefined && lagBlocks === undefined) {
		return undefined;
	}

	return {
		isLagging,
		lagSeconds,
		lagBlocks,
		note:
			(record ? toStringOrUndefined(record.note) : undefined) ??
			(isLagging ? DEFAULT_NOTE : undefined),
	};
}

function normalizeMaintenance(raw: unknown): MaintenanceState | undefined {
	if (raw === undefined || raw === null) {
		return undefined;
	}
	if (typeof raw === 'boolean') {
		return raw ? { isActive: true } : undefined;
	}
	const record =
		raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

	const isActive =
		typeof record.isActive === 'boolean'
			? record.isActive
			: typeof record.active === 'boolean'
				? record.active
				: normalizeState(record.status ?? record.state) === 'maintenance';

	const expectedEndTime =
		toStringOrUndefined(record.expectedEndTime) ??
		toStringOrUndefined(record.expected_end_time) ??
		toStringOrUndefined(record.endsAt) ??
		toStringOrUndefined(record.ends_at);

	const message =
		toStringOrUndefined(record.message) ??
		toStringOrUndefined(record.description);

	if (!isActive && !expectedEndTime && !message) {
		return undefined;
	}

	return {
		isActive,
		expectedEndTime,
		message,
	};
}

/**
 * Normalizes a raw `GET /v1/status` payload into a stable shape consumed by
 * the UI. Unknown or missing fields default to `operational` so a malformed
 * payload never fabricates an outage.
 */
export function normalizePlatformStatus(
	raw: unknown,
): NormalizedPlatformStatus {
	const record =
		raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

	const rawComponents = Array.isArray(record.components)
		? record.components
		: Array.isArray(record.services)
			? record.services
			: [];

	const components = rawComponents.map(normalizeComponent);

	const rawOverall =
		record.overall ?? record.status ?? record.state ?? record.indicator;

	let overall: PlatformOverallState;
	if (isKnownState(rawOverall)) {
		overall = rawOverall;
	} else if (rawOverall !== undefined) {
		overall = normalizeState(rawOverall);
	} else if (components.length > 0) {
		// Derive from components when no explicit overall state is provided.
		if (components.some((component) => component.status === 'maintenance')) {
			overall = 'maintenance';
		} else if (
			components.some((component) => component.status === 'partial_outage')
		) {
			overall = 'partial_outage';
		} else if (components.some((component) => component.status === 'degraded')) {
			overall = 'degraded';
		} else {
			overall = 'operational';
		}
	} else {
		overall = 'operational';
	}

	const maintenance = normalizeMaintenance(
		record.maintenance ?? record.maintenanceWindow ?? record.maintenance_window,
	);

	if (maintenance?.isActive) {
		overall = 'maintenance';
	}

	const indexerLag = normalizeIndexerLag(
		record.indexerLag ?? record.indexer_lag ?? record.indexer,
		components,
	);

	return {
		overall,
		components,
		indexerLag,
		maintenance,
		updatedAt:
			toStringOrUndefined(record.updatedAt) ??
			toStringOrUndefined(record.updated_at) ??
			toStringOrUndefined(record.timestamp),
	};
}

/**
 * Polls the public platform status snapshot (`GET /v1/status`) every 60
 * seconds, refreshing the health grid, uptime history, and incident log
 * without a page reload (#1051).
 *
 * Returns normalized component states including indexer lag and maintenance
 * with expected end time (#1403). A fetch failure never surfaces a false
 * outage: the last known good snapshot is retained and the failure is exposed
 * separately via `isError`/`error`.
 */
export function usePlatformStatus(): UsePlatformStatusResult {
	const query = useQuery({
		queryKey: queryKeys.status.platform(),
		queryFn: () => statusService.getPlatformStatus(),
		staleTime: STATUS_STALE_TIME_MS,
		refetchInterval: STATUS_REFETCH_INTERVAL_MS,
		// Retain the last known good snapshot across failures so a transient
		// fetch error does not flash a false outage.
		placeholderData: (previous) => previous,
	});

	const status = query.data
		? normalizePlatformStatus(query.data)
		: undefined;

	const overall = status?.overall ?? 'operational';
	const isUnderMaintenance =
		overall === 'maintenance' || status?.maintenance?.isActive === true;

	return {
		status,
		isLoading: query.isLoading,
		isError: query.isError,
		error: query.error,
		isOperational: overall === 'operational',
		isDegraded: overall === 'degraded',
		isPartialOutage: overall === 'partial_outage',
		isUnderMaintenance,
		isTradingDisabled: isUnderMaintenance,
	};
}