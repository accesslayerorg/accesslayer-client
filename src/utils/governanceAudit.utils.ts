import type {
	GovernanceAdminState,
	GovernanceEvent,
	GovernanceEventsPage,
	GovernanceEventType,
} from '@/types/governance';

/** Every event type the audit feed understands, in filter order. */
export const GOVERNANCE_EVENT_TYPES: readonly GovernanceEventType[] = [
	'admin_transfer_proposed',
	'admin_transfer_accepted',
	'admin_transfer_cancelled',
	'config_change',
	'pause',
	'unpause',
	'upgrade',
] as const;

export const GOVERNANCE_EVENT_LABELS: Record<GovernanceEventType, string> = {
	admin_transfer_proposed: 'Admin transfer proposed',
	admin_transfer_accepted: 'Admin transfer accepted',
	admin_transfer_cancelled: 'Admin transfer cancelled',
	config_change: 'Config change',
	pause: 'Paused',
	unpause: 'Unpaused',
	upgrade: 'Contract upgrade',
};

export type GovernanceEventFilter = GovernanceEventType | 'all';

function asRecord(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function asString(value: unknown): string | null {
	if (typeof value === 'string' && value.trim() !== '') return value;
	if (typeof value === 'number' && Number.isFinite(value))
		return String(value);
	return null;
}

/** Accepts ISO strings, epoch milliseconds or epoch seconds and returns ISO. */
export function toIsoTimestamp(value: unknown): string | null {
	if (value === null || value === undefined || value === '') return null;
	if (typeof value === 'number' || /^\d+$/.test(String(value))) {
		const n = Number(value);
		if (!Number.isFinite(n)) return null;
		// Values below 1e12 are epoch seconds (ledger close times).
		const date = new Date(n < 1e12 ? n * 1000 : n);
		return Number.isNaN(date.getTime()) ? null : date.toISOString();
	}
	const date = new Date(String(value));
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function isGovernanceEventType(
	value: unknown
): value is GovernanceEventType {
	return (
		typeof value === 'string' &&
		(GOVERNANCE_EVENT_TYPES as readonly string[]).includes(value)
	);
}

/** Normalises one raw server event, returning null when it is unusable. */
export function normalizeGovernanceEvent(raw: unknown): GovernanceEvent | null {
	const record = asRecord(raw);
	const rawType = asString(record.type ?? record.eventType)?.toLowerCase();
	if (!isGovernanceEventType(rawType)) return null;

	const txHash = asString(record.txHash ?? record.tx_hash ?? record.hash);
	const timestamp =
		toIsoTimestamp(record.timestamp ?? record.createdAt ?? record.time) ?? '';
	const id = asString(record.id) ?? (txHash ? `${txHash}-${rawType}` : null);
	if (!id) return null;

	return {
		id,
		type: rawType,
		actor: asString(record.actor ?? record.from) ?? '',
		target: asString(record.target ?? record.to),
		timestamp,
		txHash,
		details: asString(record.details ?? record.description),
	};
}

/** Normalises a GET /governance/events payload into a cursor page. */
export function normalizeGovernanceEventsPage(
	data: unknown
): GovernanceEventsPage {
	const payload = asRecord(data);
	const rawItems = Array.isArray(data)
		? data
		: Array.isArray(payload.items)
			? payload.items
			: Array.isArray(payload.events)
				? payload.events
				: [];

	return {
		items: rawItems
			.map(normalizeGovernanceEvent)
			.filter((event): event is GovernanceEvent => event !== null),
		nextCursor: asString(payload.nextCursor ?? payload.next_cursor),
	};
}

/** Normalises a GET /governance/admin payload. */
export function normalizeGovernanceAdminState(
	data: unknown
): GovernanceAdminState {
	const payload = asRecord(data);
	const pending = asRecord(payload.pending);
	return {
		currentAdmin: asString(payload.currentAdmin ?? payload.admin) ?? '',
		pendingAdmin: asString(payload.pendingAdmin ?? pending.admin),
		pendingExpiresAt: toIsoTimestamp(
			payload.pendingExpiresAt ?? payload.expiresAt ?? pending.expiresAt
		),
	};
}

export interface CountdownParts {
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
	totalMs: number;
}

export function getCountdownParts(
	expiresAtIso: string,
	nowMs: number
): CountdownParts {
	const totalMs = Math.max(0, new Date(expiresAtIso).getTime() - nowMs || 0);
	const totalSeconds = Math.floor(totalMs / 1000);
	return {
		days: Math.floor(totalSeconds / 86_400),
		hours: Math.floor((totalSeconds % 86_400) / 3600),
		minutes: Math.floor((totalSeconds % 3600) / 60),
		seconds: totalSeconds % 60,
		totalMs,
	};
}

/** Formats a countdown as `2d 03h 04m 05s`, dropping the day part when zero. */
export function formatCountdown(parts: CountdownParts): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	const time = `${pad(parts.hours)}h ${pad(parts.minutes)}m ${pad(parts.seconds)}s`;
	return parts.days > 0 ? `${parts.days}d ${time}` : time;
}

/** Shortens a Stellar address or hash for display: `GABC…WXYZ`. */
export function shortenValue(value: string, lead = 4, tail = 4): string {
	if (value.length <= lead + tail + 1) return value;
	return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}
