import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const MIN_PENALTY_PCT = 0;
const MAX_PENALTY_PCT = 20;

export interface LaunchPenaltyPanelProps {
	/** Current launch penalty in basis points (0–2000). */
	launchPenaltyBps?: number;
	/** Called with the new penalty value in basis points. */
	onSubmit: (penaltyBps: number) => void;
	isSubmitting?: boolean;
}

const fieldClass =
	'w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-amber-400/40 focus:ring-[3px] focus:ring-amber-400/20 disabled:opacity-50';

/**
 * Launch penalty configuration panel for the creator dashboard settings tab.
 *
 * Displays the current early-sell penalty percentage (derived from
 * `launchPenaltyBps`) and lets the creator update it via the
 * `set_launch_penalty` contract call. Input is constrained to 0–20%.
 */
const LaunchPenaltyPanel: React.FC<LaunchPenaltyPanelProps> = ({
	launchPenaltyBps,
	onSubmit,
	isSubmitting = false,
}) => {
	// Convert bps → display percentage string (e.g. 500 bps → "5")
	const bpsToDisplay = (bps: number | undefined): string =>
		bps != null ? String(bps / 100) : '';

	const [penaltyInput, setPenaltyInput] = useState(
		bpsToDisplay(launchPenaltyBps)
	);
	const [showError, setShowError] = useState(false);

	// Keep input aligned with upstream value after a successful save refetches it.
	useEffect(() => {
		setPenaltyInput(bpsToDisplay(launchPenaltyBps));
		setShowError(false);
	}, [launchPenaltyBps]);

	const parsed = parseFloat(penaltyInput);
	const isValueValid =
		penaltyInput.trim() !== '' &&
		!isNaN(parsed) &&
		parsed >= MIN_PENALTY_PCT &&
		parsed <= MAX_PENALTY_PCT;

	const errorMessage = (() => {
		if (penaltyInput.trim() === '') return 'Penalty percentage is required';
		if (isNaN(parsed)) return 'Enter a valid number';
		if (parsed < MIN_PENALTY_PCT) return 'Minimum is 0%';
		if (parsed > MAX_PENALTY_PCT) return 'Maximum is 20%';
		return null;
	})();

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;
		if (!isValueValid) {
			setShowError(true);
			return;
		}
		// Convert percentage → basis points, rounding to the nearest integer.
		const bps = Math.round(parsed * 100);
		onSubmit(bps);
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="space-y-4"
			noValidate
			data-testid="launch-penalty-panel"
		>
			<div className="space-y-1.5">
				<label
					htmlFor="launch-penalty"
					className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
				>
					Launch penalty (%)
				</label>
				<input
					id="launch-penalty"
					data-testid="launch-penalty-input"
					type="number"
					inputMode="decimal"
					min={MIN_PENALTY_PCT}
					max={MAX_PENALTY_PCT}
					step="0.01"
					className={fieldClass}
					value={penaltyInput}
					onChange={e => setPenaltyInput(e.target.value)}
					disabled={isSubmitting}
					placeholder="0"
					aria-describedby="launch-penalty-hint"
					aria-invalid={showError && !isValueValid ? 'true' : undefined}
				/>
				<p
					id="launch-penalty-hint"
					className="text-xs text-white/40"
					data-testid="launch-penalty-hint"
				>
					Applied to sells within the first 7 days after key creation
				</p>
				{showError && errorMessage && (
					<p
						role="alert"
						data-testid="launch-penalty-error"
						className="text-xs text-red-400"
					>
						{errorMessage}
					</p>
				)}
			</div>

			<Button
				type="submit"
				data-testid="launch-penalty-submit"
				disabled={isSubmitting || (showError && !isValueValid)}
			>
				{isSubmitting ? 'Submitting…' : 'Save penalty'}
			</Button>
		</form>
	);
};

export default LaunchPenaltyPanel;
