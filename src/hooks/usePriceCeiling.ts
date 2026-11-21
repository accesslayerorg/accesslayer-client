import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	creatorKeysContractService,
	type PriceCeilingInfo,
} from '@/services/creatorKeysContract.service';
import { useNowMs } from '@/hooks/useNowMs';

export type { PriceCeilingInfo };

export function normalizeCooloffTimestamp(
	value: number | string | null | undefined
): number | null {
	if (value == null) return null;

	if (typeof value === 'number') {
		return Number.isFinite(value) ? (value > 1e11 ? value : value * 1000) : null;
	}

	const parsed = new Date(value).getTime();
	return Number.isNaN(parsed) ? null : parsed;
}

export function getCeilingCooloffRemainingSeconds(
	ceiling: PriceCeilingInfo | null | undefined,
	nowMs: number = Date.now()
): number {
	if (!ceiling?.isActive) return 0;

	const endsAtMs = normalizeCooloffTimestamp(ceiling.cooloffEndsAt);
	if (endsAtMs == null) return 0;

	return Math.max(0, Math.ceil((endsAtMs - nowMs) / 1000));
}

export function isCeilingCooloffActive(
	ceiling: PriceCeilingInfo | null | undefined,
	nowMs: number = Date.now()
): boolean {
	return getCeilingCooloffRemainingSeconds(ceiling, nowMs) > 0;
}

export function usePriceCeiling(keyId: string) {
	const nowMs = useNowMs(1000);
	const query = useQuery<PriceCeilingInfo | null>({
		queryKey: queryKeys.creators.priceCeiling(keyId),
		queryFn: () => creatorKeysContractService.getPriceCeiling(keyId),
		enabled: Boolean(keyId),
		staleTime: 30_000,
		refetchInterval: 30_000,
		retry: false,
	});

	const cooloffRemainingSeconds = getCeilingCooloffRemainingSeconds(
		query.data,
		nowMs
	);

	return {
		...query,
		cooloffRemainingSeconds,
		isCooloffActive: cooloffRemainingSeconds > 0,
	};
}
