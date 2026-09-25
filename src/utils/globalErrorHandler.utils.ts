/**
 * Global error handler utilities to prevent duplicate error logging
 * between React error boundaries and window.onerror.
 *
 * Architecture:
 * - React error boundaries call `markErrorAsCaught(error)` in componentDidCatch
 * - The global `window.onerror` handler checks if the error was already caught
 * - If caught, the handler silently returns true (preventing default browser handling)
 * - If not caught, it emits a structured log for the genuine unhandled error
 * - Duplicate identity detection prevents the same error from being logged more than once
 */

interface StructuredErrorLog {
	message: string | Event;
	source?: string;
	lineno?: number;
	colno?: number;
	error?: Error;
	timestamp: number;
}

/** Generate a unique identity for an error based on its message and stack. */
function getErrorIdentity(error: Error): string {
	return `${error.message}::${error.stack ?? ''}`;
}

/** Track error identities already caught by React error boundaries. */
const caughtErrorIds = new Set<string>();

/** Track error identities already processed by the global handler (prevents duplicates). */
const processedErrorIds = new Set<string>();

/**
 * Register an error as already caught by a React error boundary.
 * The global error handler will skip this error to avoid duplicate logs.
 */
export function markErrorAsCaught(error: Error): void {
	caughtErrorIds.add(getErrorIdentity(error));
}

/**
 * Check if an error was already caught by a React error boundary.
 */
export function wasErrorAlreadyCaught(error: Error): boolean {
	return caughtErrorIds.has(getErrorIdentity(error));
}

/**
 * Emit a structured error log with all relevant metadata.
 * Testable in isolation by spying on console.error.
 */
export function emitStructuredLog(log: StructuredErrorLog): void {
	console.error('[Global Error Handler]', {
		message: log.message,
		source: log.source,
		line: log.lineno,
		column: log.colno,
		error: log.error
			? {
					name: log.error.name,
					message: log.error.message,
					stack: log.error.stack,
				}
			: null,
		timestamp: log.timestamp,
	});
}

/**
 * Handle a global error event.
 * - If the error was already caught by a React error boundary, skip it and return true
 * - If the error is a duplicate (same identity already processed), skip it and return true
 * - Otherwise, emit a structured log for the genuine unhandled error
 *
 * @returns true to prevent default browser error handling, false otherwise.
 */
export function handleGlobalError(
	message: string | Event,
	source?: string,
	lineno?: number,
	colno?: number,
	error?: Error
): boolean {
	// Skip errors already caught by React error boundaries
	if (error && wasErrorAlreadyCaught(error)) {
		return true;
	}

	// Skip duplicate errors (same identity already processed)
	if (error) {
		const identity = getErrorIdentity(error);
		if (processedErrorIds.has(identity)) {
			return true;
		}
		processedErrorIds.add(identity);
	}

	// Emit structured log for genuine unhandled errors
	emitStructuredLog({
		message,
		source,
		lineno,
		colno,
		error,
		timestamp: Date.now(),
	});

	return false;
}

/**
 * Initialize the global error handler on window.onerror.
 * Should be called once at application startup (e.g., in main.tsx).
 */
export function initGlobalErrorHandler(): void {
	window.onerror = handleGlobalError;
}

/**
 * Clear all tracked error identities.
 * Useful in tests to reset state between test cases.
 */
export function resetErrorTracking(): void {
	caughtErrorIds.clear();
	processedErrorIds.clear();
}
