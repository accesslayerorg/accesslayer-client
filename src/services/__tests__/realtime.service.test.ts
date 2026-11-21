import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	KeyPriceSocket,
	normalizeKeyPriceUpdate,
	RECONNECT_BASE_DELAY_MS,
	type WebSocketLike,
} from '../realtime.service';

/** Minimal controllable stand-in for the browser WebSocket. */
class FakeWebSocket implements WebSocketLike {
	readyState = 0;
	sent: string[] = [];
	closed = false;
	onopen: ((event: unknown) => void) | null = null;
	onmessage: ((event: { data: unknown }) => void) | null = null;
	onclose: ((event: unknown) => void) | null = null;
	onerror: ((event: unknown) => void) | null = null;

	constructor(public url: string) {}

	send(data: string): void {
		this.sent.push(data);
	}

	close(): void {
		this.closed = true;
		this.readyState = 3;
	}

	open(): void {
		this.readyState = 1;
		this.onopen?.(null);
	}

	emit(message: unknown): void {
		this.onmessage?.({ data: JSON.stringify(message) });
	}

	drop(): void {
		this.readyState = 3;
		this.onclose?.(null);
	}
}

describe('normalizeKeyPriceUpdate (#1115)', () => {
	it('normalizes a flat payload', () => {
		const update = normalizeKeyPriceUpdate({
			keyId: 'key-1',
			priceStroops: 12_500_000,
			timestamp: '2026-10-01T10:00:00Z',
			volume24hStroops: 400_000_000,
			change24h: 5.5,
		});

		expect(update).toEqual({
			keyId: 'key-1',
			priceStroops: 12_500_000,
			timestamp: '2026-10-01T10:00:00.000Z',
			volume24hStroops: 400_000_000,
			change24h: 5.5,
		});
	});

	it('unwraps a { type, data } event envelope', () => {
		const update = normalizeKeyPriceUpdate({
			type: 'price_update',
			data: { keyId: 'key-2', price: 2_000_000 },
		});

		expect(update?.keyId).toBe('key-2');
		expect(update?.priceStroops).toBe(2_000_000);
		// Missing timestamp falls back to "now" as an ISO string.
		expect(Number.isFinite(Date.parse(update?.timestamp ?? ''))).toBe(true);
	});

	it('accepts snake_case aliases and converts unix-second timestamps', () => {
		const update = normalizeKeyPriceUpdate({
			creator_id: 'key-3',
			price_stroops: '35000000',
			timestamp: 1_700_000_000, // unix seconds
		});

		expect(update?.keyId).toBe('key-3');
		expect(update?.priceStroops).toBe(35_000_000);
		expect(update?.timestamp).toBe('2023-11-14T22:13:20.000Z');
	});

	it('rejects frames without a usable key or price', () => {
		expect(normalizeKeyPriceUpdate(null)).toBeNull();
		expect(normalizeKeyPriceUpdate('nope')).toBeNull();
		expect(normalizeKeyPriceUpdate({ priceStroops: 1 })).toBeNull();
		expect(normalizeKeyPriceUpdate({ keyId: 'key-1' })).toBeNull();
		expect(
			normalizeKeyPriceUpdate({ keyId: 'key-1', priceStroops: -5 })
		).toBeNull();
		expect(
			normalizeKeyPriceUpdate({ keyId: 'key-1', priceStroops: 'abc' })
		).toBeNull();
	});
});

describe('KeyPriceSocket (#1115)', () => {
	let sockets: FakeWebSocket[];

	const createSocket = () =>
		new KeyPriceSocket('wss://test.example/keys', url => {
			const socket = new FakeWebSocket(url);
			sockets.push(socket);
			return socket;
		});

	beforeEach(() => {
		sockets = [];
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllTimers();
	});

	it('connects on first subscribe and sends a server subscribe frame', () => {
		const socket = createSocket();
		socket.subscribe('key-1', vi.fn());

		expect(sockets).toHaveLength(1);
		sockets[0].open();

		expect(sockets[0].sent).toContainEqual(
			JSON.stringify({ op: 'subscribe', topic: 'key:key-1' })
		);
		expect(socket.currentStatus).toBe('connected');
	});

	it('dispatches ticks only to handlers of the matching key', () => {
		const socket = createSocket();
		const key1Handler = vi.fn();
		const key2Handler = vi.fn();
		socket.subscribe('key-1', key1Handler);
		socket.subscribe('key-2', key2Handler);
		sockets[0].open();

		sockets[0].emit({
			type: 'price_update',
			keyId: 'key-1',
			priceStroops: 10_000_000,
		});

		expect(key1Handler).toHaveBeenCalledTimes(1);
		expect(key1Handler).toHaveBeenCalledWith(
			expect.objectContaining({ keyId: 'key-1', priceStroops: 10_000_000 })
		);
		expect(key2Handler).not.toHaveBeenCalled();
	});

	it('ignores malformed frames instead of throwing', () => {
		const socket = createSocket();
		const handler = vi.fn();
		socket.subscribe('key-1', handler);
		sockets[0].open();

		sockets[0].onmessage?.({ data: 'not json' });
		sockets[0].emit({ nonsense: true });

		expect(handler).not.toHaveBeenCalled();
	});

	it('stops delivering after unsubscribe and closes with the last handler', () => {
		const socket = createSocket();
		const handler = vi.fn();
		const unsubscribe = socket.subscribe('key-1', handler);
		sockets[0].open();

		unsubscribe();
		expect(sockets[0].sent).toContainEqual(
			JSON.stringify({ op: 'unsubscribe', topic: 'key:key-1' })
		);
		expect(sockets[0].closed).toBe(true);

		sockets[0].emit({
			keyId: 'key-1',
			priceStroops: 10_000_000,
		});
		expect(handler).not.toHaveBeenCalled();
	});

	it('reconnects with backoff after an unexpected close', () => {
		const socket = createSocket();
		socket.subscribe('key-1', vi.fn());
		sockets[0].open();

		sockets[0].drop();
		expect(socket.currentStatus).toBe('reconnecting');
		expect(sockets).toHaveLength(1);

		vi.advanceTimersByTime(RECONNECT_BASE_DELAY_MS);
		expect(sockets).toHaveLength(2);

		sockets[1].open();
		// Resubscribes previously watched keys on the new connection.
		expect(sockets[1].sent).toContainEqual(
			JSON.stringify({ op: 'subscribe', topic: 'key:key-1' })
		);
		expect(socket.currentStatus).toBe('connected');
	});

	it('never connects when no URL is configured', () => {
		let created = 0;
		const socket = new KeyPriceSocket(undefined, url => {
			created += 1;
			return new FakeWebSocket(url);
		});

		const unsubscribe = socket.subscribe('key-1', vi.fn());
		expect(created).toBe(0);
		expect(socket.currentStatus).toBe('disabled');
		expect(() => unsubscribe()).not.toThrow();
	});

	it('never connects when the runtime has no WebSocket implementation', () => {
		vi.stubGlobal('WebSocket', undefined);
		try {
			const socket = new KeyPriceSocket('wss://test.example/keys');
			socket.subscribe('key-1', vi.fn());
			expect(socket.isEnabled).toBe(false);
			expect(socket.currentStatus).toBe('disabled');
		} finally {
			vi.unstubAllGlobals();
		}
	});
});
