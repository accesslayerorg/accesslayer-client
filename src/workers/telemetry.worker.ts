import { TelemetryBatcher } from '../telemetry/telemetryBatcher';
import type { TelemetryBatch, WorkerInMessage } from '../telemetry/types';

// ---------------------------------------------------------------------------
// Compression helpers
// ---------------------------------------------------------------------------

async function gzipBlob(payload: string): Promise<Blob> {
	if (typeof CompressionStream === 'undefined') {
		return new Blob([payload], { type: 'application/octet-stream' });
	}
	const stream = new CompressionStream('gzip');
	const writer = stream.writable.getWriter();
	await writer.write(new TextEncoder().encode(payload));
	await writer.close();
	const chunks: Uint8Array[] = [];
	const reader = stream.readable.getReader();
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		if (value) chunks.push(value);
	}
	return new Blob(chunks, { type: 'application/octet-stream' });
}

// ---------------------------------------------------------------------------
// Flush via fetch (normal path)
// ---------------------------------------------------------------------------

async function sendVisFetch(batch: TelemetryBatch): Promise<{ success: boolean }> {
	try {
		const blob = await gzipBlob(JSON.stringify(batch));
		const res = await fetch('/telemetry', {
			method: 'POST',
			headers: { 'Content-Encoding': 'gzip', 'Content-Type': 'application/octet-stream' },
			body: blob,
		});
		return { success: res.ok };
	} catch {
		return { success: false };
	}
}

// ---------------------------------------------------------------------------
// Flush via sendBeacon (page-unload path)
// ---------------------------------------------------------------------------

function sendViaBeacon(batch: TelemetryBatch): void {
	const payload = JSON.stringify(batch);
	const blob = new Blob([payload], { type: 'application/octet-stream' });
	navigator.sendBeacon('/telemetry', blob);
}

// ---------------------------------------------------------------------------
// Worker entrypoint
// ---------------------------------------------------------------------------

const batcher = new TelemetryBatcher(sendVisFetch, sendViaBeacon);
batcher.start();

self.addEventListener('message', (e: MessageEvent<WorkerInMessage>) => {
	const msg = e.data;
	if (msg.kind === 'TRACK') {
		batcher.add(msg.event);
	} else if (msg.kind === 'FLUSH_AND_BEACON') {
		batcher.flushAndBeacon();
	}
});
