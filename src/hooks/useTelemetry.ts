import { useCallback, useEffect } from 'react';
import { telemetryClient } from '@/telemetry/TelemetryClient';
import type { TelemetryEvent } from '@/telemetry/types';

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
	useEffect(() => {
		telemetryClient.init();
	}, []);

	const track = useCallback((event: TelemetryEvent): void => {
		telemetryClient.track(event);
	}, []);

	return { track };
}
