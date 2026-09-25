import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export interface MaxBuyQuantityPanelProps {
	/** Current max buy quantity; null/0/undefined means no limit. */
	maxBuyQuantity?: number | null;
	/** Called with the new quantity (0 = no limit). */
	onSubmit: (maxBuyQuantity: number) => void;
	isSubmitting?: boolean;
}

const fieldClass =
	'w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-amber-400/40 focus:ring-[3px] focus:ring-amber-400/20 disabled:opacity-50';

/**
 * Max Buy Per Transaction panel for the creator dashboard settings tab (#888).
 *
 * Shows the current `maxBuyQuantity` fetched from the key detail API,
 * lets the creator set a limit via a number input (1–10000, blank = no limit),
 * and submits via the `set_max_buy_quantity` contract function.
 */
const MaxBuyQuantityPanel: React.FC<MaxBuyQuantityPanelProps> = ({
	maxBuyQuantity,
	onSubmit,
	isSubmitting = false,
}) => {
	const toDisplay = (value: number | null | undefined): string => {
		if (value == null || value === 0) return '';
		return String(value);
	};

	const [input, setInput] = useState(toDisplay(maxBuyQuantity));
	const [showError, setShowError] = useState(false);

	useEffect(() => {
		setInput(toDisplay(maxBuyQuantity));
		setShowError(false);
	}, [maxBuyQuantity]);

	const trimmed = input.trim();
	const isBlank = trimmed === '';
	const parsed = isBlank ? NaN : Number(trimmed);
	const isValid = isBlank || (!isNaN(parsed) && Number.isInteger(parsed) && parsed >= 1 && parsed <= 10000);

	const errorMessage = (() => {
		if (isBlank) return null;
		if (trimmed === '') return null;
		if (isNaN(parsed) || !Number.isInteger(parsed)) return 'Enter a valid whole number';
		if (parsed < 1) return 'Minimum is 1';
		if (parsed > 10000) return 'Maximum is 10000';
		return null;
	})();

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;
		if (!isValid) {
			setShowError(true);
			return;
		}
		const value = isBlank ? 0 : parsed;
		onSubmit(value);
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="space-y-4"
			noValidate
			data-testid="max-buy-quantity-panel"
		>
			<div className="space-y-1.5">
				<label
					htmlFor="max-buy-quantity"
					className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
				>
					Max Buy Per Transaction
				</label>
				<input
					id="max-buy-quantity"
					data-testid="max-buy-quantity-input"
					type="number"
					inputMode="numeric"
					min={1}
					max={10000}
					step={1}
					className={fieldClass}
					value={input}
					onChange={e => setInput(e.target.value)}
					disabled={isSubmitting}
					placeholder="No limit"
					aria-describedby="max-buy-quantity-hint"
					aria-invalid={showError && !isValid ? 'true' : undefined}
				/>
				<p
					id="max-buy-quantity-hint"
					className="text-xs text-white/40"
					data-testid="max-buy-quantity-hint"
				>
					Limits the number of keys a single wallet can buy in one transaction
				</p>
				{showError && errorMessage && (
					<p
						role="alert"
						data-testid="max-buy-quantity-error"
						className="text-xs text-red-400"
					>
						{errorMessage}
					</p>
				)}
			</div>

			<Button
				type="submit"
				data-testid="max-buy-quantity-submit"
				disabled={isSubmitting || (showError && !isValid)}
			>
				{isSubmitting ? 'Submitting…' : 'Save limit'}
			</Button>
		</form>
	);
};

export default MaxBuyQuantityPanel;
