import { Monitor, Moon, Settings, Sun, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import type { ThemePreference } from '@/lib/theme';

const THEME_OPTIONS: {
	value: ThemePreference;
	label: string;
	description: string;
	icon: LucideIcon;
}[] = [
	{
		value: 'light',
		label: 'Light',
		description: 'Always use the light theme.',
		icon: Sun,
	},
	{
		value: 'dark',
		label: 'Dark',
		description: 'Always use the dark theme.',
		icon: Moon,
	},
	{
		value: 'system',
		label: 'System',
		description: "Match your device's appearance setting.",
		icon: Monitor,
	},
];

export default function SettingsPage() {
	useNavigationTiming('settings');
	const { preference, setPreference } = useTheme();

	return (
		<main className="mx-auto max-w-2xl px-6 py-16">
			<div className="mb-8 flex items-center gap-3">
				<Settings className="size-6 text-foreground" aria-hidden="true" />
				<h1 className="font-jakarta text-2xl font-semibold">Settings</h1>
			</div>

			<section aria-labelledby="settings-appearance-heading">
				<h2
					id="settings-appearance-heading"
					className="font-jakarta text-lg font-semibold"
				>
					Appearance
				</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Choose how Access Layer looks on this device. Your choice syncs
					across open tabs.
				</p>

				<fieldset className="mt-4 grid gap-3 sm:grid-cols-3">
					<legend className="sr-only">Theme</legend>
					{THEME_OPTIONS.map(option => {
						const Icon = option.icon;
						const selected = preference === option.value;
						return (
							<label
								key={option.value}
								className={cn(
									'flex cursor-pointer flex-col items-start gap-2 rounded-xl border p-4 transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
									selected
										? 'border-primary bg-accent'
										: 'border-border hover:bg-accent/50'
								)}
							>
								<input
									type="radio"
									name="theme"
									value={option.value}
									checked={selected}
									onChange={() => setPreference(option.value)}
									className="sr-only"
								/>
								<Icon
									className="size-5 text-foreground"
									aria-hidden="true"
								/>
								<span className="text-sm font-medium text-foreground">
									{option.label}
								</span>
								<span className="text-xs text-muted-foreground">
									{option.description}
								</span>
							</label>
						);
					})}
				</fieldset>
			</section>
		</main>
	);
}
