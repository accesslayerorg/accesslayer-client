import { cn } from '@/lib/utils';

interface CreatorListGroupSeparatorProps {
	label: string;
	className?: string;
}

/**
 * Visual separator with label between creator list groups (e.g., pinned vs unpinned).
 * Spans the full grid width and includes an accessible label.
 */
const CreatorListGroupSeparator: React.FC<CreatorListGroupSeparatorProps> = ({
	label,
	className,
}) => {
	return (
		<div
			role="separator"
			aria-label={label}
			className={cn(
				'col-span-full flex items-center gap-3 py-3',
				className
			)}
		>
			<div
				className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"
				aria-hidden="true"
			/>
			<span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/55 md:text-xs">
				{label}
			</span>
			<div
				className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"
				aria-hidden="true"
			/>
		</div>
	);
};

export default CreatorListGroupSeparator;
