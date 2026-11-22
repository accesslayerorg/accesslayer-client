import React, { useMemo, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
	SLIPPAGE_PRESETS,
	validateSlippageTolerance,
	getSlippageWarning,
	calculateSlippageBounds,
	type SwapQuote,
} from '@/utils/slippage.utils';
import { formatNumber } from '@/utils/numberFormat.utils';

export interface SlippageSettingsProps {
	/** Selected tolerance percentage (e.g. 1 = 1%). */
	value?: number;
	tolerance?: number;
	onChange?: (percent: number) => void;
	onSlippageChange?: (percent: number) => void;
	/** Callback communicating whether current input is valid (disabling confirm when false). */
	onValidityChange?: (isValid: boolean) => void;
	onErrorChange?: (error: string | null) => void;
	/** Preset options in percent. Defaults to [0.5, 1, 3]. */
	presets?: readonly number[];
	/** Precomputed or passed minimum received amount. */
	minReceived?: number | string | null;
	/** Optional quote to automatically derive minimum received on preset/input change. */
	quote?: SwapQuote | number | null;
	disabled?: boolean;
	className?: string;
}

/**
 * Slippage tolerance settings component with presets (0.5%, 1%, 3%),
 * custom percentage input with inline validation (rejecting negative, NaN, >50%),
 * warning banners (>5% high tolerance, <0.1% low tolerance),
 * and dynamic minimum-received calculation.
 */
export const SlippageSettings: React.FC<SlippageSettingsProps> = ({
	value,
	tolerance: toleranceProp,
	onChange,
	onSlippageChange,
	onValidityChange,
	onErrorChange,
	presets = SLIPPAGE_PRESETS,
	minReceived: minReceivedProp,
	quote,
	disabled = false,
	className,
}) => {
	const currentTolerance = value ?? toleranceProp ?? 1;

	const isPresetActive = presets.includes(currentTolerance);
	const [customActive, setCustomActive] = useState(!isPresetActive);
	const [customText, setCustomText] = useState(
		isPresetActive ? '' : String(currentTolerance)
	);
	const [customError, setCustomError] = useState<string | null>(null);

	const triggerChange = (newVal: number) => {
		onChange?.(newVal);
		onSlippageChange?.(newVal);
	};

	const handlePresetClick = (preset: number) => {
		if (disabled) return;
		setCustomActive(false);
		setCustomText('');
		setCustomError(null);
		onValidityChange?.(true);
		onErrorChange?.(null);
		triggerChange(preset);
	};

	const handleCustomChange = (text: string) => {
		setCustomActive(true);
		setCustomText(text);

		const normalized = text.trim();
		if (!normalized) {
			const err = 'Enter a valid slippage tolerance.';
			setCustomError(err);
			onValidityChange?.(false);
			onErrorChange?.(err);
			return;
		}

		const parsed = Number(normalized);
		const err = validateSlippageTolerance(parsed);
		setCustomError(err);
		onValidityChange?.(err === null);
		onErrorChange?.(err);

		if (err === null) {
			triggerChange(parsed);
		}
	};

	// Derive minimum received amount from quote if available
	const derivedMinReceived = useMemo(() => {
		if (minReceivedProp != null) return minReceivedProp;
		if (quote != null && customError === null) {
			try {
				const bps = Math.round(currentTolerance * 100);
				const bounds = calculateSlippageBounds(quote, bps);
				return bounds.minReceived;
			} catch {
				return null;
			}
		}
		return null;
	}, [minReceivedProp, quote, currentTolerance, customError]);

	const warningMessage = useMemo(() => {
		if (customError) return null;
		return getSlippageWarning(currentTolerance);
	}, [currentTolerance, customError]);

	const isHigh = currentTolerance > 5;
	const isLow = currentTolerance < 0.1 && currentTolerance >= 0.01;

	return (
		<div
			className={cn('space-y-2.5', className)}
			data-testid="slippage-settings"
		>
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium text-white/80">
					Slippage Tolerance
				</span>
				<span
					className="font-mono text-xs font-semibold text-amber-300 tabular-nums"
					data-testid="slippage-current-value"
				>
					{currentTolerance}%
				</span>
			</div>

			{/* Presets and Custom Input */}
			<div className="flex flex-wrap items-center gap-2">
				{presets.map(preset => {
					const isSelected = !customActive && currentTolerance === preset;
					return (
						<button
							key={preset}
							type="button"
							disabled={disabled}
							onClick={() => handlePresetClick(preset)}
							aria-pressed={isSelected}
							data-testid={`slippage-preset-${preset}`}
							className={cn(
								'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
								isSelected
									? 'border-amber-500/80 bg-amber-500/20 text-amber-300 shadow-sm'
									: 'border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20 hover:text-white',
								disabled && 'cursor-not-allowed opacity-50'
							)}
						>
							{preset}%
						</button>
					);
				})}

				<div className="relative flex items-center">
					<input
						type="text"
						inputMode="decimal"
						placeholder="Custom"
						value={customText}
						disabled={disabled}
						onChange={e => handleCustomChange(e.target.value)}
						onFocus={() => setCustomActive(true)}
						aria-label="Custom slippage tolerance percentage"
						aria-invalid={customError != null}
						data-testid="slippage-custom-input"
						className={cn(
							'w-20 rounded-lg border bg-white/[0.04] px-2.5 py-1.5 pr-6 text-xs text-white outline-none transition-colors',
							customActive
								? 'border-amber-500/60 ring-2 ring-amber-500/15'
								: 'border-white/10',
							customError
								? 'border-red-500/80 ring-2 ring-red-500/20'
								: ''
						)}
					/>
					<span className="pointer-events-none absolute right-2 text-xs text-white/40">
						%
					</span>
				</div>
			</div>

			{/* Inline Validation Error */}
			{customError && (
				<p
					role="alert"
					data-testid="slippage-custom-error"
					className="text-xs font-medium text-red-400"
				>
					{customError}
				</p>
			)}

			{/* Warning Banner */}
			{warningMessage && (
				<div
					role="status"
					data-testid={
						isHigh
							? 'slippage-high-warning'
							: isLow
								? 'slippage-low-warning'
								: 'slippage-warning'
					}
					className={cn(
						'flex items-start gap-2 rounded-lg border p-2.5 text-xs',
						isHigh
							? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
							: 'border-blue-500/30 bg-blue-500/10 text-blue-200'
					)}
				>
					<AlertTriangle
						className={cn(
							'h-4 w-4 shrink-0 mt-0.5',
							isHigh ? 'text-amber-400' : 'text-blue-400'
						)}
					/>
					<span data-testid="slippage-warning-text">{warningMessage}</span>
				</div>
			)}

			{/* Minimum Received Display */}
			{derivedMinReceived != null && (
				<div className="flex items-center justify-between border-t border-white/5 pt-2 text-xs">
					<span className="flex items-center gap-1 text-white/60">
						<Info className="h-3 w-3 text-white/40" />
						Minimum Received:
					</span>
					<span
						className="font-mono font-semibold text-emerald-400"
						data-testid="slippage-min-received"
					>
						{typeof derivedMinReceived === 'number'
							? formatNumber(derivedMinReceived)
							: derivedMinReceived}
					</span>
				</div>
			)}
		</div>
	);
};

export default SlippageSettings;
