import { useEffect, useMemo, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/common/FormInput';
import InlineValidationMessage from '@/components/common/InlineValidationMessage';
import type { AlertDirection, PriceAlert } from '@/services/alert.service';

export interface PriceAlertModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	keyId: string;
	keyName: string;
	currentPrice: number;
	existingAlert?: PriceAlert | null;
	onSubmit: (input: { targetPrice: number; direction: AlertDirection }) => Promise<void> | void;
	isSubmitting?: boolean;
	submitError?: string | null;
}

function validateTargetPrice(
	raw: string,
	direction: AlertDirection,
	currentPrice: number
): string | null {
	if (!raw.trim()) return 'Target price is required.';
	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return 'Target price must be a positive number.';
	}
	if (direction === 'above' && parsed <= currentPrice) {
		return `An "above" alert needs a target greater than the current price (${currentPrice}).`;
	}
	if (direction === 'below' && parsed >= currentPrice) {
		return `A "below" alert needs a target less than the current price (${currentPrice}).`;
	}
	return null;
}

export function PriceAlertModal({
	open,
	onOpenChange,
	keyId,
	keyName,
	currentPrice,
	existingAlert,
	onSubmit,
	isSubmitting = false,
	submitError = null,
}: PriceAlertModalProps) {
	void keyId;

	const isEditing = Boolean(existingAlert);
	const [direction, setDirection] = useState<AlertDirection>(
		existingAlert?.direction ?? 'above'
	);
	const [targetPrice, setTargetPrice] = useState<string>(
		existingAlert?.targetPrice != null ? String(existingAlert.targetPrice) : ''
	);
	const [touched, setTouched] = useState(false);

	useEffect(() => {
		if (!open) return;
		setDirection(existingAlert?.direction ?? 'above');
		setTargetPrice(
			existingAlert?.targetPrice != null ? String(existingAlert.targetPrice) : ''
		);
		setTouched(false);
	}, [open, existingAlert]);

	const validationError = useMemo(
		() => validateTargetPrice(targetPrice, direction, currentPrice),
		[targetPrice, direction, currentPrice]
	);
	const canSubmit = validationError === null && !isSubmitting;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setTouched(true);
		if (!canSubmit) return;
		await onSubmit({ targetPrice: Number(targetPrice), direction });
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent data-testid="price-alert-modal">
				<form onSubmit={handleSubmit} noValidate>
					<DialogHeader>
						<DialogTitle>
							{isEditing ? 'Edit price alert' : 'Set price alert'}
						</DialogTitle>
						<DialogDescription>
							Get an in-app notification when {keyName}&apos;s key price crosses
							your threshold. Current price:{' '}
							<strong data-testid="price-alert-current">{currentPrice} XLM</strong>.
						</DialogDescription>
					</DialogHeader>

					<div className="mt-4 space-y-4">
						<fieldset className="space-y-2" data-testid="price-alert-direction">
							<legend className="text-sm font-semibold">Direction</legend>
							<label className="flex items-center gap-2 text-sm">
								<input
									type="radio"
									name="direction"
									value="above"
									checked={direction === 'above'}
									onChange={() => setDirection('above')}
									data-testid="direction-above"
								/>
								Alert me when price rises above target
							</label>
							<label className="flex items-center gap-2 text-sm">
								<input
									type="radio"
									name="direction"
									value="below"
									checked={direction === 'below'}
									onChange={() => setDirection('below')}
									data-testid="direction-below"
								/>
								Alert me when price falls below target
							</label>
						</fieldset>

						<FormInput
							label="Target price (XLM)"
							id="price-alert-target"
							type="number"
							placeholder="0.00"
							value={targetPrice}
							onChange={value => {
								setTargetPrice(value);
								setTouched(true);
							}}
							error={touched && validationError ? validationError : ''}
							touched={touched}
							required
						/>

						{submitError && (
							<InlineValidationMessage message={submitError} />
						)}
					</div>

					<DialogFooter className="mt-6">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={!canSubmit}
							data-testid="price-alert-submit"
						>
							{isSubmitting
								? 'Saving…'
								: isEditing
									? 'Save changes'
									: 'Create alert'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default PriceAlertModal;
