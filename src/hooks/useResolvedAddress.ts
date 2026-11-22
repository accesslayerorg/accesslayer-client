import { useState, useEffect } from 'react';
import { StrKey } from '@stellar/stellar-sdk';
import {
	resolveFederationAddress,
	getCachedFederationAddress,
	FederationError,
} from '@/services/stellar';

export interface UseResolvedAddressResult {
	resolvedAddress: string | null;
	isResolving: boolean;
	isLoading: boolean;
	error: string | null;
	isFederation: boolean;
}

export const FEDERATION_DEBOUNCE_MS = 300;

export function isFederationAddress(value: string): boolean {
	const trimmed = value.trim();
	if (!trimmed.includes('*')) return false;
	const parts = trimmed.split('*');
	return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
}

export function useResolvedAddress(input: string): UseResolvedAddressResult {
	const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
	const [isResolving, setIsResolving] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [isFederation, setIsFederation] = useState<boolean>(false);

	useEffect(() => {
		const trimmed = input.trim();

		if (!trimmed) {
			setResolvedAddress(null);
			setIsResolving(false);
			setError(null);
			setIsFederation(false);
			return;
		}

		if (trimmed.includes('*')) {
			setIsFederation(true);

			const cached = getCachedFederationAddress(trimmed);
			if (cached) {
				setResolvedAddress(cached);
				setIsResolving(false);
				setError(null);
				return;
			}

			setIsResolving(true);
			setError(null);
			setResolvedAddress(null);

			let isCancelled = false;
			const timer = setTimeout(async () => {
				try {
					const resolved = await resolveFederationAddress(trimmed);
					if (!isCancelled) {
						setResolvedAddress(resolved);
						setIsResolving(false);
						setError(null);
					}
				} catch (err) {
					if (!isCancelled) {
						setResolvedAddress(null);
						setIsResolving(false);
						if (err instanceof FederationError) {
							setError(err.message);
						} else {
							setError('Failed to resolve address');
						}
					}
				}
			}, FEDERATION_DEBOUNCE_MS);

			return () => {
				isCancelled = true;
				clearTimeout(timer);
			};
		}

		setIsFederation(false);
		setIsResolving(false);

		if (StrKey.isValidEd25519PublicKey(trimmed)) {
			setResolvedAddress(trimmed);
			setError(null);
		} else {
			setResolvedAddress(null);
			setError(null);
		}
	}, [input]);

	return {
		resolvedAddress,
		isResolving,
		isLoading: isResolving,
		error,
		isFederation,
	};
}
