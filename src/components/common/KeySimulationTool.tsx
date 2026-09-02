import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { formatPercent } from '@/utils/numberFormat.utils';
import {
	simulateKeyBuy,
	type KeySimulationResult,
} from '@/utils/keySimulation.utils';
import type { BondingCurveParams } from '@/utils/bondingCurve.utils';

export interface KeySimulationToolProps {
	/** Current key supply the simulation buys from. */
	currentSupply: number;
	protocolFeeBps?: number;
	creatorFeeBps?: number;
	curveParams?: BondingCurveParams;
	className?: string;
}

/**
 * "What if I bought N keys?" simulation tool for the key detail page
 * (#875). Lets a user enter a hypothetical buy amount and see the
 * projected price impact, cost, and average price — reusing the same
 * bonding-curve cost primitive and fee math as the real buy flow via
 * `simulateKeyBuy`.
 */
const KeySimulationTool: React.FC<KeySimulationToolProps> = ({
	currentSupply,
	protocolFeeBps = 0,
	creatorFeeBps = 0,
	curveParams,
	className,
}) => {
	const [amountText, setAmountText] = useState('10');

	const parsedAmount = useMemo(() => {
		const normalized = amountText.trim();
		if (!normalized) return NaN;
		return Number(normalized);
	}, [amountText]);

	const validationError = useMemo((): string | null => {
		const normalized = amountText.trim();
		if (!normalized) return 'Enter a quantity to simulate.';
		if (!Number.isFinite(parsedAmount)) return 'Quantity must be a number.';
		if (parsedAmount <= 0) return 'Quantity must be greater than zero.';
		if (parsedAmount > 100_000) return 'Quantity is too large to simulate.';
		return null;
	}, [amountText, parsedAmount]);

	const result: KeySimulationResult | null = useMemo(() => {
		if (validationError) return null;
		return simulateKeyBuy({
			quantity: parsedAmount,
			currentSupply,
			protocolFeeBps,
			creatorFeeBps,
			curveParams,
		});
	}, [validationError, parsedAmount, currentSupply, protocolFeeBps, creatorFeeBps, curveParams]);

	return (
		<div
			className={cn(
				'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8',
				className
			)}
			data-testid="key-simulation-tool"
		>
			<h2 className="font-grotesque text-xl font-black tracking-tight text-white mb-2">
				Simulate a buy
			</h2>
			<p className="text-sm text-white/55 mb-6">
				Model a hypothetical purchase to see the projected price impact and
				cost before you buy for real.
			</p>

			<div className="space-y-2">
				<label htmlFor="key-simulation-amount" className="text-sm text-white/70">
					Quantity
				</label>
				<input
					id="key-simulation-amount"
					inputMode="decimal"
					value={amountText}
					onChange={event => setAmountText(event.target.value)}
					className={cn(
						'w-full max-w-[10rem] rounded-xl border bg-white/[0.04] px-3 py-2 text-white outline-none transition-colors',
						'border-white/10 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15',
						validationError ? 'border-red-500/60' : ''
					)}
					aria-label="Simulated buy quantity"
					aria-describedby={validationError ? 'key-simulation-error' : undefined}
					aria-invalid={validationError != null || undefined}
					data-testid="key-simulation-amount"
				/>
				{validationError && (
					<p
						id="key-simulation-error"
						role="alert"
						className="text-xs text-red-300"
						data-testid="key-simulation-error"
					>
						{validationError}
					</p>
				)}
			</div>

			{result && (
				<div
					className="mt-6 space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-4"
					data-testid="key-simulation-result"
				>
					<div className="flex justify-between items-center text-xs">
						<span className="text-white/70">Current price</span>
						<span
							className="font-mono text-white/90"
							data-testid="key-simulation-start-price"
						>
							{formatDisplayKeyPrice(result.startPriceStroops)}
						</span>
					</div>
					<div className="flex justify-between items-center text-xs">
						<span className="text-white/70">Projected price after buy</span>
						<span
							className="font-mono text-white/90"
							data-testid="key-simulation-end-price"
						>
							{formatDisplayKeyPrice(result.endPriceStroops)}
						</span>
					</div>
					<div className="flex justify-between items-center text-xs">
						<span className="text-white/70">Price impact</span>
						<span
							className={cn(
								'font-mono',
								result.priceImpactPercent > 0
									? 'text-amber-300/90'
									: 'text-white/90'
							)}
							data-testid="key-simulation-price-impact"
						>
							{formatPercent(result.priceImpactPercent, {
								maximumFractionDigits: 2,
								signed: true,
							})}
						</span>
					</div>
					<div className="flex justify-between items-center text-xs">
						<span className="text-white/70">Average price paid</span>
						<span
							className="font-mono text-white/90"
							data-testid="key-simulation-average-price"
						>
							{formatDisplayKeyPrice(result.averagePriceStroops)}
						</span>
					</div>
					{result.protocolFeeBps > 0 && (
						<div className="flex justify-between items-center text-xs">
							<span className="text-white/70">Simulated protocol fee</span>
							<span className="font-mono text-white/90">
								{formatDisplayKeyPrice(result.protocolFeeStroops)}
							</span>
						</div>
					)}
					{result.creatorFeeBps > 0 && (
						<div className="flex justify-between items-center text-xs">
							<span className="text-white/70">Simulated creator fee</span>
							<span className="font-mono text-white/90">
								{formatDisplayKeyPrice(result.creatorFeeStroops)}
							</span>
						</div>
					)}
					<div className="flex justify-between items-center text-xs pt-2 border-t border-white/10">
						<span className="font-semibold text-white">Total cost</span>
						<span
							className="font-mono font-semibold text-amber-300/90"
							data-testid="key-simulation-total-cost"
						>
							{formatDisplayKeyPrice(result.totalCostStroops)}
						</span>
					</div>
				</div>
import React, { useEffect, useRef, useState } from 'react';
import { courseService } from '@/services/course.service';
import {
	calculatePriceImpact,
	formatPriceImpact,
} from '@/utils/priceImpact.utils';

export interface KeySimulationToolProps {
	/** Key identifier used for GET /keys/:keyId/simulate?quantity=N */
	keyId: string;
	/** Current spot price in the same unit as simulated_price (e.g. XLM or stroops) */
	spotPrice: number;
	/** Optional initial quantity */
	initialQuantity?: number;
}

interface SimulateResult {
	simulated_price?: number;
	simulatedPrice?: number;
	spot_price?: number;
	spotPrice?: number;
}

/**
 * Key price simulation tool (#887).
 *
 * Lets the user enter a custom quantity, debounces the input by 300ms,
 * fetches GET /keys/:keyId/simulate?quantity=N, computes price impact as
 * (simulated_price - spot_price) / spot_price * 100 and displays it.
 *
 * Loading shows a skeleton, fetch errors show 'Unable to simulate price'
 * and hide the impact value.
 */
const KeySimulationTool: React.FC<KeySimulationToolProps> = ({
	keyId,
	spotPrice,
	initialQuantity = 1,
}) => {
	const [quantityInput, setQuantityInput] = useState(
		String(initialQuantity)
	);
	const [simulatedPrice, setSimulatedPrice] = useState<number | null>(null);
	const [resolvedSpotPrice, setResolvedSpotPrice] = useState<number>(spotPrice);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Keep spot price in sync when prop changes
	useEffect(() => {
		setResolvedSpotPrice(spotPrice);
	}, [spotPrice]);

	useEffect(() => {
		const quantity = Number(quantityInput);
		// Empty or invalid quantity: clear simulation
		if (quantityInput.trim() === '' || isNaN(quantity) || quantity <= 0) {
			setSimulatedPrice(null);
			setError(null);
			setLoading(false);
			return;
		}

		if (debounceRef.current) clearTimeout(debounceRef.current);

		setLoading(true);
		setError(null);

		debounceRef.current = setTimeout(async () => {
			try {
				const result: SimulateResult =
					await courseService.simulateBuy(keyId, quantity);
				// Support both snake_case and camelCase shapes
				const sim =
					result.simulated_price ?? result.simulatedPrice ?? null;
				const spot =
					result.spot_price ?? result.spotPrice ?? spotPrice;
				if (sim != null) {
					setSimulatedPrice(sim);
					if (spot != null) setResolvedSpotPrice(spot);
					setError(null);
				} else {
					setSimulatedPrice(null);
				}
			} catch {
				setError('Unable to simulate price');
				setSimulatedPrice(null);
			} finally {
				setLoading(false);
			}
		}, 300);

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [quantityInput, keyId, spotPrice]);

	const impact =
		simulatedPrice != null
			? calculatePriceImpact(simulatedPrice, resolvedSpotPrice)
			: null;

	return (
		<div className="space-y-4" data-testid="key-simulation-tool">
			<div className="space-y-1.5">
				<label
					htmlFor="simulation-quantity"
					className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
				>
					Quantity
				</label>
				<input
					id="simulation-quantity"
					data-testid="simulation-quantity-input"
					aria-label="Custom quantity"
					type="number"
					inputMode="numeric"
					min={1}
					value={quantityInput}
					onChange={e => setQuantityInput(e.target.value)}
					className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none"
					placeholder="Enter quantity"
				/>
			</div>

			{loading && (
				<div
					data-testid="simulation-skeleton"
					aria-label="Loading simulation"
					className="h-6 w-32 animate-pulse rounded bg-white/10"
				/>
			)}

			{!loading && error && (
				<p
					role="alert"
					data-testid="simulation-error"
					className="text-sm text-red-400"
				>
					{error}
				</p>
			)}

			{!loading && !error && impact != null && (
				<p
					data-testid="price-impact"
					className="text-sm font-bold text-white"
				>
					{formatPriceImpact(impact)}
				</p>
			)}
		</div>
	);
};

export default KeySimulationTool;
