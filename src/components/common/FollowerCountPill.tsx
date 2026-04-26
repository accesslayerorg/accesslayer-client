import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FollowerCountPillProps {
	count?: number | null;
	className?: string;
}

function formatCount(count: number): string {
	if (count >= 1_000_000) {
		return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
	}
	if (count >= 1_000) {
		return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
	}
	return count.toString();
}

const FollowerCountPill: React.FC<FollowerCountPillProps> = ({
	count,
	className,
}) => {
	if (count == null || count < 0) {
		return null;
	}

	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-medium text-white/70',
				className
			)}
		>
			<Users className="size-3 text-amber-500/70" />
			{formatCount(count)}
		</span>
	);
};

export default FollowerCountPill;
