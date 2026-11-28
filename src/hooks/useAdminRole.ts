import { useWallet } from '@/hooks/useWallet';
import { isAdminWallet } from '@/utils/adminAccess';

export function useAdminRole() {
	const { address, isConnected } = useWallet();
	return {
		isAdminWallet: isAdminWallet(address),
		loading: !isConnected && !address,
	};
}
