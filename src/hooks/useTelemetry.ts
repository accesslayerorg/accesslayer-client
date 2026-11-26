import { useCallback, useEffect } from 'react';
import { telemetryClient } from '@/telemetry/TelemetryClient';
import type { TelemetryEvent } from '@/telemetry/types';
import { useConsent } from '@/hooks/useConsent';

export interface UseTelemetryResult {
	track: (event: TelemetryEvent) => void;
}

/**
 * Returns a stable `track` function that posts a telemetry event to the
 * Web Worker pipeline with zero synchronous work on the main thread.
 *
 * The client is initialised lazily on the first mount so the worker is not
 * spawned until the app actually needs telemetry.
 */
export function useTelemetry(): UseTelemetryResult {
	const analyticsEnabled = useConsent(
		state => state.preferences?.analytics ?? false
	);

	useEffect(() => {
		if (analyticsEnabled) {
			telemetryClient.init();
		} else {
			telemetryClient.destroy();
		}
	}, [analyticsEnabled]);

	const track = useCallback((event: TelemetryEvent): void => {
		if (
			event.type === 'ComponentError' ||
			!useConsent.getState().preferences?.analytics
		) {
			return;
		}
		telemetryClient.track(event);
	}, []);

	return { track };
}
