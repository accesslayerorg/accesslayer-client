import { env } from '@/utils/env.utils';
import { BADGE_CATALOG, type WalletBadgeType } from '@/utils/walletBadges.utils';
import {
	RECONNECT_BASE_DELAY_MS,
	RECONNECT_MAX_DELAY_MS,
	type WebSocketFactory,
	type WebSocketLike,
} from './realtime.service';

/**
 * Wallet-scoped realtime badge events (#1222).
 *
 * The backend broadcasts `BadgeMinted` events for creator-key holders over the
 * app's WebSocket. This module owns the subscription for the connected wallet
 * and fans incoming events out to listeners.
 *
 * It is deliberately separate from the key-price socket in `realtime.service.ts`:
 * the two use different topic namespaces (`wallet:<address>` vs `key:<id>`) and
 * different lifecycles — the badge subscription lives for as long as a wallet
 * is connected, while the price socket is opened per key and torn down as soon
 * as the last key is unsubscribed.
 */

/** A badge mint event for one wallet. */
export interface BadgeMintedEvent {
	/** Wallet the badge was minted for. */
	wallet: string;
	/** Badge that was earned. */
	badgeType: WalletBadgeType;
	/** ISO timestamp of the mint. */
	earnedAt: string;
}

export type BadgeMintedHandler = (event: BadgeMintedEvent) => void;

/** Connection lifecycle exposed to the UI. */
export type BadgeSocketStatus =
	| 'disabled'
	| 'connecting'
	| 'connected'
	| 'reconnecting';

type UnknownRecord = Record<string, unknown>;

/** Badge types the client knows how to render. */
const KNOWN_BADGE_TYPES = new Set<string>(
	BADGE_CATALOG.map(badge => badge.id)
);

const OPEN_STATE = 1;

function asRecord(value: unknown): UnknownRecord {
	return typeof value === 'object' && value !== null
		? (value as UnknownRecord)
		: {};
}

function firstString(...values: unknown[]): string | null {
	for (const value of values) {
		if (typeof value === 'string' && value.trim() !== '') {
			return value.trim();
		}
	}
	return null;
}

function normalizeTimestamp(value: unknown): string {
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Date.parse(value);
		if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
	}

	const numeric = typeof value === 'number' ? value : Number(value);
	if (Number.isFinite(numeric)) {
		// Unix seconds are occasionally broadcast instead of milliseconds.
		const ms = numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
		const date = new Date(ms);
		if (!Number.isNaN(date.getTime())) return date.toISOString();
	}

	return new Date().toISOString();
}

/**
 * Resolves the badge type of an event.
 *
 * The badge can be named explicitly (`badgeType`, `badge`, `badgeId`) or, for
 * flat frames, by the frame type itself. Unknown types are ignored so a new
 * server-side badge never breaks the client.
 */
function resolveBadgeType(
	raw: UnknownRecord,
	envelope: UnknownRecord
): WalletBadgeType | null {
	const candidates = [
		raw.badgeType,
		raw.badge_type,
		raw.badgeId,
		raw.badge_id,
		raw.badge,
		envelope.badgeType,
		envelope.badge_type,
		raw.type,
		envelope.type,
	];

	for (const candidate of candidates) {
		if (
			typeof candidate === 'string' &&
			KNOWN_BADGE_TYPES.has(candidate)
		) {
			return candidate as WalletBadgeType;
		}
	}

	return null;
}

/**
 * Normalizes an incoming WebSocket frame into a {@link BadgeMintedEvent}.
 *
 * Accepts flat payloads as well as `{ type, data }` event envelopes and the
 * handful of field aliases the feed has used so far. Returns `null` for frames
 * that don't describe a usable badge mint (no wallet, or a badge type the
 * client cannot render).
 */
export function normalizeBadgeMintedEvent(
	value: unknown
): BadgeMintedEvent | null {
	const envelope = asRecord(value);
	const raw = asRecord(envelope.data ?? envelope);

	const wallet = firstString(
		raw.wallet,
		raw.walletAddress,
		raw.wallet_address,
		raw.address,
		raw.owner,
		raw.recipient
	);
	if (!wallet) return null;

	const badgeType = resolveBadgeType(raw, envelope);
	if (!badgeType) return null;

	return {
		wallet,
		badgeType,
		earnedAt: normalizeTimestamp(
			raw.earnedAt ?? raw.earned_at ?? raw.mintedAt ?? raw.timestamp ?? raw.createdAt
		),
	};
}

/**
 * App-wide wallet-scoped badge socket.
 *
 * Mirrors the lifecycle of the key-price socket: one shared connection, topic
 * subscriptions, and exponential-backoff reconnects.
 */
export class BadgeEventSocket {
	private readonly url: string | null;
	private readonly createWebSocket: WebSocketFactory | null;
	private readonly handlers = new Map<
		string,
		{ address: string; listeners: Set<BadgeMintedHandler> }
	>();
	private socket: WebSocketLike | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private reconnectAttempts = 0;
	private status: BadgeSocketStatus = 'disabled';

	constructor(
		url?: string | null,
		createWebSocket?: WebSocketFactory | null
	) {
		const resolvedUrl = url?.trim() || null;
		const defaultFactory: WebSocketFactory | null =
			typeof WebSocket !== 'undefined'
				? (target: string): WebSocketLike =>
						new WebSocket(target) as unknown as WebSocketLike
				: null;

		this.url = resolvedUrl;
		this.createWebSocket = createWebSocket ?? defaultFactory;
	}

	/** Whether the socket is configured and can ever connect. */
	get isEnabled(): boolean {
		return this.url !== null && this.createWebSocket !== null;
	}

	get currentStatus(): BadgeSocketStatus {
		return this.status;
	}

	/**
	 * Subscribes `handler` to badge events for `wallet`, connecting (or
	 * re-subscribing server-side) as needed. Returns the unsubscribe fn.
	 */
	subscribe(wallet: string, handler: BadgeMintedHandler): () => void {
		if (!this.isEnabled || !wallet) return () => {};

		// Handlers are keyed by the lower-cased address so an event that
		// reports a checksummed address still reaches the subscriber; the
		// original address is kept for the wire protocol.
		const key = wallet.toLowerCase();
		let entry = this.handlers.get(key);
		const isFirstHandlerForWallet = !entry || entry.listeners.size === 0;
		if (!entry) {
			entry = { address: wallet, listeners: new Set() };
			this.handlers.set(key, entry);
		}
		entry.listeners.add(handler);

		this.openIfNeeded();
		if (isFirstHandlerForWallet && this.isOpen()) {
			this.sendSubscribe(wallet);
		}

		return () => {
			const current = this.handlers.get(key);
			if (!current) return;
			current.listeners.delete(handler);
			if (current.listeners.size === 0) {
				this.handlers.delete(key);
				this.sendUnsubscribe(current.address);
			}
			if (this.handlers.size === 0) {
				this.teardown();
			}
		};
	}

	/** Closes the socket and drops every subscriber. */
	dispose(): void {
		this.handlers.clear();
		this.teardown();
	}

	private setStatus(next: BadgeSocketStatus): void {
		if (this.status === next) return;
		this.status = next;
	}

	private isOpen(): boolean {
		return this.socket != null && this.socket.readyState === OPEN_STATE;
	}

	private openIfNeeded(): void {
		if (!this.isEnabled || this.socket != null) return;

		this.setStatus(
			this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting'
		);
		const socket = (this.createWebSocket as WebSocketFactory)(
			this.url as string
		);
		this.socket = socket;

		socket.onopen = () => {
			if (this.socket !== socket) return;
			this.reconnectAttempts = 0;
			this.setStatus('connected');
			// Re-subscribe every watched wallet after a reconnect.
			for (const entry of this.handlers.values()) {
				this.sendSubscribe(entry.address);
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
			const badgeEvent = normalizeBadgeMintedEvent(parsed);
			if (!badgeEvent) return;
			this.handlers
				.get(badgeEvent.wallet.toLowerCase())
				?.listeners.forEach(handler => handler(badgeEvent));
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

	private sendSubscribe(wallet: string): void {
		if (!this.isOpen()) return;
		this.socket?.send(
			JSON.stringify({ op: 'subscribe', topic: `wallet:${wallet}` })
		);
	}

	private sendUnsubscribe(wallet: string): void {
		if (!this.isOpen()) return;
		this.socket?.send(
			JSON.stringify({ op: 'unsubscribe', topic: `wallet:${wallet}` })
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
export const badgeEventSocket = new BadgeEventSocket(env.VITE_WEBSOCKET_URL);
