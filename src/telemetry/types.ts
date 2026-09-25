// ---------------------------------------------------------------------------
// Per-event payloads
// ---------------------------------------------------------------------------

export interface PageLoadPayload {
	type: 'PageLoad';
	page: string;
	ttfb: number;
	dcl: number;
	lcp: number;
	fid: number;
	cls: number;
	loadComplete: number;
}

export interface ApiCallPayload {
	type: 'ApiCall';
	endpoint: string;
	method: string;
	durationMs: number;
	statusCode: number;
	cacheHit: boolean;
}

export interface SigningStepPayload {
	type: 'SigningStep';
	step: string;
	durationMs: number;
	signerType: string;
}

export interface ComponentErrorPayload {
	type: 'ComponentError';
	componentName: string;
	errorMessage: string;
	errorStack: string;
	buildId: string;
}

export interface UserActionPayload {
	type: 'UserAction';
	action: string;
	target: string;
	metadata: Record<string, unknown>;
}

export interface DroppedEventsPayload {
	type: 'DroppedEvents';
	count: number;
}

export type TelemetryEvent =
	| PageLoadPayload
	| ApiCallPayload
	| SigningStepPayload
	| ComponentErrorPayload
	| UserActionPayload;

// ---------------------------------------------------------------------------
// Envelope — fields present on every enveloped event
// ---------------------------------------------------------------------------

export interface TelemetryEnvelope {
	sessionId: string;
	walletAddress: string | null;
	buildId: string;
	timestamp: number;
	sequence: number;
}

export type EnvelopedEvent = TelemetryEnvelope & (TelemetryEvent | DroppedEventsPayload);

// ---------------------------------------------------------------------------
// Batch
// ---------------------------------------------------------------------------

export interface BatchHeader {
	lastDeliveredSequence: number;
	currentBatchStartSequence: number;
}

export interface TelemetryBatch {
	header: BatchHeader;
	events: EnvelopedEvent[];
}

// ---------------------------------------------------------------------------
// Worker messages
// ---------------------------------------------------------------------------

export type WorkerInMessage =
	| { kind: 'TRACK'; event: EnvelopedEvent }
	| { kind: 'FLUSH_AND_BEACON' }
	| { kind: 'SET_CONTEXT'; sessionId: string; walletAddress: string | null; buildId: string };
