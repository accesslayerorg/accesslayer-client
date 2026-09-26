import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	ledgersToMinutes,
	minutesToLedgers,
	validateBuyCooldownInput,
	MAX_BUY_COOLDOWN_MINUTES,
} from '@/utils/buyCooldownConfig.utils';

export interface BuyCooldownPanelProps {
	/** Current on-chain cooldown in ledgers (~5s per ledger). */
	buyCooldownLedgers?: number;
	/** Called with the new cooldown in ledgers. */
	onSubmit: (cooldownLedgers: number) => void;
	isSubmitting?: boolean;
}

const fieldClass =
	'w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-amber-400/40 focus:ring-[3px] focus:ring-amber-400/20 disabled:opacity-50';

/**
 * Buy Cooldown panel for the creator dashboard settings tab (#889).
 *
 * Shows the current per-wallet delay between consecutive buys (converted
 * from the on-chain ledger value to minutes, "No cooldown" when 0) and lets
 * the creator set a new delay in minutes (0–60). The minutes are converted
 * back to ledger units (~1 ledger per 5 seconds) and submitted via the
 * `set_buy_cooldown` contract function.
 */
const BuyCooldownPanel: React.FC<BuyCooldownPanelProps> = ({
	buyCooldownLedgers,
	onSubmit,
	isSubmitting = false,
}) => {
	const toDisplay = (ledgers: number | undefined): string => {
		const minutes = ledgersToMinutes(ledgers);
		return minutes === 0 ? '0' : String(minutes);
	};

	const [cooldownInput, setCooldownInput] = useState(toDisplay(buyCooldownLedgers));
	const [showError, setShowError] = useState(false);

	// Keep the input aligned with upstream value after a save refetches it.
	useEffect(() => {
		setCooldownInput(toDisplay(buyCooldownLedgers));
		setShowError(false);
	}, [buyCooldownLedgers]);

	const currentMinutes = ledgersToMinutes(buyCooldownLedgers);

	const { error: errorMessage, isValid } = validateBuyCooldownInput(cooldownInput);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;
		if (!isValid) {
			setShowError(true);
			return;
		}
		// Convert minutes → ledgers (~1 ledger per 5 seconds) before submitting.
		onSubmit(minutesToLedgers(Number(cooldownInput.trim())));
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="space-y-4"
			noValidate
			data-testid="buy-cooldown-panel"
		>
			<div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
				<p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">
					Current cooldown
				</p>
				<p className="mt-1 font-jakarta text-sm font-bold text-white" data-testid="buy-cooldown-display">
					{currentMinutes === 0 ? 'No cooldown' : `${currentMinutes} min`}
				</p>
			</div>

			<div className="space-y-1.5">
				<label
					htmlFor="buy-cooldown"
					className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
				>
					Buy cooldown (minutes)
				</label>
				<input
					id="buy-cooldown"
					data-testid="buy-cooldown-input"
					type="number"
					inputMode="numeric"
					min={0}
					max={MAX_BUY_COOLDOWN_MINUTES}
					step={1}
					className={fieldClass}
					value={cooldownInput}
					onChange={e => setCooldownInput(e.target.value)}
					disabled={isSubmitting}
					placeholder="No cooldown"
					aria-describedby="buy-cooldown-hint"
					aria-invalid={showError && !isValid ? 'true' : undefined}
				/>
				<p
					id="buy-cooldown-hint"
					className="text-xs text-white/40"
					data-testid="buy-cooldown-hint"
				>
					Delay between consecutive buys from the same wallet (0 = no cooldown)
				</p>
				{showError && errorMessage && (
					<p
						role="alert"
						data-testid="buy-cooldown-error"
						className="text-xs text-red-400"
					>
						{errorMessage}
					</p>
				)}
			</div>

			<Button
				type="submit"
				data-testid="buy-cooldown-submit"
				disabled={isSubmitting || (showError && !isValid)}
			>
				{isSubmitting ? 'Submitting…' : 'Save cooldown'}
			</Button>
		</form>
	);
};

export default BuyCooldownPanel;