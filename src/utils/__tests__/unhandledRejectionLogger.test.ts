import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	__resetUnhandledRejectionLogger,
	registerUnhandledRejectionLogger,
} from '@/utils/unhandledRejectionLogger';

function dispatchRejection(reason: unknown) {
	const preventDefault = vi.fn();
	const event = {
		reason,
		promise: Promise.resolve(),
		preventDefault,
	} as unknown as PromiseRejectionEvent;

	window.onunhandledrejection?.call(window, event);
	return { preventDefault };
}

describe('unhandledRejectionLogger (#647)', () => {
	let debugSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		__resetUnhandledRejectionLogger();
		debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
	});

	afterEach(() => {
		debugSpy.mockRestore();
		__resetUnhandledRejectionLogger();
	});

	it('registers a window.onunhandledrejection handler', () => {
		expect(window.onunhandledrejection).toBeNull();
		registerUnhandledRejectionLogger({ isTestEnv: false });
		expect(typeof window.onunhandledrejection).toBe('function');
	});

	it('registers only once — later calls do not replace the handler', () => {
		registerUnhandledRejectionLogger({ isTestEnv: false });
		const firstHandler = window.onunhandledrejection;

		registerUnhandledRejectionLogger({ isTestEnv: false });
		expect(window.onunhandledrejection).toBe(firstHandler);

		dispatchRejection(new Error('boom'));
		expect(debugSpy).toHaveBeenCalledTimes(1);
	});

	it('emits a structured log with reason, promise_origin and rejected_at', () => {
		registerUnhandledRejectionLogger({ isTestEnv: false });

		dispatchRejection(new Error('payment fetch failed'));

		expect(debugSpy).toHaveBeenCalledWith(
			'[unhandled-rejection]',
			expect.objectContaining({
				reason: 'Error: payment fetch failed',
				promise_origin: expect.any(String),
				rejected_at: expect.stringMatching(
					/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
				),
			})
		);
	});

	it('derives promise_origin from the error stack when available', () => {
		registerUnhandledRejectionLogger({ isTestEnv: false });

		dispatchRejection(new Error('with stack'));

		const [, log] = debugSpy.mock.calls[0];
		expect((log as { promise_origin: string }).promise_origin).not.toBe(
			'unknown'
		);
	});

	it('handles non-Error rejection reasons', () => {
		registerUnhandledRejectionLogger({ isTestEnv: false });

		dispatchRejection('plain string reason');

		expect(debugSpy).toHaveBeenCalledWith(
			'[unhandled-rejection]',
			expect.objectContaining({
				reason: 'plain string reason',
				promise_origin: 'unknown',
			})
		);
	});

	it('does not suppress default browser behaviour', () => {
		registerUnhandledRejectionLogger({ isTestEnv: false });

		const { preventDefault } = dispatchRejection(new Error('boom'));

		expect(preventDefault).not.toHaveBeenCalled();
	});

	it('emits nothing in the test environment (default detection)', () => {
		// Vitest sets import.meta.env.MODE to 'test', so the default
		// registration path must stay silent.
		registerUnhandledRejectionLogger();

		dispatchRejection(new Error('should not be logged'));

		expect(debugSpy).not.toHaveBeenCalled();
	});

	it('emits one log per rejection', () => {
		registerUnhandledRejectionLogger({ isTestEnv: false });

		dispatchRejection(new Error('first'));
		dispatchRejection(new Error('second'));

		expect(debugSpy).toHaveBeenCalledTimes(2);
	});
});
