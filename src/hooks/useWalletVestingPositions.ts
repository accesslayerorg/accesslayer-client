import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { courseService } from '@/services/course.service';
import { queryKeys } from '@/lib/queryKeys';
import {
	resolveVestingSchedule,
	type VestingSchedule,
} from '@/utils/vestingSchedule.utils';
import type { KeyVestingSchedule } from '@/services/course.service';
import { ApiError } from '@/services/api.service';

/**
 * A single vesting position on the creator key portfolio page (#1018).
 *
 * `schedule` is always resolved (zeroed while loading or when a query
 * failed), so cards never have to guard against undefined amounts.
 */
export interface WalletVestingPosition {
	/** Creator key this position belongs to. */
	keyId: string;
	/** Display name of the creator key, when resolvable. */
	keyName: string | null;
	/** Wallet registered as the beneficiary of the allocation. */
	beneficiary: string | null;
	/** Raw ISO cliff timestamp, for the card's live countdown. */
	cliffAt: string | null;
	/** Raw ISO vesting-end timestamp, for the card's timeline. */
	endAt: string | null;
	/** Resolved vesting math (amounts, phase, progress, countdowns). */
	schedule: VestingSchedule;
}

/**
 * Whether a failed per-key query means "this key has no vesting schedule"
 * (a 404 — the normal case, most keys have none) as opposed to a real
 * failure that should be surfaced (#1018).
 */
export function isVestingScheduleMissing(error: unknown): boolean {
	return error instanceof ApiError && error.status === 404;
}

const EMPTY_SCHEDULE: VestingSchedule = resolveVestingSchedule({});

/**
 * Vesting positions across every creator key a wallet holds (#1018).
 *
 * Fan-out over `GET /keys/:keyId/vesting` — one query per holding, matching
 * the per-key API from #960. Keys without a schedule (404) drop out of the
 * list instead of rendering as errors; other failures degrade that key to a
 * zeroed schedule and set `isError` so the section can show a banner.
 */
export function useWalletVestingPositions(
	keyIds: string[],
	keyNames?: Record<string, string | undefined>
): {
	positions: WalletVestingPosition[];
	isLoading: boolean;
	isError: boolean;
	errors: Array<{ keyId: string; error: unknown }>;
} {
	const queries = useQueries({
		queries: (keyIds ?? []).map(keyId => ({
			queryKey: queryKeys.creators.vesting(keyId),
			queryFn: () => courseService.getKeyVesting(keyId),
			enabled: Boolean(keyId),
			staleTime: 30_000,
			retry: false,
		})),
	});

	const positions: WalletVestingPosition[] = [];
	const errors: Array<{ keyId: string; error: unknown }> = [];
	let isError = false;

	queries.forEach(
		(query: UseQueryResult<KeyVestingSchedule, Error>, index: number) => {
			const keyId = keyIds[index];
			if (!keyId) return;

			const keyName = keyNames?.[keyId] ?? null;

			if (query.error) {
				// A missing schedule is not a position — skip it silently.
				if (isVestingScheduleMissing(query.error)) return;
				isError = true;
				errors.push({ keyId, error: query.error });
				positions.push({
					keyId,
					keyName,
					beneficiary: null,
					cliffAt: null,
					endAt: null,
					schedule: EMPTY_SCHEDULE,
				});
				return;
			}

			positions.push({
				keyId,
				keyName,
				beneficiary: query.data?.beneficiary ?? null,
				cliffAt: query.data?.cliffAt ?? null,
				endAt: query.data?.endAt ?? null,
				schedule: query.data
					? resolveVestingSchedule({
							totalAllocation: query.data.totalAllocationXlm,
							claimedAmount: query.data.claimedAmountXlm,
							vestedAmount: query.data.vestedAmountXlm,
							claimableAmount: query.data.claimableXlm,
							startAt: query.data.startAt,
							cliffAt: query.data.cliffAt,
							endAt: query.data.endAt,
						})
					: EMPTY_SCHEDULE,
			});
		}
	);

	return {
		positions,
		isLoading: queries.some(query => query.isLoading),
		isError,
		errors,
	};
}

export default useWalletVestingPositions;
