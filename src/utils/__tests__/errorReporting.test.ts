import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	captureException,
	setErrorReportingEnabled,
} from '@/utils/errorReporting';
import { useConsent } from '@/hooks/useConsent';

const sentry = vi.hoisted(() => ({
	init: vi.fn(),
	close: vi.fn().mockResolvedValue(true),
	captureException: vi.fn(),
}));

vi.mock('@sentry/react', () => sentry);

describe('error reporting consent', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		sentry.close.mockResolvedValue(true);
		localStorage.clear();
		useConsent.setState({
			preferences: { analytics: false, errorReporting: false },
			preferencesOpen: false,
		});
		vi.stubEnv(
			'VITE_SENTRY_DSN',
			'https://public@example.ingest.sentry.io/1'
		);
		await setErrorReportingEnabled(false);
	});

	it('does not initialize or report errors without consent', () => {
		captureException(new Error('private'));

		expect(sentry.init).not.toHaveBeenCalled();
		expect(sentry.captureException).not.toHaveBeenCalled();
	});

	it('initializes Sentry and captures errors only after error-reporting consent', async () => {
		useConsent.getState().savePreferences({
			analytics: false,
			errorReporting: true,
		});
		await setErrorReportingEnabled(true);
		const error = new Error('consented');
		captureException(error, { component: 'app' });

		expect(sentry.init).toHaveBeenCalledWith({
			dsn: 'https://public@example.ingest.sentry.io/1',
		});
		expect(sentry.captureException).toHaveBeenCalledWith(error, {
			extra: { component: 'app' },
		});
	});

	it('closes Sentry and stops sending reports when consent is revoked', async () => {
		useConsent.getState().savePreferences({
			analytics: false,
			errorReporting: true,
		});
		await setErrorReportingEnabled(true);
		useConsent.getState().savePreferences({
			analytics: false,
			errorReporting: false,
		});
		await setErrorReportingEnabled(false);
		captureException(new Error('revoked'));

		expect(sentry.close).toHaveBeenCalledWith(2_000);
		expect(sentry.captureException).not.toHaveBeenCalled();
	});
});
