/**
 * Lightweight structured logger.
 *
 * Emits `console.debug` in development. Suppressed entirely in the test
 * environment (`import.meta.env.MODE === 'test'`) so test output stays
 * clean and assertions on `console.debug` remain unambiguous.
 */

type LogFields = Record<string, unknown>;

const isTestEnv = import.meta.env.MODE === 'test';

export const logger = {
	/**
	 * Emit a structured debug-level log. No-op in the test environment.
	 *
	 * @param message - Human-readable description of the event.
	 * @param fields  - Key/value pairs to attach to the log entry.
	 */
	debug(message: string, fields?: LogFields): void {
		if (isTestEnv) return;
		console.debug('[debug]', message, fields ?? {});
	},
};
