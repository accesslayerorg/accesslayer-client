import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { fetchWrapperPosition } from '@/services/wrapper.service'

/**
 * Reads the wrapper position (share balance, shares per key, total wrapped supply)
 * for a given key ID.
 * 
 * @param keyId - The creator key ID
 * @returns Wrapper position data including share balance, shares per key, and total supply
 */
export function useWrapperPosition(keyId: string) {
  return useQuery({
    queryKey: queryKeys.wrapper.byKey(keyId),
    queryFn: () => fetchWrapperPosition(keyId),
    enabled: !!keyId,
    staleTime: 60_000,
  })
}

/** Query key factory for wrapper positions */
export namespace queryKeys {
  export const wrapper = {
    byKey: (keyId: string) => ['wrapper', 'position', keyId] as const,
    allKeys: () => ['wrapper', 'all'] as const,
    byWallet: (wallet: string) => ['wrapper', 'wallet', wallet] as const,
  }
}