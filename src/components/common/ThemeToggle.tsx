import { Check, Monitor, Moon, Sun } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme, type Theme } from '@/providers/themeContext';

const THEME_OPTIONS: ReadonlyArray<{
	value: Theme;
	label: string;
	icon: typeof Sun;
}> = [
	{ value: 'light', label: 'Light', icon: Sun },
	{ value: 'dark', label: 'Dark', icon: Moon },
	{ value: 'system', label: 'System', icon: Monitor },
];

interface ThemeToggleProps {
	className?: string;
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
	const { theme, resolvedTheme, setTheme } = useTheme();

	const selectedLabel =
		THEME_OPTIONS.find(option => option.value === theme)?.label ?? 'System';
	const TriggerIcon = theme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label={`Theme: ${selectedLabel}. Change colour theme.`}
					className={`rounded-md p-1.5 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none ${className}`}
				>
					<TriggerIcon className="size-4" aria-hidden="true" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-40 border-border bg-popover p-1 text-popover-foreground shadow-xl backdrop-blur-md"
			>
				<DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
					Theme
				</DropdownMenuLabel>
				<DropdownMenuRadioGroup
					value={theme}
					onValueChange={value => setTheme(value as Theme)}
				>
					{THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
						<DropdownMenuRadioItem
							key={value}
							value={value}
							aria-label={`${label} theme`}
							className="cursor-pointer rounded-lg px-2 py-2 pl-8 focus:bg-accent focus:text-accent-foreground"
						>
							<Icon className="size-4" aria-hidden="true" />
							<span className="flex-1">{label}</span>
							{theme === value && (
								<Check className="size-4 text-amber-500" aria-hidden="true" />
							)}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
