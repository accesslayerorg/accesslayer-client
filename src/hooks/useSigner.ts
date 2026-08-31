import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	FreighterSigner,
	LedgerSigner,
	classifySigningError,
	type Signer,
	type SignerAvailability,
	type SignerType,
	type SigningError,
} from '@/lib/signing';

export const SIGNER_PREFERENCE_KEY = 'accesslayer.signer.preference';

export interface UseSignerDependencies {
	detectSoftware?: () => Promise<boolean>;
	detectHardware?: () => Promise<boolean>;
	createSoftware?: () => Signer;
	createHardware?: () => Signer;
	storage?: Pick<Storage, 'getItem' | 'setItem'>;
}

export interface UseSignerResult {
	activeSigner: Signer | null;
	availableSigners: SignerAvailability;
	preference: SignerType;
	setPreference: (type: SignerType) => void;
	loading: boolean;
	error: SigningError | null;
	refresh: () => Promise<void>;
}

const DEFAULT_DEPENDENCIES: UseSignerDependencies = {};

export function selectPreferredSigner(
	availability: SignerAvailability,
	preference: SignerType
): Signer | null {
	return (
		availability[preference] ?? availability.software ?? availability.hardware
	);
}

export function useSigner(
	networkPassphrase: string,
	dependencies: UseSignerDependencies = DEFAULT_DEPENDENCIES
): UseSignerResult {
	const storage =
		dependencies.storage ??
		(typeof window !== 'undefined' ? window.localStorage : undefined);
	const [preference, setPreferenceState] = useState<SignerType>(() =>
		storage?.getItem(SIGNER_PREFERENCE_KEY) === 'hardware'
			? 'hardware'
			: 'software'
	);
	const [availableSigners, setAvailableSigners] = useState<SignerAvailability>(
		{
			software: null,
			hardware: null,
		}
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<SigningError | null>(null);

	const refresh = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const [softwareAvailable, hardwareAvailable] = await Promise.all([
				(dependencies.detectSoftware ?? FreighterSigner.isAvailable)(),
				(dependencies.detectHardware ?? LedgerSigner.isAvailable)(),
			]);
			setAvailableSigners({
				software: softwareAvailable
					? (dependencies.createSoftware?.() ??
						new FreighterSigner(networkPassphrase))
					: null,
				hardware: hardwareAvailable
					? (dependencies.createHardware?.() ??
						new LedgerSigner(networkPassphrase))
					: null,
			});
		} catch (rawError) {
			setAvailableSigners({ software: null, hardware: null });
			setError(classifySigningError(rawError));
		} finally {
			setLoading(false);
		}
	}, [dependencies, networkPassphrase]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const setPreference = useCallback(
		(type: SignerType) => {
			storage?.setItem(SIGNER_PREFERENCE_KEY, type);
			setPreferenceState(type);
		},
		[storage]
	);

	const activeSigner = useMemo(
		() => selectPreferredSigner(availableSigners, preference),
		[availableSigners, preference]
	);

	return {
		activeSigner,
		availableSigners,
		preference,
		setPreference,
		loading,
		error,
		refresh,
	};
}
