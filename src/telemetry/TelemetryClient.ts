import type { TelemetryEvent, WorkerInMessage } from './types';

let sequence = 0;

function nextSeq(): number {
	return ++sequence;
}

function makeSessionId(): string {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// Singleton client
// ---------------------------------------------------------------------------

export class TelemetryClient {
	private worker: Worker | null = null;
	private sessionId: string = makeSessionId();
	private walletAddress: string | null = null;
	private buildId: string = import.meta.env?.VITE_BUILD_ID ?? 'dev';
	private visibilityHandler: (() => void) | null = null;

	init(): void {
		if (this.worker) return;
		try {
			this.worker = new Worker(
				new URL('../workers/telemetry.worker.ts', import.meta.url),
				{ type: 'module' },
			);
		} catch {
			// Workers are unavailable (e.g. unit-test environment) — fail silently.
			return;
		}

		this.visibilityHandler = () => {
			if (document.visibilityState === 'hidden') {
				this.postMessage({ kind: 'FLUSH_AND_BEACON' });
			}
		};
		document.addEventListener('visibilitychange', this.visibilityHandler);
	}

	destroy(): void {
		if (this.visibilityHandler) {
			document.removeEventListener('visibilitychange', this.visibilityHandler);
			this.visibilityHandler = null;
		}
		this.worker?.terminate();
		this.worker = null;
	}

	setWalletAddress(address: string | null): void {
		this.walletAddress = address;
	}

	track(event: TelemetryEvent): void {
		this.postMessage({
			kind: 'TRACK',
			event: {
				...event,
				sessionId: this.sessionId,
				walletAddress: this.walletAddress,
				buildId: this.buildId,
				timestamp: Date.now(),
				sequence: nextSeq(),
			},
		});
	}

	private postMessage(msg: WorkerInMessage): void {
		this.worker?.postMessage(msg);
	}
}

// Singleton instance shared across the app.
export const telemetryClient = new TelemetryClient();
