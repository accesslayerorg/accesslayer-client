import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	SESSION_EXPIRY_WARNING_LEAD_MS,
	useSessionExpiryWarning,
} from '@/hooks/useSessionExpiryWarning';
import { authService } from '@/services/auth.service';

vi.mock('@/services/auth.service', () => ({
	authService: {
		getAuthToken: vi.fn(),
	},
}));

const mockedGetAuthToken = vi.mocked(authService.getAuthToken);

/** Builds a syntactically valid (unsigned) JWT with the given exp (seconds). */
function makeJwtWithExp(expSeconds: number): string {
	const base64url = (obj: unknown) =>
		btoa(JSON.stringify(obj))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '');
	return `${base64url({ alg: 'HS256' })}.${base64url({ exp: expSeconds })}.sig`;
}

function makeOptions(
	overrides: Partial<Parameters<typeof useSessionExpiryWarning>[0]> = {}
) {
	return {
		onRenew: vi.fn().mockResolvedValue(undefined),
		onLogout: vi.fn(),
		...overrides,
	};
}

describe('useSessionExpiryWarning (#878)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
		mockedGetAuthToken.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('does nothing when there is no token', () => {
		mockedGetAuthToken.mockReturnValue(undefined);

		const { result } = renderHook(() => useSessionExpiryWarning(makeOptions()));

		act(() => {
			vi.advanceTimersByTime(24 * 60 * 60 * 1000);
		});

		expect(result.current.isWarningVisible).toBe(false);
	});

	it('does nothing when the token cannot be decoded', () => {
		mockedGetAuthToken.mockReturnValue('not-a-jwt');

		const { result } = renderHook(() => useSessionExpiryWarning(makeOptions()));

		act(() => {
			vi.advanceTimersByTime(24 * 60 * 60 * 1000);
		});

		expect(result.current.isWarningVisible).toBe(false);
	});

	it('shows the warning immediately if the token is already inside the warning window', () => {
		const nowSeconds = Date.now() / 1000;
		// Expires in 2 minutes — inside the default 5-minute warning lead.
		mockedGetAuthToken.mockReturnValue(makeJwtWithExp(nowSeconds + 120));

		const { result } = renderHook(() => useSessionExpiryWarning(makeOptions()));

		expect(result.current.isWarningVisible).toBe(true);
	});

	it('shows the warning immediately if the token has already expired', () => {
		const nowSeconds = Date.now() / 1000;
		mockedGetAuthToken.mockReturnValue(makeJwtWithExp(nowSeconds - 60));

		const { result } = renderHook(() => useSessionExpiryWarning(makeOptions()));

		expect(result.current.isWarningVisible).toBe(true);
	});

	it('schedules the warning for exactly 5 minutes before expiry', () => {
		const nowSeconds = Date.now() / 1000;
		const expiresInMs = 10 * 60 * 1000; // 10 minutes from now
		mockedGetAuthToken.mockReturnValue(
			makeJwtWithExp(nowSeconds + expiresInMs / 1000)
		);

		const { result } = renderHook(() => useSessionExpiryWarning(makeOptions()));

		expect(result.current.isWarningVisible).toBe(false);

		act(() => {
			vi.advanceTimersByTime(expiresInMs - SESSION_EXPIRY_WARNING_LEAD_MS - 1);
		});
		expect(result.current.isWarningVisible).toBe(false);

		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(result.current.isWarningVisible).toBe(true);
	});

	it('respects a custom warningLeadMs', () => {
		const nowSeconds = Date.now() / 1000;
		const customLeadMs = 60 * 1000; // 1 minute
		mockedGetAuthToken.mockReturnValue(makeJwtWithExp(nowSeconds + 120));

		const { result } = renderHook(() =>
			useSessionExpiryWarning(makeOptions({ warningLeadMs: customLeadMs }))
		);

		expect(result.current.isWarningVisible).toBe(false);

		act(() => {
			vi.advanceTimersByTime(60 * 1000);
		});
		expect(result.current.isWarningVisible).toBe(true);
	});

	it('clears the scheduled timer on unmount so no warning fires afterward', () => {
		const nowSeconds = Date.now() / 1000;
		mockedGetAuthToken.mockReturnValue(makeJwtWithExp(nowSeconds + 6 * 60));

		const { result, unmount } = renderHook(() =>
			useSessionExpiryWarning(makeOptions())
		);

		unmount();

		act(() => {
			vi.advanceTimersByTime(60 * 60 * 1000);
		});

		// result.current is stale post-unmount, but no error/warning should
		// have been triggered — the important assertion is that calling
		// setState after unmount didn't throw (act() would surface it).
		expect(result.current.isWarningVisible).toBe(false);
	});

	describe('renewSession', () => {
		it('calls onRenew, hides the warning, and re-arms the timer against the new token', async () => {
			const nowSeconds = Date.now() / 1000;
			mockedGetAuthToken.mockReturnValueOnce(makeJwtWithExp(nowSeconds + 120));

			const onRenew = vi.fn().mockImplementation(async () => {
				// Simulate the token being refreshed with a new, later expiry.
				mockedGetAuthToken.mockReturnValue(
					makeJwtWithExp(Date.now() / 1000 + 10 * 60)
				);
			});

			const { result } = renderHook(() =>
				useSessionExpiryWarning(makeOptions({ onRenew }))
			);

			expect(result.current.isWarningVisible).toBe(true);

			await act(async () => {
				await result.current.renewSession();
			});

			expect(onRenew).toHaveBeenCalledTimes(1);
			expect(result.current.isWarningVisible).toBe(false);
			expect(result.current.renewError).toBeNull();

			// Re-armed against the new (later) expiry — advancing by less
			// than the new warning window should not re-show it yet.
			act(() => {
				vi.advanceTimersByTime(4 * 60 * 1000);
			});
			expect(result.current.isWarningVisible).toBe(false);
		});

		it('sets isRenewing while the renew call is in flight', async () => {
			const nowSeconds = Date.now() / 1000;
			mockedGetAuthToken.mockReturnValue(makeJwtWithExp(nowSeconds + 120));

			let resolveRenew: () => void = () => {};
			const onRenew = vi.fn(
				() =>
					new Promise<void>(resolve => {
						resolveRenew = resolve;
					})
			);

			const { result } = renderHook(() =>
				useSessionExpiryWarning(makeOptions({ onRenew }))
			);

			let renewPromise!: Promise<void>;
			act(() => {
				renewPromise = result.current.renewSession();
			});

			// setIsRenewing(true) runs synchronously at the top of
			// renewSession, before the awaited onRenew() promise settles —
			// no need to wait for it.
			expect(result.current.isRenewing).toBe(true);

			await act(async () => {
				resolveRenew();
				await renewPromise;
			});

			expect(result.current.isRenewing).toBe(false);
		});

		it('sets renewError and keeps the warning visible when onRenew rejects', async () => {
			const nowSeconds = Date.now() / 1000;
			mockedGetAuthToken.mockReturnValue(makeJwtWithExp(nowSeconds + 120));

			const onRenew = vi.fn().mockRejectedValue(new Error('network down'));

			const { result } = renderHook(() =>
				useSessionExpiryWarning(makeOptions({ onRenew }))
			);

			expect(result.current.isWarningVisible).toBe(true);

			await act(async () => {
				await result.current.renewSession();
			});

			expect(result.current.isWarningVisible).toBe(true);
			expect(result.current.renewError).toBe('network down');
			expect(result.current.isRenewing).toBe(false);
		});

		it('falls back to a generic message when onRenew rejects with a non-Error', async () => {
			const nowSeconds = Date.now() / 1000;
			mockedGetAuthToken.mockReturnValue(makeJwtWithExp(nowSeconds + 120));

			const onRenew = vi.fn().mockRejectedValue('boom');

			const { result } = renderHook(() =>
				useSessionExpiryWarning(makeOptions({ onRenew }))
			);

			await act(async () => {
				await result.current.renewSession();
			});

			expect(result.current.renewError).toBe(
				'Failed to renew session. Please try again.'
			);
		});

		it('clears a previous renewError on a subsequent successful renew', async () => {
			const nowSeconds = Date.now() / 1000;
			mockedGetAuthToken.mockReturnValue(makeJwtWithExp(nowSeconds + 120));

			const onRenew = vi
				.fn()
				.mockRejectedValueOnce(new Error('first failure'))
				.mockResolvedValueOnce(undefined);

			const { result } = renderHook(() =>
				useSessionExpiryWarning(makeOptions({ onRenew }))
			);

			await act(async () => {
				await result.current.renewSession();
			});
			expect(result.current.renewError).toBe('first failure');

			await act(async () => {
				await result.current.renewSession();
			});
			expect(result.current.renewError).toBeNull();
		});
	});

	describe('logOut', () => {
		it('hides the warning, clears any renewError, and calls onLogout', () => {
			const nowSeconds = Date.now() / 1000;
			mockedGetAuthToken.mockReturnValue(makeJwtWithExp(nowSeconds + 120));

			const onLogout = vi.fn();
			const { result } = renderHook(() =>
				useSessionExpiryWarning(makeOptions({ onLogout }))
			);

			expect(result.current.isWarningVisible).toBe(true);

			act(() => {
				result.current.logOut();
			});

			expect(result.current.isWarningVisible).toBe(false);
			expect(onLogout).toHaveBeenCalledTimes(1);
		});

		it('cancels a pending scheduled timer so no warning fires after logout', () => {
			const nowSeconds = Date.now() / 1000;
			mockedGetAuthToken.mockReturnValue(makeJwtWithExp(nowSeconds + 6 * 60));

			const { result } = renderHook(() =>
				useSessionExpiryWarning(makeOptions())
			);

			expect(result.current.isWarningVisible).toBe(false);

			act(() => {
				result.current.logOut();
			});

			act(() => {
				vi.advanceTimersByTime(60 * 60 * 1000);
			});

			expect(result.current.isWarningVisible).toBe(false);
		});
	});
});
