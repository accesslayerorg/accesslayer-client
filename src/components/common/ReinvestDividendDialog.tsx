import { useEffect, useRef } from 'react';
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
import { formatNumber } from '@/utils/numberFormat.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import {
	estimateReinvest,
	type ReinvestEstimate,
} from '@/utils/reinvestDividend.utils';

export interface ReinvestDividendDialogProps {
	open: boolean;
	/** Creator key name being reinvested into. */
	creatorName: string;
	/** Unclaimed dividend balance in XLM. */
	unclaimedDividend: number;
	/** Per-key price in stroops used to estimate the purchase. */
	keyPriceStroops?: number | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => Promise<void> | void;
	isSubmitting?: boolean;
}

/**
 * Confirmation modal for reinvesting an unclaimed dividend balance back into
 * creator keys (#824). Shows the unclaimed amount, the estimated keys to be
 * bought, and any XLM remainder that cannot be converted to a whole key.
 */
const ReinvestDividendDialog: React.FC<ReinvestDividendDialogProps> = ({
	open,
	creatorName,
	unclaimedDividend,
	keyPriceStroops,
	onOpenChange,
	onConfirm,
	isSubmitting = false,
}) => {
	const triggerElementRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (open) {
			triggerElementRef.current =
				document.activeElement as HTMLElement | null;
		}
	}, [open]);

	const estimate: ReinvestEstimate | null = estimateReinvest(
		unclaimedDividend,
		keyPriceStroops
	);

	const confirmDisabled =
		isSubmitting ||
		estimate == null ||
		estimate.wholeKeys <= 0 ||
		estimate.unclaimedStroops <= 0;

	const handleConfirm = async () => {
		if (confirmDisabled) return;
		await onConfirm();
	};

	return (
		<Dialog
			open={open}
			onOpenChange={next => !isSubmitting && onOpenChange(next)}
		>
			<DialogContent
				className="max-w-md"
				showCloseButton={!isSubmitting}
				showEscapeHint={!isSubmitting}
				onCloseAutoFocus={event => {
					event.preventDefault();
					triggerElementRef.current?.focus();
				}}
				onEscapeKeyDown={event => {
					if (isSubmitting) event.preventDefault();
				}}
				onInteractOutside={event => {
					if (isSubmitting) event.preventDefault();
				}}
			>
				<DialogHeader>
					<DialogTitle>Reinvest dividends</DialogTitle>
					<DialogDescription>
						Compound your unclaimed{' '}
						{formatDisplayKeyPrice(estimate?.unclaimedStroops)} dividend
						into more {creatorName} creator keys.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
					<div className="flex items-center justify-between">
						<span className="text-white/60">Unclaimed dividends</span>
						<span className="font-semibold text-white tabular-nums">
							{formatDisplayKeyPrice(estimate?.unclaimedStroops)}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-white/60">Per-key price</span>
						<span className="font-semibold text-white tabular-nums">
							{formatDisplayKeyPrice(keyPriceStroops)}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-white/60">Estimated keys</span>
						<span className="font-semibold text-amber-300/90 tabular-nums">
							{estimate
								? `${formatNumber(estimate.wholeKeys)} key${
										estimate.wholeKeys === 1 ? '' : 's'
									}`
								: 'Unavailable'}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-white/60">XLM remainder</span>
						<span className="font-semibold text-white tabular-nums">
							{estimate
								? formatDisplayKeyPrice(estimate.remainderStroops)
								: '—'}
						</span>
					</div>
				</div>

				<DialogFooter className="sm:justify-between">
					<Button
						type="button"
						variant="ghost"
						onClick={() => onOpenChange(false)}
						disabled={isSubmitting}
						data-testid="reinvest-dialog-cancel"
					>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={handleConfirm}
						disabled={confirmDisabled}
						aria-busy={isSubmitting || undefined}
						data-testid="reinvest-dialog-confirm"
					>
						<StableButtonContent
							isLoading={isSubmitting}
							loadingLabel="Submitting…"
						>
							Confirm reinvest
						</StableButtonContent>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default ReinvestDividendDialog;
