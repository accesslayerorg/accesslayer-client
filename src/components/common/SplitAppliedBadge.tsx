import React from 'react';
import { Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SplitAppliedBadgeProps {
	className?: string;
	title?: string;
}

/**
 * Split Applied badge rendered on portfolio pages for keys that split in the last 48h (#1151).
 */
export const SplitAppliedBadge: React.FC<SplitAppliedBadgeProps> = ({
	className,
	title = 'Key split applied within the last 48 hours',
}) => {
	return (
		<span
			role="status"
			data-testid="split-applied-badge"
			title={title}
			className={cn(
				'inline-flex items-center gap-1 rounded-full border border-purple-500/40 bg-purple-500/15 px-2.5 py-0.5 text-xs font-semibold text-purple-300 shadow-sm shadow-purple-950/20 backdrop-blur-xs',
				className
			)}
		>
			<Scissors className="size-3" aria-hidden="true" />
			<span>Split Applied</span>
		</span>
	);
};

export default SplitAppliedBadge;
