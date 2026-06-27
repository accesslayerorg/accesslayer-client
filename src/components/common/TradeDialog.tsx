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
import { formatTransactionFeeDisplay } from '@/utils/transactionFee.utils';

export type TradeSide = 'buy' | 'sell';

export interface TradeDialogProps {
	open: boolean;
	side: TradeSide;
	creatorName: string;
	availableHoldings: number;
	/** Per-key price in stroops, shown on the buy confirmation step. */
	keyPriceStroops?: number | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: (amount: number) => Promise<void> | void;
	isSubmitting?: boolean;
}

const TradeDialog: React.FC<TradeDialogProps> = ({
	open,
	side,
	creatorName,
	availableHoldings,
	keyPriceStroops,
	onOpenChange,
	onConfirm,
	isSubmitting = false,
}) => {
	const [amountText, setAmountText] = useState('1');
	const [touched, setTouched] = useState(false);
	const amountInputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (open) {
			setAmountText('1');
			setTouched(false);
		}
	}, [open]);

	const parsedAmount = useMemo(() => {
		const normalized = amountText.trim();
		if (!normalized) return NaN;
		return Number(normalized);
	}, [amountText]);

	const validationError = useMemo((): string | null => {
		const normalized = amountText.trim();
		if (!normalized) return 'Please enter an amount.';
		if (!Number.isFinite(parsedAmount)) return 'Amount must be a valid number.';
		if (parsedAmount <= 0) return 'Amount must be greater than zero.';
		if (side === 'sell' && parsedAmount > availableHoldings)
			return `You can't sell more than your holdings (${formatNumber(availableHoldings)} keys).`;
		return null;
	}, [amountText, parsedAmount, side, availableHoldings]);

	const amountValid = validationError === null;
	const showError = touched && validationError !== null;

	const title = side === 'buy' ? 'Buy keys' : 'Sell keys';
	const confirmLabel = side === 'buy' ? 'Confirm buy' : 'Confirm sell';
	const estimatedNetworkFee = formatTransactionFeeDisplay(
		TRADE_FEE_ESTIMATE.DEFAULT_NETWORK_FEE,
		{ unit: TRADE_FEE_ESTIMATE.UNIT }
	);

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
							? `Purchase creator keys for ${creatorName}.`
							: `Sell creator keys for ${creatorName}.`}
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
							setTouched(true);
						}}
						onBlur={() => setTouched(true)}
						disabled={isSubmitting}
						className={cn(
							'w-full rounded-xl border bg-white/[0.04] px-3 py-2 text-white outline-none transition-colors',
							'border-white/10 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15',
							showError ? 'border-red-500/60' : ''
						)}
						aria-label="Trade amount"
						aria-describedby={showError ? 'trade-amount-error' : undefined}
						aria-invalid={showError || undefined}
						data-focus-order="1"
						data-testid="trade-dialog-amount"
					/>
					{showError && (
						<p
							id="trade-amount-error"
							role="alert"
							className="text-xs text-red-300"
							data-testid="trade-dialog-amount-error"
						>
							{validationError}
						</p>
					)}
					<div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
						<span
							aria-label={`Current wallet holdings: ${formatNumber(availableHoldings)} keys`}
						>
							Holdings: {formatNumber(availableHoldings)} keys
						</span>
						{side === 'sell' &&
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
					{side === 'buy' && (
						<NetworkFeeHint
							variant="text"
							fee={estimatedNetworkFee}
							className="text-white/45"
						/>
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
