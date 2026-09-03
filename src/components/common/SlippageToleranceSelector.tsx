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
	computeSlippagePriceBounds,
	validateSlippageTolerance,
	SLIPPAGE_TOLERANCE_PRESETS,
	type TradeSide,
} from '@/utils/slippageTolerance.utils';

export interface SlippageToleranceSelectorProps {
	/** The quoted/preview price the tolerance is applied against. */
	previewPrice: number;
	/** Whether this trade is a buy (computes max_price) or sell (min_price). */
	side: TradeSide;
	/** Called whenever the selected tolerance changes with a valid value. */
	onToleranceChange?: (tolerancePercent: number) => void;
	/**
	 * Called with the confirm-eligibility state whenever it changes, so a
	 * parent trade dialog can disable its own confirm button in lockstep.
	 */
	onValidityChange?: (canConfirm: boolean) => void;
	/** Called when the confirm button is clicked while the tolerance is valid. */
	onConfirm?: (bounds: {
		maxPrice: number | null;
		minPrice: number | null;
	}) => void;
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
 * Slippage tolerance selector — issue #877 / #784 trade flow.
 *
 * Lets the user pick a preset tolerance (0.5% / 1% / 5%) or enter a custom
 * percentage, and displays the resulting max_price (buy) / min_price (sell)
 * bound. A custom tolerance above 50% is rejected with a validation error
 * and disables the confirm action.
 */
const SlippageToleranceSelector: React.FC<SlippageToleranceSelectorProps> = ({
	previewPrice,
	side,
	onToleranceChange,
	onValidityChange,
	onConfirm,
	className,
}) => {
	const [selectedPreset, setSelectedPreset] = useState<number | null>(
		SLIPPAGE_TOLERANCE_PRESETS[0]
	);
	const [customValue, setCustomValue] = useState('');
	const [isCustom, setIsCustom] = useState(false);

	const activeToleranceText = isCustom
		? customValue
		: String(selectedPreset ?? '');
	const parsedTolerance = activeToleranceText.trim()
		? Number(activeToleranceText)
		: NaN;

	const validation = useMemo(
		() => validateSlippageTolerance(parsedTolerance),
		[parsedTolerance]
	);

	const bounds = useMemo(() => {
		if (!validation.valid) return { maxPrice: null, minPrice: null };
		return computeSlippagePriceBounds(previewPrice, parsedTolerance, side);
	}, [validation.valid, previewPrice, parsedTolerance, side]);

	const canConfirm = validation.valid;

	const selectPreset = (preset: number) => {
		setIsCustom(false);
		setSelectedPreset(preset);
		onToleranceChange?.(preset);
		onValidityChange?.(true);
	};

	const handleCustomChange = (rawValue: string) => {
		setIsCustom(true);
		setSelectedPreset(null);
		setCustomValue(rawValue);

		const parsed = rawValue.trim() ? Number(rawValue) : NaN;
		const result = validateSlippageTolerance(parsed);
		onValidityChange?.(result.valid);
		if (result.valid) {
			onToleranceChange?.(parsed);
		}
	};

	return (
		<div className={cn('space-y-2', className)} data-testid="slippage-tolerance-selector">
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
		<div className={cn('space-y-2', className)}>
			<div className="text-sm text-white/70">Slippage tolerance</div>
			<div className="flex flex-wrap items-center gap-2">
				{SLIPPAGE_TOLERANCE_PRESETS.map(preset => (
					<button
						key={preset}
						type="button"
						onClick={() => selectPreset(preset)}
						aria-pressed={!isCustom && selectedPreset === preset}
						data-testid={`slippage-preset-${preset}`}
						className={cn(
							'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
							!isCustom && selectedPreset === preset
								? 'bg-amber-500/20 text-amber-300'
								: 'bg-white/5 text-white/60 hover:bg-white/10'
						)}
					>
						{preset}%
					</button>
				))}
				<input
					type="text"
					inputMode="decimal"
					placeholder="Custom %"
					value={customValue}
					onChange={event => handleCustomChange(event.target.value)}
					onFocus={() => setIsCustom(true)}
					aria-label="Custom slippage tolerance"
					data-testid="slippage-custom-input"
					className={cn(
						'w-24 rounded-md border bg-white/[0.04] px-2 py-1 text-xs text-white outline-none transition-colors',
						'border-white/10 focus:border-amber-500/50',
						isCustom && !validation.valid ? 'border-red-500/60' : ''
					)}
				/>
			</div>

			{isCustom && !validation.valid && (
				<p
					role="alert"
					data-testid="slippage-validation-error"
					className="text-xs text-red-300"
				>
					{validation.error}
				</p>
			)}

			{validation.valid && (
				<p className="text-xs text-white/45" data-testid="slippage-price-bound">
					{side === 'buy'
						? `Max price: ${bounds.maxPrice} XLM`
						: `Min price: ${bounds.minPrice} XLM`}
				</p>
			)}

			<button
				type="button"
				onClick={() => onConfirm?.(bounds)}
				disabled={!canConfirm}
				data-testid="slippage-confirm-button"
				className="rounded-md bg-amber-500/90 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
			>
				Confirm
			</button>
		</div>
	);
};

export default SlippageToleranceSelector;
