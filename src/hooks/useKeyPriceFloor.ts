import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { courseService, type KeyPriceFloor } from '@/services/course.service';

/**
 * Resolves the floor price in stroops from a KeyPriceFloor API payload (#1152).
 * Supports floorPriceStroops (primary) and conversion from floorPriceXlm / floorPrice.
 * Returns null if no active price floor is configured or value is non-positive.
 */
export function resolvePriceFloorStroops(
	priceFloor: KeyPriceFloor | null | undefined
): number | null {
	if (!priceFloor) return null;
	if (priceFloor.isActive === false) return null;

	if (
		typeof priceFloor.floorPriceStroops === 'number' &&
		priceFloor.floorPriceStroops > 0
	) {
		return priceFloor.floorPriceStroops;
	}

	if (
		typeof priceFloor.floorPriceXlm === 'number' &&
		priceFloor.floorPriceXlm > 0
	) {
		return Math.round(priceFloor.floorPriceXlm * 10_000_000);
	}

	if (
		typeof priceFloor.floorPrice === 'number' &&
		priceFloor.floorPrice > 0
	) {
		return priceFloor.floorPrice > 10_000
			? priceFloor.floorPrice
			: Math.round(priceFloor.floorPrice * 10_000_000);
	}

	return null;
}

/**
 * Evaluates whether the price floor is active and blocking sell trades (#1152).
 * The sell panel is disabled when current price <= floor price.
 */
export function isPriceFloorActive(
	spotPriceStroops: number | null | undefined,
	floorPriceStroops: number | null | undefined
): boolean {
	if (spotPriceStroops == null || floorPriceStroops == null) {
		return false;
	}
	if (floorPriceStroops <= 0) {
		return false;
	}
	return spotPriceStroops <= floorPriceStroops;
}

/**
 * Hook to fetch and watch the configured price floor for a key (#1152).
 * Refetches periodically so admin changes to the floor update live in the UI.
 */
export function useKeyPriceFloor(keyId: string) {
	return useQuery({
		queryKey: queryKeys.creators.priceFloor(keyId),
		queryFn: () => courseService.getKeyPriceFloor(keyId),
		enabled: !!keyId,
		staleTime: 30_000,
		refetchInterval: 30_000,
		retry: false,
	});
}
