/**
 * Freeze resolution and expiry lifecycle tests (#1121).
 *
 * The hook must derive an active freeze from the creator record, return null
 * when the key is not frozen (or the expiry already passed), and force a
 * re-render at the expiry moment so the banner auto-dismisses and trading
 * controls re-enable without a page reload.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	DEFAULT_FREEZE_REASON,
	resolveKeyFreeze,
	useKeyFreeze,
} from '@/hooks/useKeyFreeze';

const NOW = Date.parse('2026-10-18T12:00:00.000Z');

describe('resolveKeyFreeze', () => {
	it('returns null when the key is not frozen', () => {
		expect(resolveKeyFreeze(undefined, NOW)).toBeNull();
		expect(resolveKeyFreeze(null, NOW)).toBeNull();
		expect(resolveKeyFreeze({ isFrozen: false }, NOW)).toBeNull();
	});

	it('resolves an indefinite freeze without an expiry', () => {
		expect(
			resolveKeyFreeze(
				{
					isFrozen: true,
					freezeReason: 'Under investigation',
					freezeExpiresAt: null,
				},
				NOW
			)
		).toEqual({
			reason: 'Under investigation',
			expiresAt: null,
			expiresAtMs: null,
		});
	});

	it('falls back to a default reason when none is provided', () => {
		const freeze = resolveKeyFreeze({ isFrozen: true }, NOW);
		expect(freeze?.reason).toBe(DEFAULT_FREEZE_REASON);
	});

	it('parses an expiry timestamp into epoch milliseconds', () => {
		const expiresAt = '2026-10-18T13:00:00.000Z';
		const freeze = resolveKeyFreeze(
			{ isFrozen: true, freezeExpiresAt: expiresAt },
			NOW
		);
		expect(freeze?.expiresAt).toBe(expiresAt);
		expect(freeze?.expiresAtMs).toBe(Date.parse(expiresAt));
	});

	it('treats an already-passed expiry as unfrozen', () => {
		expect(
			resolveKeyFreeze(
				{ isFrozen: true, freezeExpiresAt: '2026-10-18T11:59:59.000Z' },
				NOW
			)
		).toBeNull();
	});

	it('treats an unparsable expiry as indefinite', () => {
		const freeze = resolveKeyFreeze(
			{ isFrozen: true, freezeExpiresAt: 'not-a-date' },
			NOW
		);
		expect(freeze).not.toBeNull();
		expect(freeze?.expiresAtMs).toBeNull();
	});
});

describe('useKeyFreeze', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(NOW));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns null while the key is not frozen', () => {
		const { result } = renderHook(() => useKeyFreeze({ isFrozen: false }));
		expect(result.current).toBeNull();
	});

	it('auto-dismisses once the freeze expiry is reached', () => {
		const expiresAt = '2026-10-18T12:00:30.000Z';
		const { result } = renderHook(() =>
			useKeyFreeze({
				isFrozen: true,
				freezeReason: 'Suspicious activity review',
				freezeExpiresAt: expiresAt,
			})
		);

		expect(result.current?.reason).toBe('Suspicious activity review');
		expect(result.current?.expiresAtMs).toBe(Date.parse(expiresAt));

		act(() => {
			vi.advanceTimersByTime(30_000);
		});

		expect(result.current).toBeNull();
	});

	it('keeps an indefinite freeze active as time passes', () => {
		const { result } = renderHook(() =>
			useKeyFreeze({ isFrozen: true, freezeExpiresAt: null })
		);

		act(() => {
			vi.advanceTimersByTime(5 * 60_000);
		});

		expect(result.current).not.toBeNull();
	});

	it('re-arms clamped timers until a far-future expiry lands', () => {
		const farFutureMs = NOW + 40 * 24 * 60 * 60 * 1000;
		const { result } = renderHook(() =>
			useKeyFreeze({
				isFrozen: true,
				freezeExpiresAt: new Date(farFutureMs).toISOString(),
			})
		);

		// A single setTimeout cannot hold a 40-day delay (32-bit cap), so the
		// hook clamps and re-arms; the freeze must survive the first tick.
		act(() => {
			vi.advanceTimersByTime(2_147_483_647);
		});
		expect(result.current).not.toBeNull();

		act(() => {
			vi.advanceTimersByTime(farFutureMs - NOW - 2_147_483_647);
		});
		expect(result.current).toBeNull();
	});
});
