import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
	SLIPPAGE_TOLERANCE_PRESETS,
	SLIPPAGE_TOLERANCE_BOUNDS,
	validateSlippageTolerancePercent,
} from '@/utils/slippageTolerance.utils';

export interface SlippageToleranceSelectorProps {
	/** Currently selected tolerance, as a percentage (e.g. 1 = 1%). */
	value: number;
	onChange: (percent: number) => void;
	disabled?: boolean;
	className?: string;
}

/**
 * Preset + custom slippage tolerance picker used by the buy/sell trade
 * dialogs (#872). Presets are 0.5% / 1% / 5%; a custom input accepts any
 * value in [0, 50]. Selecting a preset clears any custom-input error state.
 */
const SlippageToleranceSelector: React.FC<SlippageToleranceSelectorProps> = ({
	value,
	onChange,
	disabled = false,
	className,
}) => {
	const isPresetSelected = (
		SLIPPAGE_TOLERANCE_PRESETS as readonly number[]
	).includes(value);
	const [customText, setCustomText] = useState(
		isPresetSelected ? '' : String(value)
	);
	const [customActive, setCustomActive] = useState(!isPresetSelected);

	const customError = useMemo(() => {
		if (!customActive) return null;
		const normalized = customText.trim();
		if (!normalized) return null;
		return validateSlippageTolerancePercent(Number(normalized));
	}, [customActive, customText]);

	const handlePresetClick = (preset: number) => {
		setCustomActive(false);
		setCustomText('');
		onChange(preset);
	};

	const handleCustomChange = (text: string) => {
		setCustomActive(true);
		setCustomText(text);

		const normalized = text.trim();
		if (!normalized) return;

		const parsed = Number(normalized);
		if (validateSlippageTolerancePercent(parsed) === null) {
			onChange(parsed);
		}
	};

	return (
		<div
			className={cn('space-y-2', className)}
			data-testid="slippage-tolerance-selector"
		>
			<div className="flex items-center justify-between">
				<span className="text-sm text-white/70">Slippage tolerance</span>
				<span
					className="font-mono text-xs font-semibold text-amber-300/90 tabular-nums"
					data-testid="slippage-tolerance-current-value"
				>
					{value}%
				</span>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				{SLIPPAGE_TOLERANCE_PRESETS.map(preset => {
					const selected = !customActive && value === preset;
					return (
						<button
							key={preset}
							type="button"
							disabled={disabled}
							onClick={() => handlePresetClick(preset)}
							aria-pressed={selected}
							data-testid={`slippage-preset-${preset}`}
							className={cn(
								'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
								selected
									? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
									: 'border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:text-white/80',
								disabled && 'cursor-not-allowed opacity-50'
							)}
						>
							{preset}%
						</button>
					);
				})}
				<div className="flex items-center gap-1">
					<input
						inputMode="decimal"
						placeholder="Custom"
						value={customText}
						disabled={disabled}
						onChange={event => handleCustomChange(event.target.value)}
						onFocus={() => setCustomActive(true)}
						aria-label="Custom slippage tolerance percentage"
						aria-invalid={customError != null || undefined}
						data-testid="slippage-custom-input"
						className={cn(
							'w-20 rounded-lg border bg-white/[0.04] px-2 py-1.5 text-xs text-white outline-none transition-colors',
							customActive
								? 'border-amber-500/60 ring-2 ring-amber-500/15'
								: 'border-white/10',
							customError ? 'border-red-500/60' : ''
						)}
					/>
					<span className="text-xs text-white/45">%</span>
				</div>
			</div>
			{customError && (
				<p
					role="alert"
					className="text-xs text-red-300"
					data-testid="slippage-custom-error"
				>
					{customError}
				</p>
			)}
			<p className="text-[0.65rem] text-white/40">
				Between {SLIPPAGE_TOLERANCE_BOUNDS.MIN_PERCENT}% and{' '}
				{SLIPPAGE_TOLERANCE_BOUNDS.MAX_PERCENT}%. The trade will revert if the
				price moves beyond your tolerance before it executes.
			</p>
		</div>
	);
};

export default SlippageToleranceSelector;
