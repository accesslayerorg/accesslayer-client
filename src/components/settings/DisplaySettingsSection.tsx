import { Palette, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type Theme } from '@/providers/themeContext';
import AccentPicker from '@/components/settings/AccentPicker';
import { cn } from '@/lib/utils';

export interface DisplaySettingsSectionProps {
	className?: string;
}

const THEME_OPTIONS: ReadonlyArray<{
	value: Theme;
	label: string;
	icon: typeof Sun;
}> = [
	{ value: 'light', label: 'Light', icon: Sun },
	{ value: 'dark', label: 'Dark', icon: Moon },
	{ value: 'system', label: 'System', icon: Monitor },
];

/**
 * Display settings section (#1488).
 * Hosts Theme selection alongside Accent color customization with automatic
 * WCAG 4.5:1 contrast enforcement.
 */
export default function DisplaySettingsSection({
	className,
}: DisplaySettingsSectionProps) {
	const { theme, setTheme } = useTheme();

	return (
		<section
			className={cn('rounded-xl border border-border p-6 space-y-6', className)}
			aria-labelledby="display-settings-heading"
			data-testid="display-settings"
		>
			<div className="flex items-center gap-3">
				<Palette className="size-5 text-foreground" aria-hidden="true" />
				<div>
					<h2
						id="display-settings-heading"
						className="text-base font-semibold text-foreground"
					>
						Display & Theme Preferences
					</h2>
					<p className="mt-0.5 text-xs text-muted-foreground">
						Personalize your visual experience with custom contrast-safe accent colors and color schemes.
					</p>
				</div>
			</div>

			{/* Theme Mode Selector */}
			<div className="space-y-2">
				<label className="block text-xs font-medium text-muted-foreground">
					Interface Theme
				</label>
				<div
					className="grid grid-cols-3 gap-2"
					role="radiogroup"
					aria-label="Interface theme"
				>
					{THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
						const isSelected = theme === value;
						return (
							<button
								key={value}
								type="button"
								role="radio"
								aria-checked={isSelected}
								onClick={() => setTheme(value)}
								className={cn(
									'flex items-center justify-center gap-2 rounded-lg border py-2.5 px-3 text-xs font-medium transition-all',
									isSelected
										? 'border-foreground bg-accent text-accent-foreground shadow-xs'
										: 'border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
								)}
								data-testid={`theme-option-${value}`}
							>
								<Icon className="size-4" aria-hidden="true" />
								<span>{label}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Accent Picker */}
			<AccentPicker />
		</section>
	);
}
