import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { LimitOrderExpiry, LimitOrderSide } from '@/services/orders';
import { validateLimitOrderPrice } from '@/utils/limitOrder.utils';

interface LimitOrderFormProps {
	currentPrice: number;
	availableHoldings: number;
	isSubmitting?: boolean;
	onSubmit: (input: {
		side: LimitOrderSide;
		targetPrice: number;
		quantity: number;
		expiresIn: LimitOrderExpiry;
	}) => void;
}

export default function LimitOrderForm({
	currentPrice,
	availableHoldings,
	isSubmitting,
	onSubmit,
}: LimitOrderFormProps) {
	const [side, setSide] = useState<LimitOrderSide>('buy');
	const [targetPrice, setTargetPrice] = useState('');
	const [quantity, setQuantity] = useState('1');
	const [expiresIn, setExpiresIn] = useState<LimitOrderExpiry>('24h');
	const [touched, setTouched] = useState(false);
	const priceError = touched
		? validateLimitOrderPrice(side, Number(targetPrice), currentPrice)
		: null;
	const quantityValue = Number(quantity);
	const quantityError =
		touched &&
		(!Number.isInteger(quantityValue) ||
			quantityValue <= 0 ||
			(side === 'sell' && quantityValue > availableHoldings))
			? side === 'sell' && quantityValue > availableHoldings
				? 'Quantity exceeds your holdings.'
				: 'Enter a whole quantity greater than zero.'
			: null;

	function submit() {
		setTouched(true);
		if (priceError || quantityError || !targetPrice) return;
		onSubmit({
			side,
			targetPrice: Number(targetPrice),
			quantity: quantityValue,
			expiresIn,
		});
	}

	return (
		<div className="space-y-4" data-testid="limit-order-form">
			<Tabs
				value={side}
				onValueChange={value => setSide(value as LimitOrderSide)}
			>
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="buy">Buy</TabsTrigger>
					<TabsTrigger value="sell">Sell</TabsTrigger>
				</TabsList>
			</Tabs>
			<div className="grid gap-3 sm:grid-cols-2">
				<label className="space-y-1 text-sm text-white/70">
					Target price
					<Input
						aria-label="Target price"
						type="number"
						min="0"
						step="any"
						value={targetPrice}
						onChange={event => setTargetPrice(event.target.value)}
					/>
				</label>
				<label className="space-y-1 text-sm text-white/70">
					Quantity
					<Input
						aria-label="Quantity"
						type="number"
						min="1"
						step="1"
						value={quantity}
						onChange={event => setQuantity(event.target.value)}
					/>
				</label>
			</div>
			<p className="text-xs text-white/55">Current price: {currentPrice}</p>
			<label className="block space-y-1 text-sm text-white/70">
				Expires in
				<select
					aria-label="Expires in"
					value={expiresIn}
					onChange={event =>
						setExpiresIn(event.target.value as LimitOrderExpiry)
					}
					className="h-9 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-white"
				>
					<option value="1h">1 hour</option>
					<option value="24h">24 hours</option>
					<option value="7d">7 days</option>
				</select>
			</label>
			{priceError && (
				<p role="alert" className="text-sm text-rose-300">
					{priceError}
				</p>
			)}
			{quantityError && (
				<p role="alert" className="text-sm text-rose-300">
					{quantityError}
				</p>
			)}
			<Button
				type="button"
				onClick={submit}
				disabled={isSubmitting}
				className="w-full"
			>
				{isSubmitting ? 'Placing order…' : 'Place limit order'}
			</Button>
		</div>
	);
}
