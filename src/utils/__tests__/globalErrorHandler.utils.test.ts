import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
	initGlobalErrorHandler,
	handleGlobalError,
	markErrorAsCaught,
	wasErrorAlreadyCaught,
	emitStructuredLog,
	resetErrorTracking,
} from '@/utils/globalErrorHandler.utils';

describe('Global Error Handler', () => {
	beforeEach(() => {
		resetErrorTracking();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('initGlobalErrorHandler', () => {
		it('sets window.onerror to handleGlobalError', () => {
			initGlobalErrorHandler();
			expect(window.onerror).toBe(handleGlobalError);
		});

		it('does not throw when called multiple times', () => {
			initGlobalErrorHandler();
			expect(() => initGlobalErrorHandler()).not.toThrow();
			expect(window.onerror).toBe(handleGlobalError);
		});
	});

	describe('handleGlobalError', () => {
		it('does not emit a structured log for errors already caught by error boundary', () => {
			const error = new Error('Render error in creator list');
			markErrorAsCaught(error);

			const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const result = handleGlobalError('Render error in creator list', 'LandingPage.tsx', 852, 10, error);

			expect(logSpy).not.toHaveBeenCalled();
			expect(result).toBe(true); // Prevent default browser handling
		});

		it('emits a structured log for unhandled errors outside React', () => {
			const error = new Error('Timeout error in setTimeout callback');
			const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const result = handleGlobalError('Timeout error in setTimeout callback', 'app.js', 15, 3, error);

			expect(logSpy).toHaveBeenCalledWith('[Global Error Handler]', {
				message: 'Timeout error in setTimeout callback',
				source: 'app.js',
				line: 15,
				column: 3,
				error: {
					name: 'Error',
					message: 'Timeout error in setTimeout callback',
					stack: expect.any(String),
				},
				timestamp: expect.any(Number),
			});
			expect(result).toBe(false); // Allow default browser handling
		});

		it('does not emit duplicate structured logs for the same error identity', () => {
			const error = new Error('Duplicate error');
			const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			handleGlobalError('Duplicate error', 'app.js', 10, 5, error);
			handleGlobalError('Duplicate error', 'app.js', 10, 5, error);

			expect(logSpy).toHaveBeenCalledTimes(1);
		});

		it('emits structured logs for Error events without an Error object', () => {
			const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			handleGlobalError('Script error', 'unknown.js');

			expect(logSpy).toHaveBeenCalledWith('[Global Error Handler]', {
				message: 'Script error',
				source: 'unknown.js',
				line: undefined,
				column: undefined,
				error: null,
				timestamp: expect.any(Number),
			});
		});

		it('allows both unhandled and boundary-caught errors to work simultaneously without conflict', () => {
			const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Boundary catches an error
			const caughtError = new Error('Boundary caught error');
			markErrorAsCaught(caughtError);

			// An unrelated unhandled error occurs elsewhere
			const unhandledError = new Error('Unhandled timeout error');

			handleGlobalError('Unhandled timeout error', 'app.js', 15, 3, unhandledError);
			handleGlobalError('Boundary caught error', 'LandingPage.tsx', 852, 10, caughtError);

			// Only the unhandled error should be logged, once
			expect(logSpy).toHaveBeenCalledTimes(1);
			expect(logSpy).toHaveBeenCalledWith(
				'[Global Error Handler]',
				expect.objectContaining({
					error: expect.objectContaining({
						message: 'Unhandled timeout error',
					}),
				})
			);
		});

		it('handles string message errors without an Error object', () => {
			const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			handleGlobalError('String error message');

			expect(logSpy).toHaveBeenCalledTimes(1);
			expect(logSpy).toHaveBeenCalledWith(
				'[Global Error Handler]',
				expect.objectContaining({
					message: 'String error message',
					error: null,
				})
			);
		});
	});

	describe('emitStructuredLog', () => {
		it('outputs a structured error log with all fields', () => {
			const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const error = new Error('detailed error');

			emitStructuredLog({
				message: 'detailed error',
				source: 'test.js',
				lineno: 42,
				colno: 10,
				error,
				timestamp: 1234567890,
			});

			expect(logSpy).toHaveBeenCalledWith('[Global Error Handler]', {
				message: 'detailed error',
				source: 'test.js',
				line: 42,
				column: 10,
				error: {
					name: 'Error',
					message: 'detailed error',
					stack: error.stack,
				},
				timestamp: 1234567890,
			});
		});

		it('handles null error gracefully', () => {
			const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			emitStructuredLog({
				message: 'Script error',
				source: 'unknown.js',
				lineno: 0,
				colno: 0,
				error: undefined,
				timestamp: 1234567890,
			});

			expect(logSpy).toHaveBeenCalledWith('[Global Error Handler]', {
				message: 'Script error',
				source: 'unknown.js',
				line: 0,
				column: 0,
				error: null,
				timestamp: 1234567890,
			});
		});
	});

	describe('markErrorAsCaught and wasErrorAlreadyCaught', () => {
		it('correctly marks and identifies caught errors', () => {
			const error = new Error('test error');

			expect(wasErrorAlreadyCaught(error)).toBe(false);

			markErrorAsCaught(error);

			expect(wasErrorAlreadyCaught(error)).toBe(true);
		});

		it('identifies errors with same message and stack as caught', () => {
			const error1 = new Error('same error');
			const error2 = new Error('same error');

			// They should have the same stack (same line in test)
			error2.stack = error1.stack;

			markErrorAsCaught(error1);

			expect(wasErrorAlreadyCaught(error2)).toBe(true);
		});

		it('distinguishes different errors', () => {
			const error1 = new Error('error one');
			const error2 = new Error('error two');

			markErrorAsCaught(error1);

			expect(wasErrorAlreadyCaught(error2)).toBe(false);
		});

		it('marks errors as caught via the mock error boundary integration', () => {
			const error = new Error('Error caught by SectionErrorBoundary');
			markErrorAsCaught(error);

			expect(wasErrorAlreadyCaught(error)).toBe(true);
		});
	});
});
