import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConsent } from '@/hooks/useConsent';
import type { TelemetryEvent } from '@/telemetry/types';

const telemetryClient = vi.hoisted(() => ({
	init: vi.fn(),
	destroy: vi.fn(),
	track: vi.fn(),
}));

vi.mock('@/telemetry/TelemetryClient', () => ({
	telemetryClient,
}));

import { useTelemetry } from '@/hooks/useTelemetry';

describe('useTelemetry consent gating', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		useConsent.setState({ preferences: null, preferencesOpen: false });
	});

	it('does not initialize analytics or track events before opt-in', () => {
		const { result } = renderHook(() => useTelemetry());

		act(() => {
			result.current.track({
				type: 'UserAction',
				action: 'click',
				target: 'test',
				metadata: {},
			});
		});

		expect(telemetryClient.init).not.toHaveBeenCalled();
		expect(telemetryClient.track).not.toHaveBeenCalled();
	});

	it('starts analytics and tracks events only after analytics consent', () => {
		const { result } = renderHook(() => useTelemetry());
		const event: TelemetryEvent = {
			type: 'UserAction',
			action: 'click',
			target: 'test',
			metadata: {},
		};

		act(() => {
			useConsent.getState().savePreferences({
				analytics: true,
				errorReporting: false,
			});
		});
		act(() => result.current.track(event));

		expect(telemetryClient.init).toHaveBeenCalledTimes(1);
		expect(telemetryClient.track).toHaveBeenCalledWith(event);
	});

	it('keeps analytics events disabled when only error reporting is accepted', () => {
		const { result } = renderHook(() => useTelemetry());

		act(() => {
			useConsent.getState().savePreferences({
				analytics: false,
				errorReporting: true,
			});
		});
		act(() =>
			result.current.track({
				type: 'UserAction',
				action: 'click',
				target: 'test',
				metadata: {},
			})
		);

		expect(telemetryClient.init).not.toHaveBeenCalled();
		expect(telemetryClient.track).not.toHaveBeenCalled();
	});
});
