import { useMemo, useState } from 'react';
import {
	computeBuyCostPreview,
	computeSellPayoutPreview,
	computeSlippagePercent,
	classifySlippageSeverity,
	applyWorstCaseBuffer,
	type SlippageSeverity,
} from '@/utils/bondingCurve.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';

/** Default worst-case buffer applied on top of the expected cost, in basis points (0.5%). */
const DEFAULT_WORST_CASE_BUFFER_BPS = 50n;

const SLIPPAGE_BADGE_CLASS: Record<SlippageSeverity, string> = {
	low: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
	medium: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
	high: 'text-red-400 border-red-500/30 bg-red-500/10',
};

export interface PriceImpactSliderProps {
	side: 'buy' | 'sell';
	/** Current key supply for the creator being traded. */
	currentSupply: bigint;
	/** Fee charged on the trade, in basis points. */
	feeBps: bigint;
	/** Worst-case buffer applied on top of the expected cost, in basis points; defaults to 0.5%. */
	worstCaseBufferBps?: bigint;
	/** Initial slider quantity; defaults to 1. */
	initialQuantity?: number;
	/** Called whenever the slider quantity changes. */
	onQuantityChange?: (quantity: number) => void;
}

/**
 * Interactive price-impact preview (#755, reduced scope): a quantity slider
 * that re-runs the bigint curve engine synchronously as it moves, showing
 * gross/net cost or payout, the resulting price, a colour-coded slippage
 * badge, and the worst-case XLM figure at the configured buffer.
 *
 * The canvas sparkline chart and the strict <16ms/1000-move performance
 * assertion from the full issue scope are intentionally out of scope here;
 * this covers the curve engine, the slider, and the live fee/slippage
 * breakdown it was built to drive.
 */
export default function PriceImpactSlider({
	side,
	currentSupply,
	feeBps,
	worstCaseBufferBps = DEFAULT_WORST_CASE_BUFFER_BPS,
	initialQuantity = 1,
	onQuantityChange,
}: PriceImpactSliderProps) {
	const sliderMax = useMemo(() => {
		const availableSupply = Number(currentSupply);
		return Math.max(1, Math.min(availableSupply || 500, 500));
	}, [currentSupply]);

	const [quantity, setQuantity] = useState(() =>
		Math.min(Math.max(1, initialQuantity), sliderMax)
	);

	const preview = useMemo(() => {
		const amount = BigInt(quantity);
		if (side === 'buy') {
			const result = computeBuyCostPreview(currentSupply, amount, feeBps);
			return {
				gross: result.grossCost,
				fee: result.fee,
				net: result.netCost,
				newPrice: result.newPrice,
			};
		}
		const result = computeSellPayoutPreview(currentSupply, amount, feeBps);
		return {
			gross: result.grossPayout,
			fee: result.fee,
			net: result.netPayout,
			newPrice: result.newPrice,
		};
	}, [side, currentSupply, feeBps, quantity]);

	const currentPrice = useMemo(() => {
		// Pre-trade spot price is the preview's own reference point at
		// quantity 0 so the slippage comparison always starts from "now".
		const zeroPreview =
			side === 'buy'
				? computeBuyCostPreview(currentSupply, 0n, feeBps)
				: computeSellPayoutPreview(currentSupply, 0n, feeBps);
		return zeroPreview.newPrice;
	}, [side, currentSupply, feeBps]);

	const slippagePercent = computeSlippagePercent(
		currentPrice,
		preview.newPrice
	);
	const severity = classifySlippageSeverity(slippagePercent);

	const worstCaseStroops =
		side === 'buy'
			? applyWorstCaseBuffer(preview.net, worstCaseBufferBps)
			: preview.net;

	function handleSliderChange(nextValue: number) {
		setQuantity(nextValue);
		onQuantityChange?.(nextValue);
	}

	return (
		<div data-testid="price-impact-slider" className="space-y-3">
			<div className="flex items-center justify-between gap-3">
				<input
					type="number"
					min={1}
					max={sliderMax}
					value={quantity}
					onChange={event => {
						const parsed = Number(event.target.value);
						if (Number.isFinite(parsed)) {
							handleSliderChange(
								Math.min(Math.max(1, Math.trunc(parsed)), sliderMax)
							);
						}
					}}
					aria-label="Quantity"
					data-testid="price-impact-quantity-input"
					className="w-20 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm text-white"
				/>
				<input
					type="range"
					min={1}
					max={sliderMax}
					value={quantity}
					onChange={event =>
						handleSliderChange(Number(event.target.value))
					}
					aria-label="Quantity slider"
					data-testid="price-impact-quantity-slider"
					className="flex-1"
				/>
			</div>

			<div className="grid grid-cols-2 gap-2 text-sm text-white/70">
				<div data-testid="price-impact-gross">
					<span className="text-white/45">
						{side === 'buy' ? 'Gross cost' : 'Gross payout'}
					</span>{' '}
					{formatDisplayKeyPrice(Number(preview.gross))}
				</div>
				<div data-testid="price-impact-fee">
					<span className="text-white/45">Fee</span>{' '}
					{formatDisplayKeyPrice(Number(preview.fee))}
				</div>
				<div data-testid="price-impact-net">
					<span className="text-white/45">
						{side === 'buy' ? 'Net cost' : 'Net payout'}
					</span>{' '}
					{formatDisplayKeyPrice(Number(preview.net))}
				</div>
				<div data-testid="price-impact-new-price">
					<span className="text-white/45">New price</span>{' '}
					{formatDisplayKeyPrice(Number(preview.newPrice))}
				</div>
			</div>

			<div
				data-testid="price-impact-slippage-badge"
				data-severity={severity}
				className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${SLIPPAGE_BADGE_CLASS[severity]}`}
			>
				Slippage {slippagePercent.toFixed(2)}%
			</div>

			{side === 'buy' && (
				<div
					data-testid="price-impact-worst-case"
					className="text-xs text-white/50"
				>
					Worst case:{' '}
					<span className="font-semibold text-white/80">
						{formatDisplayKeyPrice(Number(worstCaseStroops))}
					</span>{' '}
					(includes {Number(worstCaseBufferBps) / 100}% buffer)
				</div>
			)}
		</div>
	);
}
