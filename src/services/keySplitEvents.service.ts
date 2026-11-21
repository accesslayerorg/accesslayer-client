import { env } from '@/utils/env.utils';
import type { SplitExecutedEvent } from '@/types/keySplit';
import { isSplitActive, parseTimestampMs } from '@/utils/keySplit.utils';
import { BaseApiService } from './api.service';

export type SplitExecutedHandler = (event: SplitExecutedEvent) => void;

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
	return typeof value === 'object' && value !== null
		? (value as UnknownRecord)
		: {};
}

function toFiniteNumber(value: unknown): number | null {
	if (value == null || value === '') return null;
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Normalizes an incoming raw WebSocket frame or API response into a SplitExecutedEvent.
 */
export function normalizeSplitExecutedEvent(value: unknown): SplitExecutedEvent | null {
	const envelope = asRecord(value);
	const raw = asRecord(envelope.data ?? envelope);

	const eventType = String(envelope.type ?? raw.type ?? raw.event ?? '');
	// Accept explicit SplitExecuted events or flat payloads
	if (eventType && !/SplitExecuted/i.test(eventType) && !raw.ratio) {
		return null;
	}

	const keyId =
		raw.keyId ?? raw.key_id ?? raw.creatorId ?? raw.creator_id ?? raw.id;
	const ratio = toFiniteNumber(raw.ratio ?? raw.splitRatio ?? raw.split_ratio);

	if (typeof keyId !== 'string' || keyId.trim() === '' || ratio == null || ratio <= 0) {
		return null;
	}

	const rawTimestamp =
		raw.executedAt ??
		raw.executed_at ??
		raw.timestamp ??
		raw.createdAt ??
		raw.created_at;

	const executedAtMs = parseTimestampMs(rawTimestamp as string | number);
	const executedAt = Number.isNaN(executedAtMs)
		? new Date().toISOString()
		: typeof rawTimestamp === 'string'
			? rawTimestamp
			: new Date(executedAtMs).toISOString();

	const preSplitBalance = toFiniteNumber(
		raw.preSplitBalance ?? raw.pre_split_balance ?? raw.previousBalance
	) ?? undefined;

	const postSplitBalance = toFiniteNumber(
		raw.postSplitBalance ?? raw.post_split_balance ?? raw.newBalance
	) ?? undefined;

	const txHash = typeof raw.txHash === 'string' ? raw.txHash : undefined;

	return {
		keyId: keyId.trim(),
		ratio,
		executedAt,
		preSplitBalance,
		postSplitBalance,
		txHash,
	};
}

/**
 * In-memory registry and pub-sub manager for key split events (#1151).
 */
export class KeySplitEventService extends BaseApiService {
	private readonly keyListeners = new Map<string, Set<SplitExecutedHandler>>();
	private readonly globalListeners = new Set<SplitExecutedHandler>();
	private readonly activeSplits = new Map<string, SplitExecutedEvent>();
	private socket: WebSocket | null = null;

	constructor() {
		super();
		this.initWebSocket();
	}

	private initWebSocket(): void {
		if (
			typeof window === 'undefined' ||
			typeof WebSocket === 'undefined' ||
			!env.VITE_WEBSOCKET_URL
		) {
			return;
		}

		try {
			this.socket = new WebSocket(env.VITE_WEBSOCKET_URL);
			this.socket.onmessage = event => {
				try {
					const data = JSON.parse(event.data);
					const normalized = normalizeSplitExecutedEvent(data);
					if (normalized) {
						this.emitSplitExecuted(normalized);
					}
				} catch {
					// Ignore invalid frames
				}
			};
		} catch {
			// WebSocket not available in this environment
		}
	}

	/**
	 * Emits a SplitExecuted event locally and notifies all subscribers.
	 */
	emitSplitExecuted(event: SplitExecutedEvent): void {
		// Cache if within 48h active window
		if (isSplitActive(event)) {
			this.activeSplits.set(event.keyId, event);
		}

		// Notify key-specific listeners
		const listeners = this.keyListeners.get(event.keyId);
		if (listeners) {
			listeners.forEach(handler => {
				try {
					handler(event);
				} catch (err) {
					console.error('Error in split event handler:', err);
				}
			});
		}

		// Notify global listeners
		this.globalListeners.forEach(handler => {
			try {
				handler(event);
			} catch (err) {
				console.error('Error in global split event handler:', err);
			}
		});
	}

	/**
	 * Subscribes to split events for a specific key (or '*' for all keys).
	 */
	subscribe(
		keyId: string,
		handler: SplitExecutedHandler
	): () => void {
		if (keyId === '*') {
			this.globalListeners.add(handler);
			return () => {
				this.globalListeners.delete(handler);
			};
		}

		let listeners = this.keyListeners.get(keyId);
		if (!listeners) {
			listeners = new Set();
			this.keyListeners.set(keyId, listeners);
		}
		listeners.add(handler);

		return () => {
			const current = this.keyListeners.get(keyId);
			if (current) {
				current.delete(handler);
				if (current.size === 0) {
					this.keyListeners.delete(keyId);
				}
			}
		};
	}

	/**
	 * Records a known split event manually (e.g. from an API response or test).
	 */
	recordSplit(split: SplitExecutedEvent): void {
		if (isSplitActive(split)) {
			this.activeSplits.set(split.keyId, split);
		}
	}

	/**
	 * Gets the active split event for a creator key, or null if expired/none.
	 */
	getActiveSplit(keyId: string): SplitExecutedEvent | null {
		const split = this.activeSplits.get(keyId);
		if (split && isSplitActive(split)) {
			return split;
		}
		if (split && !isSplitActive(split)) {
			this.activeSplits.delete(keyId);
		}
		return null;
	}

	/**
	 * Gets all active split events across all tracked creator keys.
	 */
	getAllActiveSplits(): SplitExecutedEvent[] {
		const results: SplitExecutedEvent[] = [];
		const now = Date.now();
		for (const [keyId, split] of this.activeSplits.entries()) {
			if (isSplitActive(split, now)) {
				results.push(split);
			} else {
				this.activeSplits.delete(keyId);
			}
		}
		return results;
	}

	/**
	 * Fetches the latest split for a key via the API if available.
	 */
	async fetchRecentSplit(keyId: string): Promise<SplitExecutedEvent | null> {
		try {
			const res = await this.api.get(`/keys/${keyId}/split`);
			const normalized = normalizeSplitExecutedEvent(res.data?.data ?? res.data);
			if (normalized && isSplitActive(normalized)) {
				this.recordSplit(normalized);
				return normalized;
			}
			return null;
		} catch {
			return this.getActiveSplit(keyId);
		}
	}

	/**
	 * Clears tracked splits and listeners for testing.
	 */
	reset(): void {
		this.keyListeners.clear();
		this.globalListeners.clear();
		this.activeSplits.clear();
	}
}

export const keySplitEventService = new KeySplitEventService();
