import type { ReactNode } from 'react';
import { useCurrencyPreference } from '@/hooks/useCurrencyPreference';
import { useXlmFiatRate } from '@/hooks/useXlmFiatRate';
import { XlmFiatRateContext } from '@/components/common/xlmFiatRateContext';

export function XlmFiatRateProvider({ children }: { children: ReactNode }) {
	const currency = useCurrencyPreference(state => state.currency);
	const query = useXlmFiatRate(currency);

	return (
		<XlmFiatRateContext.Provider
			value={{ currency, data: query.data, isError: query.isError }}
		>
			{children}
		</XlmFiatRateContext.Provider>
	);
}
