import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { fetchStakingPositions } from '@/services/stakingPositions.service';

/**
 * Active staking positions for a wallet (#921).
 *
 * Pulls from GET /users/:wallet/staking-positions so the profile page can
 * render lock status, claimable rewards, and current value for every key
 * the wallet currently has locked in the staking contract.
 */
export function useStakingPositions(address: string) {
	return useQuery({
		queryKey: queryKeys.wallet.stakingPositions(address),
		queryFn: () => fetchStakingPositions(address),
		enabled: !!address,
	});
}
