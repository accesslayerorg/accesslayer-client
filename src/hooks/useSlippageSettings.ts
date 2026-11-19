import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	DEFAULT_SLIPPAGE,
	validateSlippageTolerance,
	getSlippageWarning,
} from '@/utils/slippage.utils';

export const SLIPPAGE_STORAGE_KEY = 'al:slippage';

function readPersistedSlippage(defaultFallback = DEFAULT_SLIPPAGE): number {
	if (typeof window === 'undefined') return defaultFallback;
	try {
		const raw = window.localStorage.getItem(SLIPPAGE_STORAGE_KEY);
		if (raw == null) return defaultFallback;
		const parsed = Number(raw);
		if (
			Number.isFinite(parsed) &&
			validateSlippageTolerance(parsed) === null
		) {
			return parsed;
		}
	} catch {
		// Ignore storage errors in test or restricted environments
	}
	return defaultFallback;
}

export interface UseSlippageSettingsReturn extends Array<
	number | ((val: number | string) => void)
> {
	0: number;
	1: (val: number | string) => void;
	tolerance: number;
	slippage: number;
	setTolerance: (val: number | string) => void;
	setSlippage: (val: number | string) => void;
	updateSlippage: (val: number | string) => void;
	slippageBps: number;
	bps: number;
	error: string | null;
	isValid: boolean;
	warning: string | null;
}

/**
 * Hook to manage and persist user slippage tolerance preference in localStorage under `al:slippage`.
 * Persists across page reloads and synchronizes cross-tab updates.
 */
export function useSlippageSettings(
	initialTolerance?: number
): UseSlippageSettingsReturn {
	const [tolerance, setToleranceState] = useState<number>(() => {
		if (
			initialTolerance !== undefined &&
			validateSlippageTolerance(initialTolerance) === null
		) {
			return initialTolerance;
		}
		return readPersistedSlippage(initialTolerance ?? DEFAULT_SLIPPAGE);
	});

	const [error, setError] = useState<string | null>(null);

	const setTolerance = useCallback((value: number | string) => {
		const parsed = typeof value === 'string' ? Number(value.trim()) : value;
		const validationError = validateSlippageTolerance(parsed);
		setError(validationError);

		if (validationError === null) {
			setToleranceState(parsed);
			try {
				if (typeof window !== 'undefined') {
					window.localStorage.setItem(
						SLIPPAGE_STORAGE_KEY,
						String(parsed)
					);
				}
			} catch {
				// Ignore localStorage write errors
			}
		}
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined') return;

		const handleStorage = (event: StorageEvent) => {
			if (event.key === SLIPPAGE_STORAGE_KEY && event.newValue != null) {
				const next = Number(event.newValue);
				if (
					Number.isFinite(next) &&
					validateSlippageTolerance(next) === null
				) {
					setToleranceState(next);
					setError(null);
				}
			}
		};

		window.addEventListener('storage', handleStorage);
		return () => window.removeEventListener('storage', handleStorage);
	}, []);

	const slippageBps = Math.round(tolerance * 100);
	const warning = getSlippageWarning(tolerance);

	const result = useMemo(() => {
		const tuple: [number, (val: number | string) => void] = [
			tolerance,
			setTolerance,
		];
		return Object.assign(tuple, {
			tolerance,
			slippage: tolerance,
			setTolerance,
			setSlippage: setTolerance,
			updateSlippage: setTolerance,
			slippageBps,
			bps: slippageBps,
			error,
			isValid: error === null,
			warning,
		}) as UseSlippageSettingsReturn;
	}, [tolerance, setTolerance, slippageBps, error, warning]);

	return result;
}

export default useSlippageSettings;
