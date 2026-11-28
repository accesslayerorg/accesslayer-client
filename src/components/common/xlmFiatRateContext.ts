import { createContext, useContext } from 'react';
import type { XlmFiatRate } from '@/hooks/useXlmFiatRate';
import type { FiatCurrency } from '@/utils/fiatCurrency.utils';

export interface XlmFiatRateContextValue {
	currency: FiatCurrency;
	data: XlmFiatRate | undefined;
	isError: boolean;
}

export const XlmFiatRateContext = createContext<XlmFiatRateContextValue | null>(
	null
);

export function useXlmFiatRateContext() {
	return useContext(XlmFiatRateContext);
}
