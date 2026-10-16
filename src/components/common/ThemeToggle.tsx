import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

interface ThemeToggleProps {
	className?: string;
}

/** Nav bar light/dark switch. Stores the choice as a manual override. */
export default function ThemeToggle({ className }: ThemeToggleProps) {
	const { isDark, toggleTheme } = useTheme();
	const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

	return (
		<button
			type="button"
			onClick={toggleTheme}
			aria-label={label}
			title={label}
			className={cn(
				'inline-flex size-9 items-center justify-center rounded-full text-white/70 transition-colors outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50',
				className
			)}
		>
			{isDark ? (
				<Sun className="size-4" aria-hidden="true" />
			) : (
				<Moon className="size-4" aria-hidden="true" />
			)}
		</button>
	);
}
