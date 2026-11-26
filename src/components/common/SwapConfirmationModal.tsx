import React, { useMemo, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StableButtonContent } from '@/components/ui/stable-button-content';
import { formatNumber } from '@/utils/numberFormat.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { formatPriceImpact } from '@/utils/priceImpact.utils';
import SlippageSettings from '@/components/common/SlippageSettings';
import {
	calculateSlippageBounds,
	validateSlippageTolerance,
	type SwapQuote,
} from '@/utils/slippage.utils';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export interface SwapConfirmationModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	side: 'buy' | 'sell';
	creatorName?: string;
	tokenName?: string;
	amount: number;
	unitPriceStroops?: number | null;
	totalStroops?: number | null;
	expectedPrice?: number | null;
	priceImpactPercent?: number | null;
	priceImpactBps?: number | null;
	initialSlippage?: number;
	slippageTolerancePercent?: number;
	onSlippageChange?: (percent: number) => void;
	onConfirm: (bounds?: {
		minReceived: number;
		maxSpent: number;
		tolerancePercent: number;
	}) => Promise<void> | void;
	onCancel?: () => void;
	isSubmitting?: boolean;
	quote?: SwapQuote | number | null;
}

/**
 * Dedicated swap confirmation modal displaying expected price, price impact,
 * minimum received, and SlippageSettings controls.
 */
export const SwapConfirmationModal: React.FC<SwapConfirmationModalProps> = ({
	open,
	onOpenChange,
	side,
	creatorName = 'Bonding Curve Key',
	tokenName,
	amount,
	unitPriceStroops,
	totalStroops,
	expectedPrice: expectedPriceProp,
	priceImpactPercent = 0,
	priceImpactBps,
	initialSlippage = 1,
	slippageTolerancePercent,
	onSlippageChange,
	onConfirm,
	onCancel,
	isSubmitting = false,
	quote: customQuote,
}) => {
	const { t } = useTranslation();
	const [tolerance, setTolerance] = useState<number>(
		slippageTolerancePercent ?? initialSlippage
	);
	const [isSlippageValid, setIsSlippageValid] = useState<boolean>(
		validateSlippageTolerance(slippageTolerancePercent ?? initialSlippage) ===
			null
	);

	const isBuy = side === 'buy';
	const title = isBuy ? t('swap.confirmBuy') : t('swap.confirmSell');
	const confirmButtonLabel = isBuy ? t('swap.confirmBuyAction') : t('swap.confirmSellAction');
	const assetLabel = tokenName ?? creatorName;

	const handleToleranceChange = (newTolerance: number) => {
		setTolerance(newTolerance);
		onSlippageChange?.(newTolerance);
	};

	// Quote object used for slippage bounds calculation
	const quote: SwapQuote = useMemo(() => {
		if (typeof customQuote === 'object' && customQuote !== null) {
			return customQuote;
		}
		if (typeof customQuote === 'number') {
			return {
				side,
				amount,
				expectedCost: isBuy ? customQuote : undefined,
				expectedProceeds: !isBuy ? customQuote : undefined,
			};
		}
		return {
			side,
			amount,
			expectedPrice:
				expectedPriceProp ??
				(unitPriceStroops ? unitPriceStroops / 10_000_000 : undefined),
			expectedCost: isBuy
				? totalStroops
					? totalStroops / 10_000_000
					: undefined
				: undefined,
			expectedProceeds: !isBuy
				? totalStroops
					? totalStroops / 10_000_000
					: undefined
				: undefined,
			totalStroops: totalStroops ?? undefined,
		};
	}, [
		customQuote,
		side,
		amount,
		expectedPriceProp,
		unitPriceStroops,
		totalStroops,
		isBuy,
	]);

	const bounds = useMemo(() => {
		try {
			const bps = Math.round(tolerance * 100);
			return calculateSlippageBounds(quote, bps);
		} catch {
			return {
				minReceived: 0,
				maxSpent: 0,
				toleranceBps: 0,
				tolerancePercent: tolerance,
			};
		}
	}, [quote, tolerance]);

	const displayedExpectedPrice =
		expectedPriceProp != null
			? expectedPriceProp
			: unitPriceStroops != null
				? formatDisplayKeyPrice(unitPriceStroops)
				: totalStroops != null
					? formatDisplayKeyPrice(totalStroops / Math.max(1, amount))
					: null;

	const displayedPriceImpact =
		priceImpactPercent != null
			? formatPriceImpact(priceImpactPercent)
			: priceImpactBps != null
				? `${(priceImpactBps / 100).toFixed(2)}%`
				: '0.00%';

	const displayedMinReceived = useMemo(() => {
		if (isBuy) {
			return `${bounds.minReceived.toFixed(2)} keys`;
		}
		return `${formatNumber(bounds.minReceived)} XLM`;
	}, [isBuy, bounds]);

	const handleCancel = () => {
		if (isSubmitting) return;
		if (onCancel) onCancel();
		else onOpenChange(false);
	};

	const handleConfirmClick = async () => {
		if (!isSlippageValid || isSubmitting) return;
		await onConfirm(bounds);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={next => !isSubmitting && onOpenChange(next)}
		>
			<DialogContent
				className="max-w-md border-white/10 bg-[#0b1728] text-white p-6"
				data-testid="swap-confirmation-modal"
			>
				<DialogHeader className="space-y-1.5 text-left">
					<div className="flex items-center gap-2">
						<span
							className={cn(
								'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
								isBuy
									? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
									: 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
							)}
							data-testid="swap-modal-side-badge"
						>
							{side}
						</span>
						<DialogTitle
							className="text-lg font-bold"
							data-testid="swap-confirmation-modal-title"
						>
							{title}
						</DialogTitle>
					</div>
					<DialogDescription className="text-xs text-white/60">
						{t('swap.description')}
					</DialogDescription>
				</DialogHeader>

				<div className="mt-4 space-y-4">
					{/* Swap Overview */}
					<div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
						<div className="flex items-center justify-between text-sm">
							<span className="text-white/60">{t('swap.asset')}</span>
							<span className="font-semibold text-white">
								{assetLabel}
							</span>
						</div>

						<div className="flex items-center justify-between text-sm">
							<span className="text-white/60">{t('swap.swapAmount')}</span>
							<span className="font-mono font-semibold text-white">
								{formatNumber(amount)} {amount === 1 ? t('swap.key') : t('swap.keys')}
							</span>
						</div>

						{displayedExpectedPrice != null && (
							<div className="flex items-center justify-between text-sm">
								<span className="text-white/60">{t('swap.expectedPrice')}</span>
								<span
									className="font-mono text-white/90"
									data-testid="expected-price"
								>
									{typeof displayedExpectedPrice === 'number'
										? `${displayedExpectedPrice} XLM`
										: displayedExpectedPrice}
								</span>
							</div>
						)}

						<div className="flex items-center justify-between text-sm">
							<span className="text-white/60">{t('swap.priceImpact')}</span>
							<span
								className="font-mono text-white/90"
								data-testid="price-impact"
							>
								{displayedPriceImpact}
							</span>
						</div>

						<div className="flex items-center justify-between border-t border-white/5 pt-2 text-sm">
							<span className="text-white/70 font-medium">
								{t('swap.minimumReceived')}
							</span>
							<span
								className="font-mono font-semibold text-emerald-400"
								data-testid="minimum-received"
							>
								{displayedMinReceived}
							</span>
						</div>
					</div>

					{/* Slippage Settings Section */}
					<div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4 space-y-3">
						<div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
							<ShieldCheck className="h-4 w-4 text-amber-400" />
							<span>{t('swap.slippageTolerance')}</span>
						</div>

						<SlippageSettings
							value={tolerance}
							onChange={handleToleranceChange}
							onValidityChange={setIsSlippageValid}
							minReceived={displayedMinReceived}
							disabled={isSubmitting}
						/>
					</div>
				</div>

				<DialogFooter className="mt-6 flex flex-row items-center justify-between gap-3 sm:justify-between">
					<Button
						type="button"
						variant="ghost"
						onClick={handleCancel}
						disabled={isSubmitting}
						data-testid="swap-confirmation-modal-cancel"
						className="text-white/70 hover:text-white"
					>
						{t('swap.back')}
					</Button>
					<Button
						type="button"
						onClick={handleConfirmClick}
						disabled={isSubmitting || !isSlippageValid}
						aria-busy={isSubmitting || undefined}
						data-testid="swap-confirmation-modal-confirm"
						className={cn(
							'font-semibold',
							isBuy
								? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
								: 'bg-rose-500 hover:bg-rose-400 text-white',
							(!isSlippageValid || isSubmitting) &&
								'opacity-50 cursor-not-allowed'
						)}
					>
						<StableButtonContent
							isLoading={isSubmitting}
							loadingLabel={t('swap.submitting')}
						>
							<span className="flex items-center gap-1.5">
								{confirmButtonLabel}
								<ArrowRight className="h-4 w-4" />
							</span>
						</StableButtonContent>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default SwapConfirmationModal;
