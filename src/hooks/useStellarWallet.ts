import { useEffect, useState } from 'react';
import { Networks } from '@stellar/stellar-sdk';
import { useSigner } from '@/hooks/useSigner';
import { env } from '@/utils/env.utils';

const networkPassphrase =
	env.VITE_STELLAR_NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

export interface UseStellarWalletResult {
	address?: string;
	isConnected: boolean;
	loading: boolean;
	activeSigner: ReturnType<typeof useSigner>['activeSigner'];
}

export function useStellarWallet(): UseStellarWalletResult {
	const { activeSigner, loading: signerLoading } = useSigner(networkPassphrase);
	const [address, setAddress] = useState<string>();

	useEffect(() => {
		let cancelled = false;

		if (!activeSigner) {
			setAddress(undefined);
			return () => {
				cancelled = true;
			};
		}

		void activeSigner
			.getPublicKey()
			.then(publicKey => {
				if (!cancelled) setAddress(publicKey);
			})
			.catch(() => {
				if (!cancelled) setAddress(undefined);
			});

		return () => {
			cancelled = true;
		};
	}, [activeSigner]);

	return {
		address,
		isConnected: Boolean(address),
		loading: signerLoading || Boolean(activeSigner && !address),
		activeSigner,
	};
}
