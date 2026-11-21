import { env } from '@/utils/env.utils';

/**
 * Real-time key-price feed over a single shared WebSocket (#1115).
 *
 * The backend broadcasts post-trade price ticks for creator keys; this module
 * owns one connection for the whole app, fans incoming ticks out to per-key
 * subscribers, and reconnects with exponential backoff when the socket drops.
 *
 * Degradation is deliberate: when `VITE_WEBSOCKET_URL` is unset (or the
 * runtime has no `WebSocket`, e.g. older test environments) the socket never
 * opens and `subscribe` returns a no-op — every consumer simply keeps showing
 * polled data, which stays the source of truth for history and stats.
 */

/** A single post-trade price tick for one creator key. */
export interface KeyPriceUpdate {
	/** Creator key this update belongs to. */
	keyId: string;
	/** Post-trade key price in stroops. */
	priceStroops: number;
	/** ISO timestamp of the trade that produced the update. */
	timestamp: string;
	/** Rolling 24h traded volume in stroops, when the server reports it. */
	volume24hStroops?: number | null;
	/** 24h price change percentage, when the server reports it. */
	change24h?: number | null;
}

export type KeyPriceUpdateHandler = (update: KeyPriceUpdate) => void;

/** Connection lifecycle exposed to the UI for the "Live" indicator. */
export type KeyPriceSocketStatus =
	| 'disabled'
	| 'connecting'
	| 'connected'
	| 'reconnecting';

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

function normalizeTimestamp(value: unknown): string {
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Date.parse(value);
		if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
	}

	const numeric = toFiniteNumber(value);
	if (numeric != null) {
		// Unix seconds are occasionally broadcast instead of milliseconds.
		const ms = numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
		const date = new Date(ms);
		if (!Number.isNaN(date.getTime())) return date.toISOString();
	}

	return new Date().toISOString();
}

/**
 * Normalizes an incoming WebSocket frame into a `KeyPriceUpdate`.
 *
 * Accepts flat payloads as well as `{ type, data }` event envelopes and the
 * handful of field aliases the feed has used so far. Returns `null` for
 * frames that don't describe a usable tick (missing key, unusable price).
 */
export function normalizeKeyPriceUpdate(value: unknown): KeyPriceUpdate | null {
	const envelope = asRecord(value);
	const raw = asRecord(envelope.data ?? envelope);

	const keyId = raw.keyId ?? raw.key_id ?? raw.creatorId ?? raw.creator_id;
	const priceStroops = toFiniteNumber(
		raw.priceStroops ?? raw.price_stroops ?? raw.price
	);

	if (
		typeof keyId !== 'string' ||
		keyId.trim() === '' ||
		priceStroops == null ||
		priceStroops <= 0
	) {
		return null;
	}

	return {
		keyId,
		priceStroops,
		timestamp: normalizeTimestamp(
			raw.timestamp ?? raw.createdAt ?? raw.created_at ?? raw.tradedAt
		),
		volume24hStroops: toFiniteNumber(
			raw.volume24hStroops ?? raw.volume24h_stroops ?? raw.volume24h
		),
		change24h: toFiniteNumber(raw.change24h ?? raw.change_24h),
	};
}

/** Minimal structural typing so tests can inject a fake socket. */
export interface WebSocketLike {
	readyState: number;
	send(data: string): void;
	close(): void;
	onopen: ((event: unknown) => void) | null;
	onmessage: ((event: { data: unknown }) => void) | null;
	onclose: ((event: unknown) => void) | null;
	onerror: ((event: unknown) => void) | null;
}

export type WebSocketFactory = (url: string) => WebSocketLike;

const OPEN_STATE = 1;

/** Reconnect delays double from 1s up to 30s between attempts. */
export const RECONNECT_BASE_DELAY_MS = 1_000;
export const RECONNECT_MAX_DELAY_MS = 30_000;

export class KeyPriceSocket {
	private readonly url: string | null;
	private readonly createWebSocket: WebSocketFactory | null;
	private readonly handlers = new Map<string, Set<KeyPriceUpdateHandler>>();
	private readonly statusListeners = new Set<
		(status: KeyPriceSocketStatus) => void
	>();

	private socket: WebSocketLike | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private reconnectAttempts = 0;
	private status: KeyPriceSocketStatus;

	constructor(
		url?: string | null,
		createWebSocket?: WebSocketFactory | null
	) {
		const resolvedUrl = url?.trim() || null;
		const defaultFactory: WebSocketFactory | null =
			typeof WebSocket !== 'undefined'
				? (target: string): WebSocketLike => new WebSocket(target) as unknown as WebSocketLike
				: null;

		this.url = resolvedUrl;
		this.createWebSocket = createWebSocket ?? defaultFactory;
		// Stays "disabled" until the first subscriber asks for a connection.
		this.status = 'disabled';
	}

	/** Whether the socket is configured and can ever connect. */
	get isEnabled(): boolean {
		return this.url !== null && this.createWebSocket !== null;
	}

	get currentStatus(): KeyPriceSocketStatus {
		return this.status;
	}

	/**
	 * Subscribes `handler` to price ticks for `keyId`, connecting (or
	 * re-subscribing server-side) as needed. Returns the unsubscribe fn.
	 */
	subscribe(keyId: string, handler: KeyPriceUpdateHandler): () => void {
		if (!this.isEnabled || !keyId) return () => {};

		let keyHandlers = this.handlers.get(keyId);
		const isFirstHandlerForKey = !keyHandlers || keyHandlers.size === 0;
		if (!keyHandlers) {
			keyHandlers = new Set();
			this.handlers.set(keyId, keyHandlers);
		}
		keyHandlers.add(handler);

		this.openIfNeeded();
		if (isFirstHandlerForKey && this.isOpen()) {
			this.sendSubscribe(keyId);
		}

		return () => {
			const current = this.handlers.get(keyId);
			if (!current) return;
			current.delete(handler);
			if (current.size === 0) {
				this.handlers.delete(keyId);
				this.sendUnsubscribe(keyId);
			}
			if (this.handlers.size === 0) {
				this.teardown();
			}
		};
	}

	/** Notifies `listener` of every status transition. */
	subscribeStatus(
		listener: (status: KeyPriceSocketStatus) => void
	): () => void {
		this.statusListeners.add(listener);
		listener(this.status);
		return () => {
			this.statusListeners.delete(listener);
		};
	}

	/** Closes the socket and drops every subscriber (page teardown/tests). */
	dispose(): void {
		this.handlers.clear();
		this.teardown();
	}

	private setStatus(next: KeyPriceSocketStatus): void {
		if (this.status === next) return;
		this.status = next;
		this.statusListeners.forEach(listener => listener(next));
	}

	private isOpen(): boolean {
		return this.socket != null && this.socket.readyState === OPEN_STATE;
	}

	private openIfNeeded(): void {
		if (!this.isEnabled || this.socket != null) return;

		this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');
		const socket = (this.createWebSocket as WebSocketFactory)(
			this.url as string
		);
		this.socket = socket;

		socket.onopen = () => {
			if (this.socket !== socket) return;
			this.reconnectAttempts = 0;
			this.setStatus('connected');
			// Re-subscribe every currently watched key after a reconnect.
			for (const keyId of this.handlers.keys()) {
				this.sendSubscribe(keyId);
			}
		};

		socket.onmessage = (event: { data: unknown }) => {
			if (this.socket !== socket) return;
			let parsed: unknown;
			try {
				parsed = JSON.parse(String(event.data));
			} catch {
				return; // Ignore frames that are not JSON.
			}
			const update = normalizeKeyPriceUpdate(parsed);
			if (!update) return;
			this.handlers.get(update.keyId)?.forEach(handler => handler(update));
		};

		socket.onerror = () => {
			// `onclose` always follows an error; reconnect logic lives there.
		};

		socket.onclose = () => {
			if (this.socket !== socket) return;
			this.socket = null;
			if (this.handlers.size === 0) {
				this.setStatus('disabled');
				return;
			}
			this.scheduleReconnect();
		};
	}

	private sendSubscribe(keyId: string): void {
		if (!this.isOpen()) return;
		this.socket?.send(JSON.stringify({ op: 'subscribe', topic: `key:${keyId}` }));
	}

	private sendUnsubscribe(keyId: string): void {
		if (!this.isOpen()) return;
		this.socket?.send(
			JSON.stringify({ op: 'unsubscribe', topic: `key:${keyId}` })
		);
	}

	private scheduleReconnect(): void {
		this.setStatus('reconnecting');
		const delay = Math.min(
			RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts,
			RECONNECT_MAX_DELAY_MS
		);
		this.reconnectAttempts += 1;

		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			this.openIfNeeded();
		}, delay);
	}

	private teardown(): void {
		if (this.reconnectTimer != null) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		this.reconnectAttempts = 0;
		if (this.socket) {
			this.socket.onopen = null;
			this.socket.onmessage = null;
			this.socket.onclose = null;
			this.socket.onerror = null;
			try {
				this.socket.close();
			} catch {
				// Already-closed sockets may throw; nothing else to do.
			}
			this.socket = null;
		}
		this.setStatus('disabled');
	}
}

/**
 * App-wide singleton. Disabled (no-op) until `VITE_WEBSOCKET_URL` is set.
 */
export const keyPriceSocket = new KeyPriceSocket(env.VITE_WEBSOCKET_URL);
