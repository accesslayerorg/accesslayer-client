import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	BATCH_SIZE_LIMIT,
	FLUSH_INTERVAL_MS,
	TelemetryBatcher,
} from '../telemetryBatcher';
import type { EnvelopedEvent, TelemetryBatch } from '../types';

function makeEvent(sequence: number, sessionId = 'sess-1'): EnvelopedEvent {
	return {
		type: 'UserAction',
		action: 'click',
		target: 'button',
		metadata: {},
		sessionId,
		walletAddress: null,
		buildId: 'test',
		timestamp: Date.now(),
		sequence,
	};
}

function makeSuccessFlush() {
	return vi.fn<[TelemetryBatch], Promise<{ success: boolean }>>().mockResolvedValue({ success: true });
}

function makeFailFlush() {
	return vi.fn<[TelemetryBatch], Promise<{ success: boolean }>>().mockResolvedValue({ success: false });
}

describe('TelemetryBatcher batching', () => {
	beforeEach(() => { vi.useFakeTimers(); });
	afterEach(() => { vi.useRealTimers(); });

	it('does not flush before BATCH_SIZE_LIMIT is reached', async () => {
		const onFlush = makeSuccessFlush();
		const batcher = new TelemetryBatcher(onFlush, vi.fn());
		batcher.start();

		for (let i = 0; i < BATCH_SIZE_LIMIT - 1; i++) {
			batcher.add(makeEvent(i + 1));
		}
		await Promise.resolve();

		expect(onFlush).not.toHaveBeenCalled();
		batcher.stop();
	});

	it('flushes immediately when BATCH_SIZE_LIMIT events are added', async () => {
		const onFlush = makeSuccessFlush();
		const batcher = new TelemetryBatcher(onFlush, vi.fn());
		batcher.start();

		for (let i = 0; i < BATCH_SIZE_LIMIT; i++) {
			batcher.add(makeEvent(i + 1));
		}
		// Settle the async flush without running the interval timer forever
		await Promise.resolve();
		await Promise.resolve();

		expect(onFlush).toHaveBeenCalledTimes(1);
		const batch = onFlush.mock.calls[0][0];
		expect(batch.events).toHaveLength(BATCH_SIZE_LIMIT);
		batcher.stop();
	});

	it('flushes after FLUSH_INTERVAL_MS elapses with fewer than BATCH_SIZE_LIMIT events', async () => {
		const onFlush = makeSuccessFlush();
		const batcher = new TelemetryBatcher(onFlush, vi.fn());
		batcher.start();

		batcher.add(makeEvent(1));
		batcher.add(makeEvent(2));

		expect(onFlush).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

		expect(onFlush).toHaveBeenCalledTimes(1);
		expect(onFlush.mock.calls[0][0].events).toHaveLength(2);
		batcher.stop();
	});

	it('does not flush when the pending queue is empty', async () => {
		const onFlush = makeSuccessFlush();
		const batcher = new TelemetryBatcher(onFlush, vi.fn());
		batcher.start();

		await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

		expect(onFlush).not.toHaveBeenCalled();
		batcher.stop();
	});

	it('flushes multiple times across intervals', async () => {
		const onFlush = makeSuccessFlush();
		const batcher = new TelemetryBatcher(onFlush, vi.fn());
		batcher.start();

		batcher.add(makeEvent(1));
		await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

		batcher.add(makeEvent(2));
		await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

		expect(onFlush).toHaveBeenCalledTimes(2);
		batcher.stop();
	});
});

describe('TelemetryBatcher batch header', () => {
	beforeEach(() => { vi.useFakeTimers(); });
	afterEach(() => { vi.useRealTimers(); });

	it('sets currentBatchStartSequence to the first event sequence', async () => {
		const onFlush = makeSuccessFlush();
		const batcher = new TelemetryBatcher(onFlush, vi.fn());
		batcher.start();

		batcher.add(makeEvent(7));
		batcher.add(makeEvent(8));
		await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

		expect(onFlush.mock.calls[0][0].header.currentBatchStartSequence).toBe(7);
		batcher.stop();
	});

	it('sets lastDeliveredSequence to 0 before any successful flush', async () => {
		const onFlush = makeSuccessFlush();
		const batcher = new TelemetryBatcher(onFlush, vi.fn());
		batcher.start();

		batcher.add(makeEvent(1));
		await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

		expect(onFlush.mock.calls[0][0].header.lastDeliveredSequence).toBe(0);
		batcher.stop();
	});

	it('reports the correct lastDeliveredSequence after a successful flush', async () => {
		const onFlush = makeSuccessFlush();
		const batcher = new TelemetryBatcher(onFlush, vi.fn());
		batcher.start();

		batcher.add(makeEvent(1));
		batcher.add(makeEvent(2));
		await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

		batcher.add(makeEvent(3));
		await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

		const secondBatch = onFlush.mock.calls[1][0];
		expect(secondBatch.header.lastDeliveredSequence).toBe(2);
		batcher.stop();
	});

	it('reports a sequence gap in the batch header after a failed flush', async () => {
		const onFlush = vi.fn()
			.mockResolvedValueOnce({ success: true })
			.mockResolvedValueOnce({ success: false })
			.mockResolvedValue({ success: true });

		const batcher = new TelemetryBatcher(onFlush, vi.fn());
		batcher.start();

		// First batch: seq 1-2, succeeds
		batcher.add(makeEvent(1));
		batcher.add(makeEvent(2));
		await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

		// Second batch: seq 3-4, fails
		batcher.add(makeEvent(3));
		batcher.add(makeEvent(4));
		await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

		// Third batch: seq 5 + retained 3-4, the header must reflect the gap
		batcher.add(makeEvent(5));
		await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

		const thirdBatch = onFlush.mock.calls[2][0];
		// lastDeliveredSequence is still 2 (the last successful one)
		expect(thirdBatch.header.lastDeliveredSequence).toBe(2);
		// retained events are prepended so currentBatchStartSequence is 3
		expect(thirdBatch.header.currentBatchStartSequence).toBe(3);
		// batch contains retained (3,4) + new (5)
		expect(thirdBatch.events).toHaveLength(3);
		batcher.stop();
	});
});

describe('TelemetryBatcher failed flush retention', () => {
	beforeEach(() => { vi.useFakeTimers(); });
	afterEach(() => { vi.useRealTimers(); });

	it('retains events from a failed flush and prepends them to the next batch', async () => {
		const onFlush = vi.fn()
			.mockResolvedValueOnce({ success: false })
			.mockResolvedValue({ success: true });

		const batcher = new TelemetryBatcher(onFlush, vi.fn());
		batcher.start();

		batcher.add(makeEvent(1));
		batcher.add(makeEvent(2));
		await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

		batcher.add(makeEvent(3));
		await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

		const secondBatch = onFlush.mock.calls[1][0];
		const seqs = secondBatch.events.map((e: EnvelopedEvent) => e.sequence);
		// Retained events come first
		expect(seqs).toEqual([1, 2, 3]);
		batcher.stop();
	});

	it('does not update lastDeliveredSequence after a failed flush', async () => {
		const onFlush = vi.fn()
			.mockResolvedValueOnce({ success: false })
			.mockResolvedValue({ success: true });

		const batcher = new TelemetryBatcher(onFlush, vi.fn());
		batcher.start();

		batcher.add(makeEvent(1));
		await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

		batcher.add(makeEvent(2));
		await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

		const secondBatch = onFlush.mock.calls[1][0];
		expect(secondBatch.header.lastDeliveredSequence).toBe(0);
		batcher.stop();
	});

	it('drops oldest events and inserts a DroppedEvents sentinel when cap is exceeded', async () => {
		const onFlush = makeFailFlush();
		const batcher = new TelemetryBatcher(onFlush, vi.fn());
		// No start() — use manual flush() calls to avoid timer complexity

		let seq = 0;
		// Add 49 events per cycle (below BATCH_SIZE_LIMIT so no auto-flush),
		// then flush manually. After enough cycles retained > MAX_RETAINED_EVENTS
		// and the sentinel appears in the next batch sent to onFlush.
		for (let b = 0; b <= 12; b++) {
			for (let i = 0; i < 49; i++) batcher.add(makeEvent(++seq));
			await batcher.flush();
		}

		const batchWithSentinel = onFlush.mock.calls.find(([b]) =>
			b.events.some((e: EnvelopedEvent) => e.type === 'DroppedEvents'),
		);
		expect(batchWithSentinel).toBeDefined();
		const sentinel = batchWithSentinel![0].events.find(
			(e: EnvelopedEvent) => e.type === 'DroppedEvents',
		);
		expect((sentinel as { count: number }).count).toBeGreaterThan(0);
	});
});

describe('TelemetryBatcher flushAndBeacon', () => {
	it('calls onBeacon with all pending events', () => {
		const onBeacon = vi.fn();
		const batcher = new TelemetryBatcher(makeSuccessFlush(), onBeacon);

		batcher.add(makeEvent(1));
		batcher.add(makeEvent(2));
		batcher.add(makeEvent(3));
		batcher.flushAndBeacon();

		expect(onBeacon).toHaveBeenCalledTimes(1);
		const batch: TelemetryBatch = onBeacon.mock.calls[0][0];
		expect(batch.events).toHaveLength(3);
	});

	it('does not call onBeacon when there are no events', () => {
		const onBeacon = vi.fn();
		const batcher = new TelemetryBatcher(makeSuccessFlush(), onBeacon);

		batcher.flushAndBeacon();

		expect(onBeacon).not.toHaveBeenCalled();
	});

	it('includes retained events from a previous failed flush in the beacon batch', async () => {
		vi.useFakeTimers();

		const onFlush = makeFailFlush();
		const onBeacon = vi.fn();
		const batcher = new TelemetryBatcher(onFlush, onBeacon);
		batcher.start();

		batcher.add(makeEvent(1));
		batcher.add(makeEvent(2));
		await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

		batcher.add(makeEvent(3));
		batcher.flushAndBeacon();

		const batch: TelemetryBatch = onBeacon.mock.calls[0][0];
		const seqs = batch.events.map((e: EnvelopedEvent) => e.sequence);
		expect(seqs).toEqual([1, 2, 3]);

		batcher.stop();
		vi.useRealTimers();
	});

	it('sets currentBatchStartSequence from the first retained event', async () => {
		vi.useFakeTimers();

		const onFlush = makeFailFlush();
		const onBeacon = vi.fn();
		const batcher = new TelemetryBatcher(onFlush, onBeacon);
		batcher.start();

		batcher.add(makeEvent(5));
		await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS);

		batcher.add(makeEvent(6));
		batcher.flushAndBeacon();

		const batch: TelemetryBatch = onBeacon.mock.calls[0][0];
		expect(batch.header.currentBatchStartSequence).toBe(5);

		batcher.stop();
		vi.useRealTimers();
	});
});

describe('TelemetryBatcher track() performance', () => {
	it('add() completes in under 0.1ms (zero synchronous work)', () => {
		const batcher = new TelemetryBatcher(makeSuccessFlush(), vi.fn());
		const event = makeEvent(1);

		const start = performance.now();
		batcher.add(event);
		const elapsed = performance.now() - start;

		expect(elapsed).toBeLessThan(0.1);
	});
});
