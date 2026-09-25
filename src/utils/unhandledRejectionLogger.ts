/**
 * Structured logging for unhandled promise rejections.
 *
 * Fire-and-forget async calls that live outside React (event handlers,
 * module-level warmup, detached timers) reject silently in production —
 * the React error boundary never sees them because it only catches errors
 * thrown during rendering, which is also why this handler cannot duplicate
 * boundary logs: the two failure classes are disjoint.
 *
 * Registered once at app initialisation (module scope in `main.tsx`), not
 * inside a component, so re-renders can never re-register it.
 */

export interface UnhandledRejectionLog {
	reason: string;
	promise_origin: string;
	rejected_at: string;
}

interface RegisterOptions {
	/**
	 * Suppresses log emission when true. Defaults to detecting Vitest via
	 * `import.meta.env.MODE === 'test'`; injectable so the logger itself
	 * can be tested.
	 */
	isTestEnv?: boolean;
}

let registered = false;

function describeReason(reason: unknown): string {
	if (reason instanceof Error) {
		return `${reason.name}: ${reason.message}`;
	}
	if (typeof reason === 'string') return reason;
	try {
		return JSON.stringify(reason);
	} catch {
		return String(reason);
	}
}

function describeOrigin(reason: unknown): string {
	if (reason instanceof Error && reason.stack) {
		// First stack frame below the error message — the rejection site
		const frame = reason.stack
			.split('\n')
			.slice(1)
			.map(line => line.trim())
			.find(line => line.length > 0);
		if (frame) return frame;
	}
	return 'unknown';
}

/**
 * Registers the `window.onunhandledrejection` handler. Safe to call more
 * than once — only the first call installs the handler.
 *
 * The handler never calls `preventDefault()`, so the browser's default
 * unhandled-rejection reporting is preserved.
 */
export function registerUnhandledRejectionLogger(
	options: RegisterOptions = {}
): void {
	const { isTestEnv = import.meta.env.MODE === 'test' } = options;

	if (registered) return;
	registered = true;

	window.onunhandledrejection = event => {
		if (isTestEnv) return;

		const log: UnhandledRejectionLog = {
			reason: describeReason(event.reason),
			promise_origin: describeOrigin(event.reason),
			rejected_at: new Date().toISOString(),
		};

		console.debug('[unhandled-rejection]', log);
	};
}

/** Test hook: unregister so each test starts from a clean slate. */
export function __resetUnhandledRejectionLogger(): void {
	registered = false;
	window.onunhandledrejection = null;
}
