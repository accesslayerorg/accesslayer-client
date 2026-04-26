import { useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';
import { ScanSearch } from 'lucide-react';

interface CreatorProfileStatItemProps {
	label: string;
	value: ReactNode;
	/** Full-precision string to display when precision mode is active. */
	fullPrecisionValue?: string;
	className?: string;
}

const CreatorProfileStatItem: React.FC<CreatorProfileStatItemProps> = ({
	label,
	value,
	fullPrecisionValue,
	className,
}) => {
	const [precisionMode, setPrecisionMode] = useState(false);

	return (
		<div
			className={cn(
				'group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 backdrop-blur-md transition-all duration-300 hover:border-amber-500/30 hover:bg-white/[0.06] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]',
				className
			)}
		>
			<div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
			<div className="relative z-10 flex items-center justify-between">
				<p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40 transition-colors duration-300 group-hover:text-amber-200/50">
					{label}
				</p>
				{fullPrecisionValue !== undefined && (
					<Tooltip
						content={
							precisionMode
								? 'Switch to compact view'
								: 'Show full precision value'
						}
					>
						<button
							type="button"
							onClick={() => setPrecisionMode((p) => !p)}
							aria-pressed={precisionMode}
							aria-label={
								precisionMode
									? `${label}: showing full precision. Click to compact.`
									: `${label}: showing compact value. Click for full precision.`
							}
							className={cn(
								'rounded p-0.5 transition-colors duration-150',
								precisionMode
									? 'text-amber-400 hover:text-amber-300'
									: 'text-white/25 hover:text-white/60'
							)}
						>
							<ScanSearch className="size-3" />
						</button>
					</Tooltip>
				)}
			</div>
			<div className="relative z-10 mt-2.5 font-jakarta text-base font-bold text-white md:text-[1.05rem]">
				{precisionMode && fullPrecisionValue !== undefined
					? fullPrecisionValue
					: value}
			</div>
		</div>
	);
};

export default CreatorProfileStatItem;
