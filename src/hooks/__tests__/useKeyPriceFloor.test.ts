import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
	useKeyPriceFloor,
	resolvePriceFloorStroops,
	isPriceFloorActive,
} from '../useKeyPriceFloor';
import { courseService, type KeyPriceFloor } from '@/services/course.service';

vi.mock('@/services/course.service', () => ({
	courseService: {
		getKeyPriceFloor: vi.fn(),
	},
}));

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});
	return ({ children }: { children: React.ReactNode }) =>
		React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useKeyPriceFloor & utilities (#1152)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('resolvePriceFloorStroops', () => {
		it('returns null for null, undefined, or empty payload', () => {
			expect(resolvePriceFloorStroops(null)).toBeNull();
			expect(resolvePriceFloorStroops(undefined)).toBeNull();
		});

		it('returns null when isActive is explicitly false', () => {
			const payload: KeyPriceFloor = {
				floorPriceStroops: 2_000_000,
				isActive: false,
			};
			expect(resolvePriceFloorStroops(payload)).toBeNull();
		});

		it('resolves floorPriceStroops when provided', () => {
			const payload: KeyPriceFloor = {
				floorPriceStroops: 1_500_000,
				floorPriceXlm: 0.15,
				isActive: true,
			};
			expect(resolvePriceFloorStroops(payload)).toBe(1_500_000);
		});

		it('converts floorPriceXlm to stroops when floorPriceStroops is missing', () => {
			const payload: KeyPriceFloor = {
				floorPriceXlm: 0.25,
				isActive: true,
			};
			expect(resolvePriceFloorStroops(payload)).toBe(2_500_000);
		});

		it('resolves generic floorPrice correctly', () => {
			// Stroop magnitude (> 10_000)
			expect(
				resolvePriceFloorStroops({ floorPrice: 3_000_000, isActive: true })
			).toBe(3_000_000);

			// XLM magnitude (<= 10_000)
			expect(
				resolvePriceFloorStroops({ floorPrice: 0.5, isActive: true })
			).toBe(5_000_000);
		});

		it('returns null for non-positive or 0 values', () => {
			expect(resolvePriceFloorStroops({ floorPriceStroops: 0 })).toBeNull();
			expect(resolvePriceFloorStroops({ floorPriceXlm: -1 })).toBeNull();
		});
	});

	describe('isPriceFloorActive', () => {
		it('returns true when spot price is strictly less than floor price', () => {
			expect(isPriceFloorActive(1_000_000, 1_500_000)).toBe(true);
		});

		it('returns true when spot price is equal to floor price (price <= floor)', () => {
			expect(isPriceFloorActive(1_500_000, 1_500_000)).toBe(true);
		});

		it('returns false when spot price is greater than floor price', () => {
			expect(isPriceFloorActive(2_000_000, 1_500_000)).toBe(false);
		});

		it('returns false when floor price is null, undefined, or <= 0', () => {
			expect(isPriceFloorActive(1_000_000, null)).toBe(false);
			expect(isPriceFloorActive(1_000_000, undefined)).toBe(false);
			expect(isPriceFloorActive(1_000_000, 0)).toBe(false);
		});

		it('returns false when spot price is null or undefined', () => {
			expect(isPriceFloorActive(null, 1_500_000)).toBe(false);
			expect(isPriceFloorActive(undefined, 1_500_000)).toBe(false);
		});
	});

	describe('useKeyPriceFloor hook', () => {
		it('fetches price floor data for the given keyId', async () => {
			const mockData: KeyPriceFloor = {
				keyId: 'creator-42',
				floorPriceStroops: 1_200_000,
				isActive: true,
			};
			vi.mocked(courseService.getKeyPriceFloor).mockResolvedValueOnce(mockData);

			const { result } = renderHook(() => useKeyPriceFloor('creator-42'), {
				wrapper: createWrapper(),
			});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(courseService.getKeyPriceFloor).toHaveBeenCalledWith('creator-42');
			expect(result.current.data).toEqual(mockData);
		});

		it('handles null response when no price floor is configured', async () => {
			vi.mocked(courseService.getKeyPriceFloor).mockResolvedValueOnce(null);

			const { result } = renderHook(() => useKeyPriceFloor('creator-none'), {
				wrapper: createWrapper(),
			});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));
			expect(result.current.data).toBeNull();
		});
	});
});
