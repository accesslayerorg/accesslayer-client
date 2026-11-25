import { useCurrencyPreference } from '@/hooks/useCurrencyPreference';
import { FIAT_CURRENCIES, isFiatCurrency } from '@/utils/fiatCurrency.utils';
import { cn } from '@/lib/utils';

interface CurrencySelectorProps {
	scrolled?: boolean;
}

export default function CurrencySelector({
	scrolled = false,
}: CurrencySelectorProps) {
	const currency = useCurrencyPreference(state => state.currency);
	const setCurrency = useCurrencyPreference(state => state.setCurrency);

	return (
		<select
			aria-label="Display currency"
			value={currency}
			onChange={event => {
				if (isFiatCurrency(event.target.value)) {
					setCurrency(event.target.value);
				}
			}}
			className={cn(
				'rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold transition-colors',
				scrolled
					? 'text-gray-700 hover:bg-black/5'
					: 'text-white/80 hover:bg-white/10'
			)}
		>
			{FIAT_CURRENCIES.map(option => (
				<option
					key={option}
					value={option}
					className="bg-slate-900 text-white"
				>
					{option}
				</option>
			))}
		</select>
	);
}
