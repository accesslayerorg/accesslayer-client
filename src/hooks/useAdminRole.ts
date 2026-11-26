import { useStellarWallet } from '@/hooks/useStellarWallet';
import { isAdminWallet as isConfiguredAdminWallet } from '@/utils/adminAccess';

export interface UseAdminRoleResult {
	isAdminWallet: boolean;
	loading: boolean;
}

/** Admin access for the connected wallet, derived from the configured allowlist. */
export function useAdminRole(): UseAdminRoleResult {
	const { address, loading } = useStellarWallet();
	return {
		isAdminWallet: isConfiguredAdminWallet(address),
		loading,
	};
}

export default useAdminRole;
