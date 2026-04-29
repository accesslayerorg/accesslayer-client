import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
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
import PercentageBadge from '@/components/common/PercentageBadge';

export type TradeSide = 'buy' | 'sell';

export interface TradeDialogProps {
	open: boolean;
	side: TradeSide;
	creatorName: string;
	availableHoldings: number;
	onOpenChange: (open: boolean) => void;
	onConfirm: (amount: number) => Promise<void> | void;
	isSubmitting?: boolean;
}

const TradeDialog: React.FC<TradeDialogProps> = ({
	open,
	side,
	creatorName,
	availableHoldings,
	onOpenChange,
	onConfirm,
	isSubmitting = false,
}) => {
	const [amountText, setAmountText] = useState('1');
	const amountInputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (open) setAmountText('1');
	}, [open]);

	const parsedAmount = useMemo(() => {
		const normalized = amountText.trim();
		if (!normalized) return NaN;
		return Number(normalized);
	}, [amountText]);

	const amountValid =
		Number.isFinite(parsedAmount) &&
		parsedAmount > 0 &&
		(side !== 'sell' || parsedAmount <= availableHoldings);

	const title = side === 'buy' ? 'Buy keys' : 'Sell keys';
	const confirmLabel = side === 'buy' ? 'Confirm buy' : 'Confirm sell';

	return (
		<Dialog open={open} onOpenChange={next => !isSubmitting && onOpenChange(next)}>
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

				<div className="space-y-2">
					<div className="text-sm text-white/70">Amount</div>
					<input
						ref={amountInputRef}
						inputMode="decimal"
						value={amountText}
						onChange={event => setAmountText(event.target.value)}
						disabled={isSubmitting}
						className={cn(
							'w-full rounded-xl border bg-white/[0.04] px-3 py-2 text-white outline-none transition-colors',
							'border-white/10 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15',
							!amountValid && amountText.trim() ? 'border-red-500/40' : ''
						)}
						aria-label="Trade amount"
						data-focus-order="1"
						data-testid="trade-dialog-amount"
					/>
					<div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
						<span>Holdings: {formatNumber(availableHoldings)} keys</span>
						{side === 'sell' &&
							availableHoldings > 0 &&
							Number.isFinite(parsedAmount) &&
							parsedAmount > 0 && (
								<PercentageBadge
									label="of holdings"
									value={(parsedAmount / availableHoldings) * 100}
									tone={
										parsedAmount > availableHoldings ? 'negative' : 'neutral'
									}
								/>
							)}
					</div>
					{side === 'sell' && parsedAmount > availableHoldings && (
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
						data-focus-order="3"
						data-testid="trade-dialog-confirm"
					>
						{isSubmitting ? 'Submitting…' : confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default TradeDialog;
