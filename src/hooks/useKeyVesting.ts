import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { courseService } from '@/services/course.service';
import {
	resolveVestingSchedule,
	type VestingSchedule,
	type VestingScheduleInput,
} from '@/utils/vestingSchedule.utils';

/**
 * Maps a `KeyVestingSchedule` API payload onto the shape the pure
 * {@link resolveVestingSchedule} helper expects.
 */
function toVestingInput(
	schedule: Awaited<ReturnType<typeof courseService.getKeyVesting>> | undefined
): VestingScheduleInput {
	return {
		totalAllocation: schedule?.totalAllocationXlm,
		claimedAmount: schedule?.claimedAmountXlm,
		vestedAmount: schedule?.vestedAmountXlm,
		claimableAmount: schedule?.claimableXlm,
		startAt: schedule?.startAt,
		cliffAt: schedule?.cliffAt,
		endAt: schedule?.endAt,
	};
}

/**
 * Creator vesting schedule for a key (#960).
 *
 * Returns the raw API payload plus the derived progress numbers the panel
 * renders: vested/claimable amounts, percentages, and the current phase of the
 * schedule. The query is disabled until both a `keyId` and a `wallet` are
 * known, since the amounts are wallet-scoped.
 */
export function useKeyVesting(
	keyId: string | undefined,
	wallet: string | undefined
) {
	const query = useQuery({
		queryKey: queryKeys.creators.vesting(keyId ?? ''),
		queryFn: () => courseService.getKeyVesting(keyId!, wallet),
		enabled: Boolean(keyId && wallet),
		staleTime: 30_000,
		retry: false,
	});

	const vesting: VestingSchedule = resolveVestingSchedule(
		toVestingInput(query.data)
	);

	return { ...query, vesting };
}

/**
 * Claim history for a creator's vested allocation (#960).
 *
 * Populated by the backend from the claim transactions; after a successful
 * claim the vesting query family is invalidated so the panel's history and
 * claimable amount refresh together.
 */
export function useKeyVestingClaims(
	keyId: string | undefined,
	wallet: string | undefined
) {
	return useQuery({
		queryKey: queryKeys.creators.vestingClaims(keyId ?? '', wallet ?? ''),
		queryFn: () => courseService.getKeyVestingClaims(keyId!, wallet!),
		enabled: Boolean(keyId && wallet),
		staleTime: 30_000,
		retry: false,
	});
}
