import React, { useState, useEffect, useId, useMemo } from 'react';
import { Check, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { useTheme } from '@/providers/themeContext';
import {
	PRESET_ACCENTS,
	DEFAULT_ACCENT,
	validateAccentColor,
	generatePalette,
	normalizeHex,
	persistCreatorAccent,
	readStoredCreatorAccent,
	type AccentPalette,
} from '@/utils/accentPalette.utils';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AccentPickerProps {
	/** Optional key ID when used as a creator brand accent setting (#1488) */
	creatorId?: string;
	/** Optional callback when accent changes */
	onAccentChange?: (hex: string) => void;
	/** Title/heading */
	title?: string;
	/** Subtitle/description */
	description?: string;
	className?: string;
}

export default function AccentPicker({
	creatorId,
	onAccentChange,
	title = creatorId ? 'Creator Brand Accent' : 'Accent Color',
	description = creatorId
		? "Customize the brand accent color for your key's page and cards. WCAG 4.5:1 contrast is automatically enforced."
		: 'Choose an accent color for buttons, links, highlights and focus rings across the app.',
	className,
}: AccentPickerProps) {
	const {
		accentColor: globalAccent,
		setAccentColor: setGlobalAccent,
		accentPalette: globalPalette,
		resolvedTheme,
	} = useTheme();

	// If in creatorId mode, we load and persist specifically for that creator key
	const isCreatorMode = Boolean(creatorId);

	const [activeColor, setActiveColor] = useState<string>(() => {
		if (isCreatorMode && creatorId) {
			return readStoredCreatorAccent(creatorId) ?? globalAccent;
		}
		return globalAccent;
	});

	const [customInput, setCustomInput] = useState<string>(activeColor);
	const [validationError, setValidationError] = useState<string | null>(null);
	const [suggestion, setSuggestion] = useState<string | null>(null);

	// Sync local state when external global accent updates in user mode
	useEffect(() => {
		if (!isCreatorMode) {
			setActiveColor(globalAccent);
			setCustomInput(globalAccent);
		}
	}, [globalAccent, isCreatorMode]);

	// Compute active palette for preview
	const activePalette: AccentPalette = useMemo(() => {
		try {
			return generatePalette(activeColor);
		} catch {
			return globalPalette;
		}
	}, [activeColor, globalPalette]);

	const inputId = useId();

	const handleApplyColor = (colorToApply: string) => {
		const validation = validateAccentColor(colorToApply);
		if (!validation.isValid) {
			setValidationError(validation.error || 'Color cannot produce a compliant palette');
			setSuggestion(validation.suggestion || DEFAULT_ACCENT);
			return;
		}

		const normalized = normalizeHex(colorToApply)!;
		setValidationError(null);
		setSuggestion(null);
		setActiveColor(normalized);
		setCustomInput(normalized);

		if (isCreatorMode && creatorId) {
			persistCreatorAccent(creatorId, normalized);
		} else {
			setGlobalAccent(normalized);
		}

		onAccentChange?.(normalized);
	};

	const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		setCustomInput(val);

		if (/^#?[0-9a-fA-F]{6}$/.test(val)) {
			const validation = validateAccentColor(val);
			if (validation.isValid) {
				handleApplyColor(val);
			} else {
				setValidationError(validation.error || 'Invalid contrast');
				setSuggestion(validation.suggestion || DEFAULT_ACCENT);
			}
		}
	};

	const handleReset = () => {
		if (isCreatorMode && creatorId) {
			persistCreatorAccent(creatorId, null);
			handleApplyColor(globalAccent);
		} else {
			handleApplyColor(DEFAULT_ACCENT);
		}
	};

	const activeShades = resolvedTheme === 'dark' ? activePalette.dark : activePalette.light;

	return (
		<div
			className={cn('space-y-4 rounded-xl border border-border p-4 bg-card', className)}
			data-testid="accent-picker"
		>
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-sm font-semibold text-foreground">{title}</h3>
					<p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="xs"
					onClick={handleReset}
					className="text-xs text-muted-foreground hover:text-foreground"
					data-testid="reset-accent-btn"
				>
					<RefreshCw className="mr-1 size-3" />
					Reset
				</Button>
			</div>

			{/* Preset Swatches */}
			<div>
				<span className="mb-2 block text-xs font-medium text-muted-foreground">
					Preset Swatches
				</span>
				<div
					className="grid grid-cols-4 sm:grid-cols-8 gap-2.5"
					role="radiogroup"
					aria-label="Preset accent color swatches"
					data-testid="preset-swatches"
				>
					{PRESET_ACCENTS.map(preset => {
						const isSelected = activeColor.toLowerCase() === preset.hex.toLowerCase();
						return (
							<button
								key={preset.id}
								type="button"
								role="radio"
								aria-checked={isSelected}
								aria-label={`${preset.name} (${preset.hex})`}
								data-testid={`swatch-${preset.id}`}
								onClick={() => handleApplyColor(preset.hex)}
								className={cn(
									'group relative flex h-10 w-full items-center justify-center rounded-lg border-2 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
									isSelected
										? 'border-foreground shadow-md scale-105'
										: 'border-transparent hover:border-border'
								)}
								style={{ backgroundColor: preset.hex }}
							>
								{isSelected && (
									<Check
										className={cn(
											'size-4 drop-shadow-md stroke-[3]',
											activePalette.light.foreground === '#ffffff'
												? 'text-white'
												: 'text-slate-950'
										)}
										aria-hidden="true"
									/>
								)}
							</button>
						);
					})}
				</div>
			</div>

			{/* Custom Hex & Color Picker */}
			<div className="space-y-2 pt-2 border-t border-border/60">
				<label
					htmlFor={inputId}
					className="block text-xs font-medium text-muted-foreground"
				>
					Custom Hex Color
				</label>
				<div className="flex items-center gap-2">
					<div className="relative flex items-center">
						<input
							type="color"
							value={normalizeHex(customInput) ?? '#4f46e5'}
							onChange={e => handleApplyColor(e.target.value)}
							aria-label="Choose color visually"
							className="size-9 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
							data-testid="native-color-picker"
						/>
					</div>
					<input
						id={inputId}
						type="text"
						value={customInput}
						onChange={handleCustomInputChange}
						placeholder="#4f46e5"
						maxLength={7}
						aria-invalid={Boolean(validationError)}
						aria-describedby={validationError ? `${inputId}-error` : undefined}
						className="flex h-9 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring uppercase font-mono"
						data-testid="custom-hex-input"
					/>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => handleApplyColor(customInput)}
						data-testid="apply-custom-accent-btn"
					>
						Apply
					</Button>
				</div>

				{/* Validation Warning & Suggestion */}
				{validationError && (
					<div
						id={`${inputId}-error`}
						role="alert"
						className="mt-2 flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
						data-testid="accent-validation-error"
					>
						<div className="flex items-start gap-1.5">
							<AlertCircle className="size-4 shrink-0 mt-0.5" />
							<span>{validationError}</span>
						</div>
						{suggestion && (
							<div className="flex items-center justify-between gap-2 pt-1 border-t border-destructive/20">
								<span className="text-foreground">Suggested nearest compliant color:</span>
								<button
									type="button"
									onClick={() => handleApplyColor(suggestion)}
									className="inline-flex items-center gap-1.5 rounded bg-background px-2 py-1 text-xs font-semibold text-foreground border border-border hover:bg-accent hover:text-accent-foreground shadow-xs transition-colors"
									data-testid="apply-suggestion-btn"
								>
									<span
										className="inline-block size-3 rounded-full border border-black/20"
										style={{ backgroundColor: suggestion }}
									/>
									{suggestion.toUpperCase()}
								</button>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Contrast Compliance Badges & Preview */}
			<div className="space-y-3 pt-3 border-t border-border/60">
				<div className="flex flex-wrap items-center justify-between gap-2 text-xs">
					<span className="font-medium text-muted-foreground">WCAG 2.1 AA Compliance:</span>
					<div className="flex items-center gap-2">
						<span
							className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
							data-testid="contrast-badge-light"
						>
							<Sparkles className="size-3" />
							Light: {activePalette.light.contrastRatio}:1
						</span>
						<span
							className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
							data-testid="contrast-badge-dark"
						>
							<Sparkles className="size-3" />
							Dark: {activePalette.dark.contrastRatio}:1
						</span>
					</div>
				</div>

				{/* Live Preview Sample Box */}
				<div
					className="rounded-lg border border-border p-3.5 space-y-3 bg-muted/40 transition-colors"
					data-testid="accent-preview-box"
				>
					<span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
						Live Elements Preview
					</span>
					<div className="flex flex-wrap items-center gap-3">
						<button
							type="button"
							className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold shadow-xs transition-opacity hover:opacity-90"
							style={{
								backgroundColor: activeShades.accent,
								color: activeShades.foreground,
							}}
							data-testid="preview-accent-btn"
						>
							Primary Button
						</button>
						<button
							type="button"
							className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors"
							style={{
								borderColor: activeShades.border,
								color: activeShades.text,
								backgroundColor: activeShades.muted,
							}}
							data-testid="preview-outline-btn"
						>
							Subtle Accent
						</button>
						<a
							href="#preview"
							onClick={e => e.preventDefault()}
							className="text-xs font-medium underline underline-offset-4 hover:opacity-80 transition-opacity"
							style={{ color: activeShades.text }}
							data-testid="preview-accent-link"
						>
							Accent Link
						</a>
						<span
							className="rounded px-1.5 py-0.5 text-xs font-medium"
							style={{
								backgroundColor: activeShades.accent,
								color: activeShades.foreground,
							}}
							data-testid="preview-accent-highlight"
						>
							Highlight
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
