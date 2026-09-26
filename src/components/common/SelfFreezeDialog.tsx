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
import { formatNumber } from '@/utils/numberFormat.utils';
import type { SelfFreezeAction } from '@/hooks/useWallet';

interface SelfFreezeDialogProps {
	open: boolean;
	action: SelfFreezeAction;
	creatorName: string;
	availableQuantity: number;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (amount: number) => Promise<void> | void;
}

export default function SelfFreezeDialog({
	open,
	action,
	creatorName,
	availableQuantity,
	isSubmitting = false,
	onOpenChange,
	onConfirm,
}: SelfFreezeDialogProps) {
	const [amountText, setAmountText] = useState('1');
	const [touched, setTouched] = useState(false);
	const amountInputRef = useRef<HTMLInputElement | null>(null);
 
	useEffect(() => {
		if (open) {
			setAmountText('1');
			setTouched(false);
		}
	}, [open]);

	const amount = Number(amountText);
	const validationError = useMemo(() => {
		if (!amountText.trim()) return 'Please enter an amount.';
		if (!Number.isFinite(amount) || amount <= 0)
			return 'Amount must be greater than zero.';
		if (amount > availableQuantity)
			return `You can't ${action} more than your available balance (${formatNumber(availableQuantity)} keys).`;
		return null;
	}, [action, amount, amountText, availableQuantity]);
	const showError = touched && validationError !== null;
	const label = action === 'freeze' ? 'Freeze' : 'Unfreeze';

	return (
		<Dialog open={open} onOpenChange={next => !isSubmitting && onOpenChange(next)}>
			<DialogContent
				className="max-w-md"
				showCloseButton={!isSubmitting}
				onOpenAutoFocus={event => {
					event.preventDefault();
					amountInputRef.current?.focus();
				}}
			>
				<DialogHeader>
					<DialogTitle>{label} keys</DialogTitle>
					<DialogDescription>
						{label} keys for {creatorName} so they {action === 'freeze' ? 'cannot be sold or transferred' : 'can be sold or transferred again'}.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2">
					<label htmlFor="self-freeze-amount" className="text-sm text-white/70">
						Amount
					</label>
					<input
						ref={amountInputRef}
						id="self-freeze-amount"
						inputMode="decimal"
						value={amountText}
						onChange={event => {
							setAmountText(event.target.value);
							setTouched(true);
						}}
						disabled={isSubmitting}
						className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-white outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15"
						aria-label={`${label} quantity`}
						aria-invalid={showError || undefined}
						data-testid="self-freeze-amount"
					/>
					{showError && <p role="alert" className="text-xs text-red-300">{validationError}</p>}
					<p className="text-xs text-white/45">Available: {formatNumber(availableQuantity)} keys</p>
				</div>
				<DialogFooter className="sm:justify-between">
					<Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={() => onConfirm(amount)}
						disabled={validationError !== null || isSubmitting}
						aria-busy={isSubmitting || undefined}
						data-testid="self-freeze-confirm"
					>
						<StableButtonContent isLoading={isSubmitting} loadingLabel="Submitting…">
							{label}
						</StableButtonContent>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}