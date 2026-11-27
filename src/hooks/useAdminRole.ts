import { useStellarWallet } from '@/hooks/useStellarWallet';
import { isAdminWallet } from '@/utils/adminAccess';

export function useAdminRole() {
	const { address, isConnected, loading } = useStellarWallet();

	return {
		isAdminWallet: isConnected && isAdminWallet(address),
		loading,
	};
}
