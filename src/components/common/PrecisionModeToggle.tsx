import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';

export type PrecisionMode = 'compact' | 'full';

interface PrecisionModeToggleProps {
	mode: PrecisionMode;
	onChange: (mode: PrecisionMode) => void;
	className?: string;
}

const PRECISION_TOOLTIP =
	'Compact shows abbreviated values (e.g. 1.2K). Full shows exact numbers.';

/**
 * Toggle between compact and full precision display for creator metrics.
 * Includes an accessible tooltip explaining the difference between modes.
 */
const PrecisionModeToggle: React.FC<PrecisionModeToggleProps> = ({
	mode,
	onChange,
	className,
}) => {
	return (
		<Tooltip content={PRECISION_TOOLTIP}>
			<div
				role="group"
				aria-label="Metrics display precision"
				className={cn(
					'inline-flex items-center rounded-lg border border-white/10 bg-white/[0.05] p-0.5',
					className
				)}
			>
				<button
					type="button"
					role="radio"
					aria-checked={mode === 'compact'}
					onClick={() => onChange('compact')}
					className={cn(
						'rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] transition-colors',
						mode === 'compact'
							? 'bg-amber-400/20 text-amber-300'
							: 'text-white/45 hover:text-white/70'
					)}
				>
					Compact
				</button>
				<button
					type="button"
					role="radio"
					aria-checked={mode === 'full'}
					onClick={() => onChange('full')}
					className={cn(
						'rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] transition-colors',
						mode === 'full'
							? 'bg-amber-400/20 text-amber-300'
							: 'text-white/45 hover:text-white/70'
					)}
				>
					Full
				</button>
			</div>
		</Tooltip>
	);
};

export default PrecisionModeToggle;
