import React from 'react';
import { Button } from '@/components/ui/button';
import {
	maxBuyAmount,
	maxSellAmount,
	percentOfBalance,
	SELL_QUICK_PERCENTS,
	defaultReservedNetworkFee,
	type SwapSide,
} from '@/utils/swapQuantity.utils';

export interface QuickAmountButtonsProps {
	/** Sell: held key balance. Buy: XLM wallet balance. */
	balance: number;
	/** Callback invoked with the selected whole-key amount. */
	onSelect: (amount: number) => void;
	mode: SwapSide;
	/** Currently selected quantity; the matching button is highlighted. */
	activeValue?: number | null;
	/** Whether a wallet is connected. Disabled when false or balance is zero. */
	isConnected?: boolean;
}

const QuickAmountButtons: React.FC<QuickAmountButtonsProps> = ({
	balance,
	onSelect,
	mode,
	activeValue = null,
	isConnected = false,
}) => {
	const disabled = !isConnected || !Number.isFinite(balance) || balance <= 0;

	const handleSelect = (amount: number) => {
		if (disabled || amount <= 0) return;
		onSelect(amount);
	};

	const sellButtons = SELL_QUICK_PERCENTS.map(pct => {
		const amount = percentOfBalance(balance, pct);
		const active =
			activeValue != null && amount > 0 && amount === activeValue;
		return (
			<Button
				key={`sell-${pct}`}
				type="button"
				variant="outline"
				size="xs"
				disabled={disabled || amount <= 0}
				onClick={() => handleSelect(amount)}
				aria-pressed={active}
				data-testid={`quick-amount-sell-${pct}`}
				className="text-xs"
			>
				{pct}%
			</Button>
		);
	});

	const maxAmount =
		mode === 'sell'
			? maxSellAmount(balance)
			: maxBuyAmount(balance, defaultReservedNetworkFee());
	const maxActive =
		activeValue != null && maxAmount > 0 && maxAmount === activeValue;

	return (
		<div
			className="flex flex-wrap gap-2 items-end"
			data-testid="quick-amount-buttons"
		>
			{mode === 'sell' ? sellButtons : null}
			<Button
				type="button"
				variant="outline"
				size="xs"
				disabled={disabled || maxAmount <= 0}
				onClick={() => handleSelect(maxAmount)}
				aria-pressed={maxActive}
				data-testid="quick-amount-max"
				className="text-xs"
			>
				Max
			</Button>
		</div>
	);
};

export default QuickAmountButtons;
