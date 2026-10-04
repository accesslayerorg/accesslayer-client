import { useCallback, useState } from 'react';
import { getPreference, setPreference } from '@/utils/preferences.utils';
import {
	DEFAULT_SLIPPAGE_TOLERANCE_PERCENT,
	validateSlippageTolerancePercent,
} from '@/utils/slippageTolerance.utils';

export const SLIPPAGE_TOLERANCE_PREFERENCE_KEY =
	'accesslayer.preferences.slippage-tolerance-percent';

function readSlippageTolerancePreference(): number {
	const value = getPreference<unknown>(
		SLIPPAGE_TOLERANCE_PREFERENCE_KEY,
		DEFAULT_SLIPPAGE_TOLERANCE_PERCENT
	);
	return typeof value === 'number' &&
		validateSlippageTolerancePercent(value) === null
		? value
		: DEFAULT_SLIPPAGE_TOLERANCE_PERCENT;
}

/** Reads and persists the user's device-wide slippage tolerance preference. */
export function useSlippageTolerancePreference() {
	const [slippageTolerancePercent, setSlippageTolerancePercent] = useState(
		readSlippageTolerancePreference
	);

	const updateSlippageTolerancePercent = useCallback((value: number) => {
		if (validateSlippageTolerancePercent(value) !== null) return;
		setSlippageTolerancePercent(value);
		setPreference(SLIPPAGE_TOLERANCE_PREFERENCE_KEY, value);
	}, []);

	return [slippageTolerancePercent, updateSlippageTolerancePercent] as const;
}
