import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('logger', () => {
	beforeEach(() => {
		vi.spyOn(console, 'debug').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('suppresses console.debug in the test environment (MODE=test)', async () => {
		// Vitest sets import.meta.env.MODE to 'test' automatically.
		// Re-import the logger fresh so the module-level isTestEnv check runs.
		// We use a dynamic import with a cache-busting approach via vi.resetModules.
		vi.resetModules();
		const { logger } = await import('@/utils/logger');

		logger.debug('should be suppressed', { key: 'value' });

		expect(console.debug).not.toHaveBeenCalled();
	});

	it('exposes a debug method that accepts a message and optional fields', async () => {
		// The logger module itself is importable and has the right shape.
		vi.resetModules();
		const { logger } = await import('@/utils/logger');

		expect(logger.debug).toBeTypeOf('function');
		// Calling it should not throw in any environment.
		expect(() => logger.debug('test message', { a: 1 })).not.toThrow();
		expect(() => logger.debug('test message')).not.toThrow();
	});
});
