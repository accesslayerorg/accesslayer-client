import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
	verified?: boolean;
	reserveSpace?: boolean;
	className?: string;
}

const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
	verified = false,
	reserveSpace = false,
	className,
}) => {
	if (!verified && !reserveSpace) {
		return null;
	}

	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 rounded-full border border-emerald-300/35 bg-emerald-400/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200',
				!verified && 'invisible',
				className
			)}
		>
			<BadgeCheck className="size-3" />
			Verified
		</span>
	);
};

export default VerifiedBadge;
