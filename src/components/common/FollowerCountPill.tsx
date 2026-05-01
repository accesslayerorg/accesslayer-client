import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFollowerCount } from '@/utils/numberFormat.utils';

interface FollowerCountPillProps {
	count?: number | null;
	className?: string;
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
			title={count.toString()} // Preserve full value availability
		>
			<Users className="size-3 text-amber-500/70" />
			{formatFollowerCount(count)}
		</span>
	);
};

export default FollowerCountPill;
