import type { EnvelopedEvent, TelemetryBatch } from './types';

export const BATCH_SIZE_LIMIT = 50;
export const FLUSH_INTERVAL_MS = 5_000;
export const MAX_RETAINED_EVENTS = 500;

export interface FlushResult {
	success: boolean;
}

export type OnFlush = (batch: TelemetryBatch) => Promise<FlushResult>;
export type OnBeacon = (batch: TelemetryBatch) => void;

/**
 * Core batcher extracted from the worker so it can be unit-tested
 * without instantiating a real Web Worker.
 *
 * Responsibilities:
 *  - Buffer incoming events and flush every FLUSH_INTERVAL_MS or at BATCH_SIZE_LIMIT.
 *  - Retain failed batches and prepend them to the next flush (at-least-once delivery).
 *  - Cap retained events at MAX_RETAINED_EVENTS; drop oldest, inserting a DroppedEvents sentinel.
 *  - Track the last successfully delivered sequence number for gap detection.
 *  - Provide a synchronous flushAndBeacon() path for page-unload delivery.
 */
export class TelemetryBatcher {
	private readonly onFlush: OnFlush;
	private readonly onBeacon: OnBeacon;
	private pending: EnvelopedEvent[] = [];
	private retained: EnvelopedEvent[] = [];
	private lastDeliveredSequence = 0;
	private flushTimer: ReturnType<typeof setInterval> | null = null;
	private flushing = false;

	constructor(onFlush: OnFlush, onBeacon: OnBeacon) {
		this.onFlush = onFlush;
		this.onBeacon = onBeacon;
	}

	start(): void {
		if (this.flushTimer != null) return;
		this.flushTimer = setInterval(() => {
			void this.flush();
		}, FLUSH_INTERVAL_MS);
	}

	stop(): void {
		if (this.flushTimer != null) {
			clearInterval(this.flushTimer);
			this.flushTimer = null;
		}
	}

	add(event: EnvelopedEvent): void {
		this.pending.push(event);
		if (this.pending.length >= BATCH_SIZE_LIMIT) {
			void this.flush();
		}
	}

	async flush(): Promise<void> {
		if (this.flushing) return;
		this.flushing = true;
		try {
			const events: EnvelopedEvent[] = [...this.retained, ...this.pending];
			this.pending = [];
			this.retained = [];

			if (events.length === 0) return;

			const batch = this.makeBatch(events);
			const result = await this.onFlush(batch);

			if (result.success) {
				const last = events[events.length - 1];
				if (last) this.lastDeliveredSequence = last.sequence;
			} else {
				this.retainEvents(events);
			}
		} finally {
			this.flushing = false;
		}
	}

	flushAndBeacon(): void {
		const events: EnvelopedEvent[] = [...this.retained, ...this.pending];
		this.pending = [];
		this.retained = [];

		if (events.length === 0) return;

		this.onBeacon(this.makeBatch(events));
	}

	// -------------------------------------------------------------------------

	private makeBatch(events: EnvelopedEvent[]): TelemetryBatch {
		return {
			header: {
				lastDeliveredSequence: this.lastDeliveredSequence,
				currentBatchStartSequence: events[0]?.sequence ?? 0,
			},
			events,
		};
	}

	private retainEvents(failed: EnvelopedEvent[]): void {
		const combined = [...failed, ...this.pending];
		this.pending = [];

		if (combined.length <= MAX_RETAINED_EVENTS) {
			this.retained = combined;
			return;
		}

		const dropCount = combined.length - MAX_RETAINED_EVENTS + 1;
		const sentinel: EnvelopedEvent = {
			type: 'DroppedEvents',
			count: dropCount,
			sessionId: combined[0]?.sessionId ?? '',
			walletAddress: combined[0]?.walletAddress ?? null,
			buildId: combined[0]?.buildId ?? '',
			timestamp: Date.now(),
			sequence: 0,
		};
		this.retained = [sentinel, ...combined.slice(dropCount)];
	}
}
