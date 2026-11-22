import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResolvedAddress, isFederationAddress } from '../useResolvedAddress';
import * as stellarService from '@/services/stellar';

const VALID_ACCOUNT_ID =
	'GB5XVAABEQMY63WTHDQ5RXADGYF345VWMNPTN2GFUDZT57D57ZQTJ7PS';

describe('useResolvedAddress', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		stellarService.clearFederationCache();
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('detects federation address format correctly', () => {
		expect(isFederationAddress('alice*example.com')).toBe(true);
		expect(isFederationAddress('bob*stellar.org')).toBe(true);
		expect(isFederationAddress('alice*')).toBe(false);
		expect(isFederationAddress('*example.com')).toBe(false);
		expect(isFederationAddress(VALID_ACCOUNT_ID)).toBe(false);
		expect(isFederationAddress('')).toBe(false);
	});

	it('bypasses resolution for raw public keys', () => {
		const spy = vi.spyOn(stellarService, 'resolveFederationAddress');

		const { result } = renderHook(() => useResolvedAddress(VALID_ACCOUNT_ID));

		expect(result.current.isFederation).toBe(false);
		expect(result.current.isResolving).toBe(false);
		expect(result.current.resolvedAddress).toBe(VALID_ACCOUNT_ID);
		expect(result.current.error).toBeNull();
		expect(spy).not.toHaveBeenCalled();
	});

	it('resolves a federation address after 300ms debounce', async () => {
		vi.spyOn(stellarService, 'resolveFederationAddress').mockResolvedValue(
			VALID_ACCOUNT_ID
		);

		const { result } = renderHook(() =>
			useResolvedAddress('alice*example.com')
		);

		expect(result.current.isFederation).toBe(true);
		expect(result.current.isResolving).toBe(true);
		expect(result.current.resolvedAddress).toBeNull();

		// Advance timer by 299ms - should still be resolving
		act(() => {
			vi.advanceTimersByTime(299);
		});
		expect(result.current.isResolving).toBe(true);
		expect(result.current.resolvedAddress).toBeNull();

		// Advance past 300ms
		await act(async () => {
			vi.advanceTimersByTime(1);
		});

		expect(result.current.isResolving).toBe(false);
		expect(result.current.resolvedAddress).toBe(VALID_ACCOUNT_ID);
		expect(result.current.error).toBeNull();
	});

	it('shows distinct error when address is not found', async () => {
		vi.spyOn(stellarService, 'resolveFederationAddress').mockRejectedValue(
			new stellarService.FederationError(
				'NOT_FOUND',
				'Federation address not found'
			)
		);

		const { result } = renderHook(() =>
			useResolvedAddress('unknown*example.com')
		);

		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		expect(result.current.isResolving).toBe(false);
		expect(result.current.resolvedAddress).toBeNull();
		expect(result.current.error).toBe('Federation address not found');
	});

	it('shows distinct error on network failure', async () => {
		vi.spyOn(stellarService, 'resolveFederationAddress').mockRejectedValue(
			new stellarService.FederationError(
				'NETWORK_ERROR',
				'Network error resolving address'
			)
		);

		const { result } = renderHook(() =>
			useResolvedAddress('bob*example.com')
		);

		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		expect(result.current.isResolving).toBe(false);
		expect(result.current.resolvedAddress).toBeNull();
		expect(result.current.error).toBe('Network error resolving address');
	});

	it('shows distinct error for invalid domain', async () => {
		vi.spyOn(stellarService, 'resolveFederationAddress').mockRejectedValue(
			new stellarService.FederationError(
				'INVALID_DOMAIN',
				'Invalid federation domain'
			)
		);

		const { result } = renderHook(() =>
			useResolvedAddress('bob*invalid..domain')
		);

		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		expect(result.current.isResolving).toBe(false);
		expect(result.current.resolvedAddress).toBeNull();
		expect(result.current.error).toBe('Invalid federation domain');
	});

	it('returns cached address immediately on repeat input', async () => {
		const spy = vi
			.spyOn(stellarService.FederationServer, 'resolve')
			.mockResolvedValue({ account_id: VALID_ACCOUNT_ID });

		const { result, rerender } = renderHook(
			({ input }) => useResolvedAddress(input),
			{ initialProps: { input: 'alice*example.com' } }
		);

		// First resolution
		await act(async () => {
			vi.advanceTimersByTime(300);
		});
		expect(result.current.resolvedAddress).toBe(VALID_ACCOUNT_ID);
		expect(spy).toHaveBeenCalledTimes(1);

		// Clear input
		rerender({ input: '' });
		expect(result.current.resolvedAddress).toBeNull();

		// Re-enter same address: hits cache immediately
		rerender({ input: 'alice*example.com' });
		expect(result.current.resolvedAddress).toBe(VALID_ACCOUNT_ID);
		expect(result.current.isResolving).toBe(false);
		expect(spy).toHaveBeenCalledTimes(1);
	});
});
