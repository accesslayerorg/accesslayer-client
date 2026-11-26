import { useConsent } from '@/hooks/useConsent';

type SentrySdk = typeof import('@sentry/react');

let isEnabled = false;
let sentrySdk: SentrySdk | null = null;
let initialization: Promise<void> | null = null;

export async function setErrorReportingEnabled(
	enabled: boolean
): Promise<void> {
	isEnabled = enabled;

	if (!enabled) {
		const activeSdk = sentrySdk;
		sentrySdk = null;
		if (activeSdk) {
			try {
				await activeSdk.close(2_000);
			} catch (error) {
				console.error('Failed to close error reporting client:', error);
			}
		}
		return;
	}

	const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
	if (!dsn || sentrySdk) return;
	if (initialization) return initialization;

	initialization = import('@sentry/react')
		.then(sdk => {
			if (!isEnabled) return;
			sdk.init({ dsn });
			sentrySdk = sdk;
		})
		.catch(error => {
			console.error('Failed to initialize error reporting:', error);
		})
		.finally(() => {
			initialization = null;
		});

	return initialization;
}

export function captureException(
	error: unknown,
	context?: Record<string, unknown>
): void {
	if (
		!isEnabled ||
		!useConsent.getState().preferences?.errorReporting ||
		!sentrySdk
	) {
		return;
	}
	sentrySdk.captureException(error, context ? { extra: context } : undefined);
}
