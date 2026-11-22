import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	BadgeEventSocket,
	normalizeBadgeMintedEvent,
} from '../badgeEvents.service';
import type { WebSocketLike } from '../realtime.service';

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

describe('normalizeBadgeMintedEvent (#1222)', () => {
	it('normalizes a flat payload', () => {
		const event = normalizeBadgeMintedEvent({
			wallet: '0xabc',
			badgeType: 'first-key',
			earnedAt: '2026-10-01T10:00:00Z',
		});

		expect(event).toEqual({
			wallet: '0xabc',
			badgeType: 'first-key',
			earnedAt: '2026-10-01T10:00:00.000Z',
		});
	});

	it('unwraps a { type, data } event envelope', () => {
		const event = normalizeBadgeMintedEvent({
			type: 'BadgeMinted',
			data: { wallet: '0xabc', badge: 'whale' },
		});

		expect(event?.wallet).toBe('0xabc');
		expect(event?.badgeType).toBe('whale');
		expect(Number.isFinite(Date.parse(event?.earnedAt ?? ''))).toBe(true);
	});

	it('accepts field aliases and snake_case badge types', () => {
		const event = normalizeBadgeMintedEvent({
			walletAddress: '0xdef',
			badge_type: 'top-trader',
		});

		expect(event?.wallet).toBe('0xdef');
		expect(event?.badgeType).toBe('top-trader');
	});

	it('reads the badge type from a flat frame type', () => {
		const event = normalizeBadgeMintedEvent({
			type: 'referrer',
			wallet: '0xabc',
		});

		expect(event?.badgeType).toBe('referrer');
	});

	it('rejects frames without a wallet', () => {
		expect(normalizeBadgeMintedEvent(null)).toBeNull();
		expect(normalizeBadgeMintedEvent('nope')).toBeNull();
		expect(normalizeBadgeMintedEvent({ badgeType: 'whale' })).toBeNull();
	});

	it('rejects badge types the client cannot render', () => {
		expect(
			normalizeBadgeMintedEvent({ wallet: '0xabc', badgeType: 'unknown-badge' })
		).toBeNull();
		expect(
			normalizeBadgeMintedEvent({ type: 'price_update', keyId: 'key-1' })
		).toBeNull();
	});
});

describe('BadgeEventSocket (#1222)', () => {
	let sockets: FakeWebSocket[];

	const createSocket = () =>
		new BadgeEventSocket('wss://test.example/events', url => {
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

	it('connects on first subscribe and sends a wallet subscribe frame', () => {
		const socket = createSocket();
		socket.subscribe('0xabc', vi.fn());

		expect(sockets).toHaveLength(1);
		sockets[0].open();

		expect(sockets[0].sent).toContainEqual(
			JSON.stringify({ op: 'subscribe', topic: 'wallet:0xabc' })
		);
		expect(socket.currentStatus).toBe('connected');
	});

	it('dispatches badge events only to handlers of the matching wallet', () => {
		const socket = createSocket();
		const firstHandler = vi.fn();
		const secondHandler = vi.fn();
		socket.subscribe('0xabc', firstHandler);
		socket.subscribe('0xdef', secondHandler);
		sockets[0].open();

		sockets[0].emit({
			type: 'BadgeMinted',
			data: { wallet: '0xabc', badgeType: 'whale' },
		});

		expect(firstHandler).toHaveBeenCalledTimes(1);
		expect(firstHandler).toHaveBeenCalledWith(
			expect.objectContaining({ wallet: '0xabc', badgeType: 'whale' })
		);
		expect(secondHandler).not.toHaveBeenCalled();
	});

	it('ignores malformed frames instead of throwing', () => {
		const socket = createSocket();
		const handler = vi.fn();
		socket.subscribe('0xabc', handler);
		sockets[0].open();

		sockets[0].onmessage?.({ data: 'not json' });
		sockets[0].emit({ nonsense: true });

		expect(handler).not.toHaveBeenCalled();
	});

	it('stops delivering after unsubscribe and closes with the last handler', () => {
		const socket = createSocket();
		const handler = vi.fn();
		const unsubscribe = socket.subscribe('0xabc', handler);
		sockets[0].open();

		unsubscribe();
		expect(sockets[0].sent).toContainEqual(
			JSON.stringify({ op: 'unsubscribe', topic: 'wallet:0xabc' })
		);
		expect(sockets[0].closed).toBe(true);

		sockets[0].emit({ wallet: '0xabc', badgeType: 'whale' });
		expect(handler).not.toHaveBeenCalled();
	});

	it('never connects when no URL is configured', () => {
		let created = 0;
		const socket = new BadgeEventSocket(undefined, url => {
			created += 1;
			return new FakeWebSocket(url);
		});

		const unsubscribe = socket.subscribe('0xabc', vi.fn());
		expect(created).toBe(0);
		expect(socket.currentStatus).toBe('disabled');
		expect(() => unsubscribe()).not.toThrow();
	});
});
