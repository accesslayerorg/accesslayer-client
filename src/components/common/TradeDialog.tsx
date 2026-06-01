import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { StableButtonContent } from '@/components/ui/stable-button-content';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import PercentageBadge from '@/components/common/PercentageBadge';
import NetworkFeeHint from '@/components/common/NetworkFeeHint';
import { TRADE_FEE_ESTIMATE } from '@/constants/fees';
import { clampBuyQuantity } from '@/utils/buyQuantity';
import {
	fetchTradeNetworkFeeEstimate,
	formatTransactionFeeDisplay,
	type NetworkFeeDataProvider,
} from '@/utils/transactionFee.utils';
import { normalizeCreatorDisplayName } from '@/utils/creatorDisplayName.utils';

export type TradeSide = 'buy' | 'sell';

export interface TradeDialogProps {
	open: boolean;
	side: TradeSide;
	creatorName: string;
	availableHoldings: number | null;
	isBalanceLoading?: boolean;
	/** Per-key price in stroops, shown on the buy confirmation step. */
	keyPriceStroops?: number | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: (amount: number) => Promise<void> | void;
	isSubmitting?: boolean;
	networkFeeEstimateProvider?: NetworkFeeDataProvider;
}

type NetworkFeeEstimateState =
	| { status: 'idle' | 'loading' | 'error'; fee: null }
	| { status: 'success'; fee: number };

const TradeDialog: React.FC<TradeDialogProps> = ({
	open,
	side,
	creatorName,
	availableHoldings,
	isBalanceLoading = false,
	keyPriceStroops,
	onOpenChange,
	onConfirm,
	isSubmitting = false,
	networkFeeEstimateProvider,
}) => {
	const [amountText, setAmountText] = useState('1');
	const [networkFeeEstimate, setNetworkFeeEstimate] =
		useState<NetworkFeeEstimateState>({ status: 'idle', fee: null });
	const [adjustmentNote, setAdjustmentNote] = useState<string | null>(null);
	const amountInputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (open) {
			setAmountText('1');
			setAdjustmentNote(null);
		}
	}, [open]);

	const handleBlur = () => {
		if (side !== 'buy') return;

		const trimmed = amountText.trim();
		const res = clampBuyQuantity(trimmed);

		if (res.adjusted) {
			setAmountText(res.value.toString());
			if (res.reason === 'below_min') {
				setAdjustmentNote(`Quantity adjusted to the minimum of ${res.value}.`);
			} else if (res.reason === 'above_max') {
				setAdjustmentNote(`Quantity adjusted to the maximum of ${res.value}.`);
			} else {
				setAdjustmentNote(`Quantity rounded to ${res.value}.`);
			}
		} else {
			setAdjustmentNote(null);
		}
	};

	const parsedAmount = useMemo(() => {
		const normalized = amountText.trim();
		if (!normalized) return NaN;
		return Number(normalized);
	}, [amountText]);

	const amountValid =
		Number.isFinite(parsedAmount) &&
		parsedAmount > 0 &&
		!isBalanceLoading &&
		(side !== 'sell' ||
			(availableHoldings != null && parsedAmount <= availableHoldings));

	const displayCreatorName =
		normalizeCreatorDisplayName(creatorName) || 'Unnamed creator';
	const title = side === 'buy' ? 'Buy keys' : 'Sell keys';
	const confirmLabel = side === 'buy' ? 'Confirm buy' : 'Confirm sell';
	const estimatedNetworkFee = formatTransactionFeeDisplay(
		networkFeeEstimate.status === 'success'
			? networkFeeEstimate.fee
			: TRADE_FEE_ESTIMATE.DEFAULT_NETWORK_FEE,
		{ unit: TRADE_FEE_ESTIMATE.UNIT }
	);
	const networkFeeCopy =
		networkFeeEstimate.status === 'loading'
			? 'Estimating...'
			: networkFeeEstimate.status === 'error'
				? 'Cannot estimate network fee'
				: estimatedNetworkFee;

	useEffect(() => {
		if (!open) {
			setNetworkFeeEstimate({ status: 'idle', fee: null });
			return;
		}

		if (!amountValid || !networkFeeEstimateProvider) {
			setNetworkFeeEstimate({ status: 'error', fee: null });
			return;
		}

		let cancelled = false;
		setNetworkFeeEstimate({ status: 'loading', fee: null });

		fetchTradeNetworkFeeEstimate(networkFeeEstimateProvider, {
			side,
			amount: parsedAmount,
		})
			.then(fee => {
				if (cancelled) return;
				setNetworkFeeEstimate(
					fee == null
						? { status: 'error', fee: null }
						: { status: 'success', fee }
				);
			})
			.catch(() => {
				if (!cancelled) {
					setNetworkFeeEstimate({ status: 'error', fee: null });
				}
			});

		return () => {
			cancelled = true;
		};
	}, [
		amountValid,
		networkFeeEstimateProvider,
		open,
		parsedAmount,
		side,
	]);

	return (
		<Dialog
			open={open}
			onOpenChange={next => !isSubmitting && onOpenChange(next)}
		>
			<DialogContent
				className="max-w-md"
				showCloseButton={!isSubmitting}
				showEscapeHint={!isSubmitting}
				onOpenAutoFocus={event => {
					event.preventDefault();
					amountInputRef.current?.focus();
				}}
				onEscapeKeyDown={event => {
					if (isSubmitting) event.preventDefault();
				}}
				onInteractOutside={event => {
					if (isSubmitting) event.preventDefault();
				}}
			>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						{side === 'buy'
							? `Purchase creator keys for ${displayCreatorName}.`
							: `Sell creator keys for ${displayCreatorName}.`}
					</DialogDescription>
				</DialogHeader>

				{side === 'buy' && keyPriceStroops != null && (
					<p className="text-sm text-white/60">
						Unit price:{' '}
						<span className="font-semibold text-amber-300/90 tabular-nums">
							{formatDisplayKeyPrice(keyPriceStroops)}
						</span>
					</p>
				)}

				<div className="space-y-2">
					<div className="text-sm text-white/70">Amount</div>
					<input
						ref={amountInputRef}
						inputMode="decimal"
						value={amountText}
						onChange={event => {
							setAmountText(event.target.value);
							setAdjustmentNote(null);
						}}
						onBlur={handleBlur}
						disabled={isSubmitting}
						className={cn(
							'w-full rounded-xl border bg-white/[0.04] px-3 py-2 text-white outline-none transition-colors',
							'border-white/10 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15',
							!amountValid && amountText.trim()
								? 'border-red-500/40'
								: ''
						)}
						aria-label="Trade amount"
						data-focus-order="1"
						data-testid="trade-dialog-amount"
					/>
					{side === 'buy' && adjustmentNote && (
						<div className="text-xs text-amber-400 font-medium animate-in fade-in duration-200" data-testid="buy-qty-adjustment-note">
							{adjustmentNote}
						</div>
					)}
					<div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
						<span
							aria-busy={isBalanceLoading || undefined}
							aria-label={
								isBalanceLoading || availableHoldings == null
									? 'Current wallet holdings loading'
									: `Current wallet holdings: ${formatNumber(
										availableHoldings
									)} keys`
							}
							role="status"
						>
							{isBalanceLoading || availableHoldings == null
								? 'Holdings: Loading...'
								: `Holdings: ${formatNumber(availableHoldings)} keys`}
						</span>
						{side === 'sell' &&
							!isBalanceLoading &&
							availableHoldings != null &&
							availableHoldings > 0 &&
							Number.isFinite(parsedAmount) &&
							parsedAmount > 0 && (
								<PercentageBadge
									label="of holdings"
									value={(parsedAmount / availableHoldings) * 100}
									tone={
										parsedAmount > availableHoldings
											? 'negative'
											: 'neutral'
									}
								/>
							)}
					</div>
					<NetworkFeeHint
						variant="text"
						label="Approx. network fee"
						fee={networkFeeCopy}
						className="text-white/45"
					/>
					{side === 'sell' &&
						!isBalanceLoading &&
						availableHoldings != null &&
						parsedAmount > availableHoldings && (
							<div className="text-xs text-red-300">
								You can’t sell more than your current holdings.
							</div>
						)}
				</div>

				{/*
				 * Focus order is intentional: amount input → Cancel → Confirm.
				 * That matches the visual left-to-right reading order in the
				 * footer (`sm:justify-between` puts Cancel on the left, Confirm
				 * on the right) and keeps the destructive action one Tab away
				 * from the primary action so users always pass through Cancel
				 * before reaching Confirm. The covering test in
				 * `__tests__/TradeDialog.focusOrder.test.tsx` guards this.
				 */}
				<DialogFooter className="sm:justify-between">
					<Button
						type="button"
						variant="ghost"
						onClick={() => onOpenChange(false)}
						disabled={isSubmitting}
						data-focus-order="2"
						data-testid="trade-dialog-cancel"
					>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={() => onConfirm(parsedAmount)}
						disabled={!amountValid || isSubmitting}
						aria-busy={isSubmitting || undefined}
						data-focus-order="3"
						data-testid="trade-dialog-confirm"
					>
						<StableButtonContent
							isLoading={isSubmitting}
							loadingLabel="Submitting…"
						>
							{confirmLabel}
						</StableButtonContent>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default TradeDialog;
