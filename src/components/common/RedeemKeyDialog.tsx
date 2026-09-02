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
import { estimateRedeemValue, type RedeemEstimate } from '@/utils/keyDeprecation.utils';
import type { CreatorKeyPriceFields } from '@/utils/keyPriceDisplay.utils';

export interface RedeemKeyDialogProps {
	open: boolean;
	/** Creator key name being redeemed. */
	creatorName: string;
	/** Quantity of keys held, to be redeemed in full. */
	quantity: number;
	/** Price fields used to estimate the redemption value. */
	priceFields: CreatorKeyPriceFields;
	/** Optional reason the key was deprecated, shown for context. */
	deprecationReason?: string | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => Promise<void> | void;
	isSubmitting?: boolean;
}

/**
 * Confirmation modal for redeeming a held position in a deprecated key
 * (#871) for its current value, since deprecated keys can no longer be
 * bought/sold on the open market.
 */
const RedeemKeyDialog: React.FC<RedeemKeyDialogProps> = ({
	open,
	creatorName,
	quantity,
	priceFields,
	deprecationReason,
	onOpenChange,
	onConfirm,
	isSubmitting = false,
}) => {
	const triggerElementRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (open) {
			triggerElementRef.current = document.activeElement as HTMLElement | null;
		}
	}, [open]);

	const estimate: RedeemEstimate | null = estimateRedeemValue(
		quantity,
		priceFields
	);

	const confirmDisabled =
		isSubmitting || estimate == null || estimate.totalValueStroops <= 0;

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
					<DialogTitle>Redeem deprecated key</DialogTitle>
					<DialogDescription>
						{creatorName} keys have been deprecated and can no longer be
						bought or sold.{' '}
						{deprecationReason ??
							'Redeem your position below for its current value.'}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
					<div className="flex items-center justify-between">
						<span className="text-white/60">Keys held</span>
						<span className="font-semibold text-white tabular-nums">
							{formatNumber(quantity)}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-white/60">Per-key price</span>
						<span className="font-semibold text-white tabular-nums">
							{formatDisplayKeyPrice(estimate?.keyPriceStroops)}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-white/60">Redemption value</span>
						<span className="font-semibold text-amber-300/90 tabular-nums">
							{estimate
								? formatDisplayKeyPrice(estimate.totalValueStroops)
								: 'Unavailable'}
						</span>
					</div>
				</div>

				<DialogFooter className="sm:justify-between">
					<Button
						type="button"
						variant="ghost"
						onClick={() => onOpenChange(false)}
						disabled={isSubmitting}
						data-testid="redeem-dialog-cancel"
					>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={handleConfirm}
						disabled={confirmDisabled}
						aria-busy={isSubmitting || undefined}
						data-testid="redeem-dialog-confirm"
					>
						<StableButtonContent
							isLoading={isSubmitting}
							loadingLabel="Redeeming…"
						>
							Confirm redeem
						</StableButtonContent>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default RedeemKeyDialog;
