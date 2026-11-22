import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QuickAmountButtons from './QuickAmountButtons';
import {
	defaultReservedNetworkFee,
	type SwapSide,
} from '@/utils/swapQuantity.utils';

export interface SwapPanelProps {
	/** Buy side uses XLM balance; sell side uses held key balance. */
	balance: number;
	/** Whether a wallet is connected. Buttons disable when false. */
	isConnected: boolean;
	/** Controlled swap quantity in whole keys. */
	amount: number;
	/** Invoked when the quantity changes (typing or quick-select). */
	onAmountChange: (amount: number) => void;
	/** Initially active side. */
	defaultSide?: SwapSide;
	/** Creator being traded against. */
	creatorId?: string;
}

const SwapPanel: React.FC<SwapPanelProps> = ({
	balance,
	isConnected,
	amount,
	onAmountChange,
	defaultSide = 'buy',
	creatorId,
}) => {
	const [side, setSide] = useState<SwapSide>(defaultSide);

	const handleSideChange = useCallback((value: string) => {
		setSide(value as SwapSide);
	}, []);

	const handleAmountChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const parsed = Number(e.target.value);
			const next = Number.isFinite(parsed)
				? Math.max(0, Math.floor(parsed))
				: 0;
			onAmountChange(next);
		},
		[onAmountChange]
	);

	return (
		<section
			className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4"
			data-testid="swap-panel"
		>
			<Tabs value={side} onValueChange={handleSideChange} className="w-full">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger
						value="buy"
						className="text-sm"
						data-testid="swap-tab-buy"
					>
						Buy
					</TabsTrigger>
					<TabsTrigger
						value="sell"
						className="text-sm"
						data-testid="swap-tab-sell"
					>
						Sell
					</TabsTrigger>
				</TabsList>

				<TabsContent value="buy" className="mt-3 space-y-3">
					<div className="space-y-1.5">
						<Label htmlFor="swap-buy-amount">Quantity (keys)</Label>
						<Input
							id="swap-buy-amount"
							data-testid="swap-buy-amount-input"
							type="number"
							inputMode="numeric"
							min={0}
							step={1}
							value={amount}
							onChange={handleAmountChange}
							disabled={!isConnected}
							placeholder="0"
						/>
						<p className="text-xs text-white/50">
							Buy Max uses your XLM balance minus a reserved network fee
							({defaultReservedNetworkFee()}).
						</p>
					</div>
					<QuickAmountButtons
						mode="buy"
						balance={balance}
						activeValue={amount}
						isConnected={isConnected}
						onSelect={onAmountChange}
					/>
				</TabsContent>

				<TabsContent value="sell" className="mt-3 space-y-3">
					<div className="space-y-1.5">
						<Label htmlFor="swap-sell-amount">Quantity (keys)</Label>
						<Input
							id="swap-sell-amount"
							data-testid="swap-sell-amount-input"
							type="number"
							inputMode="numeric"
							min={0}
							step={1}
							value={amount}
							onChange={handleAmountChange}
							disabled={!isConnected}
							placeholder="0"
						/>
						<p className="text-xs text-white/50">
							Holdings: {Math.floor(balance)} key
							{balance !== 1 ? 's' : ''}.
						</p>
					</div>
					<QuickAmountButtons
						mode="sell"
						balance={balance}
						activeValue={amount}
						isConnected={isConnected}
						onSelect={onAmountChange}
					/>
				</TabsContent>
			</Tabs>

			{creatorId && (
				<Button
					type="button"
					data-testid="swap-submit"
					disabled={
						!isConnected || !Number.isFinite(amount) || amount <= 0
					}
					className="w-full"
				>
					{side === 'buy' ? 'Buy Keys' : 'Sell Keys'}
				</Button>
			)}
		</section>
	);
};

export default SwapPanel;
