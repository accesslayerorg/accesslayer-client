import { useAccount, useChainId } from 'wagmi';
import { defaultChain } from '@/lib/web3/wagmiConfig';

/**
 * Detects whether the connected wallet is on a different chain than the
 * app's configured default chain.
 *
 * Returns:
 *  - `isMismatch`      – true only when a wallet is connected AND its chain
 *                        does not match the app's default chain
 *  - `connectedChainId` – the chain ID reported by the wallet (undefined when
 *                         no wallet is connected)
 *  - `expectedChainId`  – the app's configured default chain ID
 *  - `expectedChainName` – human-readable name of the expected chain
 */
export function useNetworkMismatch() {
	const { isConnected } = useAccount();
	const connectedChainId = useChainId();

	const expectedChainId = defaultChain.id;
	const expectedChainName = defaultChain.name;

	const isMismatch = isConnected && connectedChainId !== expectedChainId;

	return {
		isMismatch,
		connectedChainId: isConnected ? connectedChainId : undefined,
		expectedChainId,
		expectedChainName,
	};
}
